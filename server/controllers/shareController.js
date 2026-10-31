import {
  createShareLink,
  accessSharedDocument,
  downloadSharedDocumentContent,
  revokeShareLink,
  getUserShareLinks,
} from '../services/shareService.js';

export async function create(req, res, next) {
  try {
    const { documentId, recipientEmail, permission, maxViews, expiresInHours, passphrase } = req.body;

    if (!documentId) {
      return res.status(400).json({ success: false, error: 'Document ID is required' });
    }

    const shareData = await createShareLink({
      documentId,
      userId: req.user._id,
      recipientEmail,
      permission,
      maxViews,
      expiresInHours,
      passphrase,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.status(201).json({
      success: true,
      message: 'Time-limited share link generated successfully',
      share: shareData,
    });
  } catch (error) {
    next(error);
  }
}

export async function access(req, res, next) {
  try {
    const { token } = req.params;
    const { passphrase } = req.query;

    const accessData = await accessSharedDocument({
      rawToken: token,
      passphrase,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.json({
      success: true,
      ...accessData,
    });
  } catch (error) {
    next(error);
  }
}

export async function download(req, res, next) {
  try {
    const { token } = req.params;
    const { passphrase } = req.query;

    const { buffer, originalFilename, mimeType } = await downloadSharedDocumentContent({
      rawToken: token,
      passphrase,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
    });

    res.setHeader('Content-Type', mimeType);
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(originalFilename)}"`);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  } catch (error) {
    next(error);
  }
}

export async function revoke(req, res, next) {
  try {
    const result = await revokeShareLink({
      shareId: req.params.id,
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

export async function list(req, res, next) {
  try {
    const shares = await getUserShareLinks({ userId: req.user._id });
    res.json({
      success: true,
      shares,
    });
  } catch (error) {
    next(error);
  }
}

