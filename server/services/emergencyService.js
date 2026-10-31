import EmergencyProfile from '../models/EmergencyProfile.js';
import AccessRequest from '../models/AccessRequest.js';
import TrustedContact from '../models/TrustedContact.js';
import User from '../models/User.js';
import Document from '../models/Document.js';
import { recordAuditEvent } from './auditService.js';
import { generateSecureToken, hashToken } from '../utils/cryptoEngine.js';

/**
 * Get or initialize emergency health & disaster profile for a user
 */
export async function getOrCreateEmergencyProfile(userId) {
  let profile = await EmergencyProfile.findOne({ userId })
    .populate('designatedContactIds')
    .populate('emergencyDocumentIds', 'title originalFilename mimeType category sizeBytes createdAt');

  if (!profile) {
    profile = await EmergencyProfile.create({ userId });
    profile = await EmergencyProfile.findById(profile._id);
  }
  return profile;
}

/**
 * Update emergency profile details
 */
export async function updateEmergencyProfile({
  userId,
  data,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  let profile = await EmergencyProfile.findOne({ userId });
  if (!profile) {
    profile = new EmergencyProfile({ userId });
  }

  const allowedFields = [
    'bloodType',
    'allergies',
    'chronicConditions',
    'medications',
    'primaryPhysician',
    'insurancePolicy',
    'emergencyInstructions',
    'designatedContactIds',
    'emergencyDocumentIds',
    'autoGrantAfterHours',
    'isProfileEnabled',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      profile[field] = data[field];
    }
  }

  await profile.save();

  await recordAuditEvent({
    userId,
    actionType: 'EMERGENCY_PROFILE_UPDATE',
    entityType: 'EMERGENCY_PROFILE',
    entityId: profile._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
  });

  return getOrCreateEmergencyProfile(userId);
}

/**
 * Initiate an emergency access request by an authorized trusted contact or external party
 */
export async function requestEmergencyAccess({
  targetUserId,
  requesterEmail,
  requesterName,
  justification,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    const err = new Error('Vault owner not found');
    err.statusCode = 404;
    throw err;
  }

  const profile = await EmergencyProfile.findOne({ userId: targetUserId, isProfileEnabled: true });
  if (!profile) {
    const err = new Error('Emergency profile is disabled or not configured by the vault owner.');
    err.statusCode = 403;
    throw err;
  }

  // Check if requester is registered as a trusted contact
  const cleanEmail = requesterEmail.toLowerCase().trim();
  const contact = await TrustedContact.findOne({
    userId: targetUserId,
    contactEmail: cleanEmail,
    status: 'ACTIVE',
  });

  // Calculate review decision expiration window (default 48 hours)
  const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);
  const rawToken = generateSecureToken(32);
  const requestTokenHash = hashToken(rawToken);

  const accessRequest = await AccessRequest.create({
    targetUserId,
    requesterEmail: cleanEmail,
    requesterName: requesterName.trim(),
    trustedContactId: contact ? contact._id : null,
    requestType: 'EMERGENCY',
    justification: justification.trim(),
    status: 'PENDING',
    requestTokenHash,
    expiresAt,
    designatedCategories: contact && contact.permissions ? contact.permissions.allowedCategories : ['EMERGENCY', 'MEDICAL'],
  });

  await recordAuditEvent({
    userId: targetUserId,
    actionType: 'EMERGENCY_ACCESS_REQUESTED',
    entityType: 'ACCESS_REQUEST',
    entityId: accessRequest._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: {
      requesterEmail: cleanEmail,
      isTrustedContact: !!contact,
      requestTokenHash,
    },
  });

  return {
    requestId: accessRequest._id,
    status: accessRequest.status,
    requesterEmail: accessRequest.requesterEmail,
    requestToken: rawToken,
    expiresAt: accessRequest.expiresAt,
  };
}

/**
 * Vault owner approves or rejects an incoming emergency access request
 */
export async function reviewAccessRequest({
  requestId,
  userId,
  approve,
  responseNote = '',
  grantHours = 24,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  const accessRequest = await AccessRequest.findOne({ _id: requestId, targetUserId: userId });
  if (!accessRequest) {
    const err = new Error('Access request not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  if (accessRequest.status !== 'PENDING') {
    const err = new Error(`Request has already been ${accessRequest.status.toLowerCase()}`);
    err.statusCode = 400;
    throw err;
  }

  accessRequest.responseNote = responseNote.trim();
  accessRequest.respondedAt = new Date();

  if (approve) {
    accessRequest.status = 'APPROVED';
    accessRequest.accessGrantedAt = new Date();
    accessRequest.accessExpiresAt = new Date(Date.now() + Number(grantHours) * 60 * 60 * 1000);
  } else {
    accessRequest.status = 'REJECTED';
  }

  await accessRequest.save();

  await recordAuditEvent({
    userId,
    actionType: approve ? 'EMERGENCY_ACCESS_APPROVED' : 'EMERGENCY_ACCESS_REJECTED',
    entityType: 'ACCESS_REQUEST',
    entityId: accessRequest._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: {
      requesterEmail: accessRequest.requesterEmail,
      grantHours: approve ? grantHours : 0,
    },
  });

  return accessRequest;
}

/**
 * Fetch approved emergency data by token or authorized requester
 */
export async function getEmergencyAccessData({
  requestId,
  requestToken = null,
  requesterEmail = null,
  userId = null,
  userEmail = null,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  if (!requestToken && !requesterEmail && !userId) {
    const err = new Error('Access credentials required: Provide an emergency access token or authenticate as the authorized contact/vault owner.');
    err.statusCode = 401;
    throw err;
  }

  const accessRequest = await AccessRequest.findById(requestId);
  if (!accessRequest) {
    const err = new Error('Access request not found');
    err.statusCode = 404;
    throw err;
  }

  // Verify access authorization
  let isAuthorized = false;

  // 1. Check if token matches
  if (requestToken) {
    const providedHash = hashToken(requestToken);
    if (providedHash === accessRequest.requestTokenHash) {
      isAuthorized = true;
    }
  }

  // 2. Check if authenticated user is the vault owner
  if (userId && accessRequest.targetUserId.toString() === userId.toString()) {
    isAuthorized = true;
  }

  // 3. Check if authenticated user is the designated requester
  const effectiveEmail = (userEmail || requesterEmail || '').toLowerCase().trim();
  if (effectiveEmail && accessRequest.requesterEmail.toLowerCase() === effectiveEmail && (userId || requestToken)) {
    isAuthorized = true;
  }

  if (!isAuthorized) {
    await recordAuditEvent({
      userId: accessRequest.targetUserId,
      actionType: 'UNAUTHORIZED_ACCESS_ATTEMPT',
      entityType: 'ACCESS_REQUEST',
      entityId: accessRequest._id.toString(),
      ipAddress,
      userAgent,
      status: 'BLOCKED',
      metadata: { attemptedEmail: requesterEmail },
    });
    const err = new Error('Unauthorized: Invalid emergency access token or credentials');
    err.statusCode = 403;
    throw err;
  }

  if (!accessRequest.isAccessActive()) {
    const err = new Error('Access request is not approved or the access window has expired');
    err.statusCode = 403;
    throw err;
  }

  // Fetch emergency profile and authorized documents
  const profile = await EmergencyProfile.findOne({ userId: accessRequest.targetUserId });
  const docs = await Document.find({
    userId: accessRequest.targetUserId,
    isDeleted: false,
    $or: [
      { _id: { $in: profile ? profile.emergencyDocumentIds : [] } },
      { category: { $in: accessRequest.designatedCategories } },
    ],
  }).select('title originalFilename mimeType sizeBytes category createdAt');

  await recordAuditEvent({
    userId: accessRequest.targetUserId,
    actionType: 'EMERGENCY_DATA_ACCESSED',
    entityType: 'ACCESS_REQUEST',
    entityId: accessRequest._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: { requesterEmail: accessRequest.requesterEmail },
  });

  return {
    accessRequest: {
      id: accessRequest._id,
      status: accessRequest.status,
      accessExpiresAt: accessRequest.accessExpiresAt,
      designatedCategories: accessRequest.designatedCategories,
    },
    emergencyProfile: profile,
    documents: docs,
  };
}

/**
 * Vault owner revokes previously granted emergency access
 */
export async function revokeEmergencyAccess({
  requestId,
  userId,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  const accessRequest = await AccessRequest.findOne({ _id: requestId, targetUserId: userId });
  if (!accessRequest) {
    const err = new Error('Access request not found or unauthorized');
    err.statusCode = 404;
    throw err;
  }

  accessRequest.status = 'REVOKED';
  await accessRequest.save();

  await recordAuditEvent({
    userId,
    actionType: 'EMERGENCY_ACCESS_REVOKED',
    entityType: 'ACCESS_REQUEST',
    entityId: accessRequest._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: { requesterEmail: accessRequest.requesterEmail },
  });

  return { success: true, message: 'Emergency access revoked successfully' };
}

/**
 * Get all access requests for a vault owner (incoming) and by requester
 */
export async function getUserAccessRequests({ userId, userEmail }) {
  const [incoming, outgoing] = await Promise.all([
    AccessRequest.find({ targetUserId: userId }).sort({ createdAt: -1 }),
    AccessRequest.find({ requesterEmail: userEmail.toLowerCase().trim() }).sort({ createdAt: -1 }),
  ]);
  return { incoming, outgoing };
}

