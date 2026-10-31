import AuditLog from '../models/AuditLog.js';
import { verifyAuditChain } from '../services/auditService.js';

export async function getLogs(req, res, next) {
  try {
    const { actionType, status, page = 1, limit = 25 } = req.query;

    const query = {};
    if (req.user.role !== 'ADMIN') {
      query.$or = [{ userId: req.user._id }, { userId: null }];
    }

    if (actionType) query.actionType = actionType;
    if (status) query.status = status;

    const skip = (Math.max(1, page) - 1) * limit;
    const [logs, total] = await Promise.all([
      AuditLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      AuditLog.countDocuments(query),
    ]);

    res.json({
      success: true,
      logs,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function verifyChain(req, res, next) {
  try {
    const verification = await verifyAuditChain();
    res.json({
      success: true,
      verification,
    });
  } catch (error) {
    next(error);
  }
}

