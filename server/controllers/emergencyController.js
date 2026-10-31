import {
  getOrCreateEmergencyProfile,
  updateEmergencyProfile,
  requestEmergencyAccess,
  reviewAccessRequest,
  getEmergencyAccessData,
  revokeEmergencyAccess,
  getUserAccessRequests,
} from '../services/emergencyService.js';

export async function getProfile(req, res, next) {
  try {
    const profile = await getOrCreateEmergencyProfile(req.user._id);
    res.json({
      success: true,
      profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const profile = await updateEmergencyProfile({
      userId: req.user._id,
      data: req.body,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.json({
      success: true,
      message: 'Emergency profile updated successfully',
      profile,
    });
  } catch (error) {
    next(error);
  }
}

export async function requestAccess(req, res, next) {
  try {
    const { targetUserId, requesterEmail, requesterName, justification } = req.body;

    if (!targetUserId || !requesterEmail || !requesterName || !justification) {
      return res.status(400).json({
        success: false,
        error: 'Target user ID, requester email, name, and justification are required',
      });
    }

    const result = await requestEmergencyAccess({
      targetUserId,
      requesterEmail,
      requesterName,
      justification,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.status(201).json({
      success: true,
      message: 'Emergency access request lodged successfully. Vault owner notified.',
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function reviewRequest(req, res, next) {
  try {
    const { approve, responseNote, grantHours } = req.body;

    const accessRequest = await reviewAccessRequest({
      requestId: req.params.id,
      userId: req.user._id,
      approve: Boolean(approve),
      responseNote,
      grantHours,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.json({
      success: true,
      message: `Emergency access request ${approve ? 'approved' : 'rejected'}.`,
      accessRequest,
    });
  } catch (error) {
    next(error);
  }
}

export async function getEmergencyData(req, res, next) {
  try {
    const { id } = req.params;
    const { token, email } = req.query;

    const data = await getEmergencyAccessData({
      requestId: id,
      requestToken: token,
      requesterEmail: email || (req.user ? req.user.email : null),
      userId: req.user ? req.user._id : null,
      userEmail: req.user ? req.user.email : null,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.json({
      success: true,
      ...data,
    });
  } catch (error) {
    next(error);
  }
}

export async function revokeAccess(req, res, next) {
  try {
    const result = await revokeEmergencyAccess({
      requestId: req.params.id,
      userId: req.user._id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    next(error);
  }
}

export async function listRequests(req, res, next) {
  try {
    const requests = await getUserAccessRequests({
      userId: req.user._id,
      userEmail: req.user.email,
    });

    res.json({
      success: true,
      ...requests,
    });
  } catch (error) {
    next(error);
  }
}

