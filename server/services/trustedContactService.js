import TrustedContact from '../models/TrustedContact.js';
import EmergencyProfile from '../models/EmergencyProfile.js';
import { recordAuditEvent } from './auditService.js';
import { generateSecureToken, hashToken } from '../utils/cryptoEngine.js';

export async function getTrustedContacts({ userId }) {
  return TrustedContact.find({ userId }).sort({ createdAt: -1 });
}

export async function addTrustedContact({
  userId,
  contactData,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  const { contactName, contactEmail, phone, relationship, permissions, securityNote } = contactData;

  const cleanEmail = contactEmail.toLowerCase().trim();
  const existing = await TrustedContact.findOne({ userId, contactEmail: cleanEmail });
  if (existing) {
    const err = new Error('A trusted contact with this email address already exists');
    err.statusCode = 409;
    throw err;
  }

  const rawInviteToken = generateSecureToken(32);
  const invitationTokenHash = hashToken(rawInviteToken);
  const invitationExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

  const contact = await TrustedContact.create({
    userId,
    contactName: contactName.trim(),
    contactEmail: cleanEmail,
    phone: phone ? phone.trim() : '',
    relationship: relationship || 'TRUSTED_ADVISOR',
    permissions: permissions || {
      canViewEmergencyProfile: true,
      canRequestEmergencyAccess: true,
      allowedCategories: ['EMERGENCY', 'MEDICAL', 'IDENTITY'],
      canDownloadDocuments: false,
    },
    securityNote: securityNote ? securityNote.trim() : '',
    status: 'ACTIVE',
    invitationTokenHash,
    invitationExpiresAt,
  });

  // Automatically attach to emergency profile designated contacts
  await EmergencyProfile.findOneAndUpdate(
    { userId },
    { $addToSet: { designatedContactIds: contact._id } },
    { upsert: true }
  );

  await recordAuditEvent({
    userId,
    actionType: 'TRUSTED_CONTACT_ADD',
    entityType: 'TRUSTED_CONTACT',
    entityId: contact._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: {
      contactEmail: cleanEmail,
      relationship: contact.relationship,
    },
  });

  return { contact, inviteToken: rawInviteToken };
}

export async function updateTrustedContact({
  contactId,
  userId,
  updateData,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  const contact = await TrustedContact.findOne({ _id: contactId, userId });
  if (!contact) {
    const err = new Error('Trusted contact not found');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = ['contactName', 'phone', 'relationship', 'permissions', 'securityNote', 'status'];
  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      contact[field] = updateData[field];
    }
  }

  await contact.save();

  await recordAuditEvent({
    userId,
    actionType: 'TRUSTED_CONTACT_UPDATE',
    entityType: 'TRUSTED_CONTACT',
    entityId: contact._id.toString(),
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: { contactEmail: contact.contactEmail },
  });

  return contact;
}

export async function removeTrustedContact({
  contactId,
  userId,
  ipAddress = '127.0.0.1',
  userAgent = 'Unknown',
}) {
  const contact = await TrustedContact.findOneAndDelete({ _id: contactId, userId });
  if (!contact) {
    const err = new Error('Trusted contact not found');
    err.statusCode = 404;
    throw err;
  }

  // Remove from emergency profile designated contacts
  await EmergencyProfile.findOneAndUpdate(
    { userId },
    { $pull: { designatedContactIds: contactId } }
  );

  await recordAuditEvent({
    userId,
    actionType: 'TRUSTED_CONTACT_DELETE',
    entityType: 'TRUSTED_CONTACT',
    entityId: contactId,
    ipAddress,
    userAgent,
    status: 'SUCCESS',
    metadata: { contactEmail: contact.contactEmail },
  });

  return { success: true, message: 'Trusted contact removed successfully' };
}

