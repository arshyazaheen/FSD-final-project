import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { recordAuditEvent } from '../services/auditService.js';

function generateToken(user) {
  const secret = process.env.JWT_SECRET || 'vaultverse_production_jwt_secret_key_minimum_32_characters_long_2026!';
  const expiresIn = process.env.JWT_EXPIRES_IN || '7d';
  return jwt.sign(
    {
      userId: user._id,
      email: user.email,
      role: user.role,
    },
    secret,
    { expiresIn }
  );
}

export async function register(req, res, next) {
  try {
    const { email, password, name, fullName } = req.body;
    const finalName = typeof name === 'string' ? name.trim() : typeof fullName === 'string' ? fullName.trim() : '';

    if (!email || !password || !finalName || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Name, email, and password strings are required.',
        code: 'MISSING_FIELDS',
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'Password must be at least 8 characters long.',
        code: 'WEAK_PASSWORD',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address is already registered.',
        code: 'EMAIL_IN_USE',
      });
    }

    const user = await User.create({
      name: finalName,
      email: cleanEmail,
      password,
    });

    const token = generateToken(user);

    await recordAuditEvent({
      userId: user._id,
      actionType: 'AUTH_REGISTER',
      entityType: 'USER',
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'SUCCESS',
      metadata: { email: user.email },
    });

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storageQuotaBytes: user.storageQuotaBytes,
        storageUsedBytes: user.storageUsedBytes,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function login(req, res, next) {
  try {
    const { email, password } = req.body;

    if (!email || !password || typeof email !== 'string' || typeof password !== 'string') {
      return res.status(400).json({
        success: false,
        error: 'Email and password are required and must be valid strings.',
        code: 'MISSING_FIELDS',
      });
    }

    const cleanEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      await recordAuditEvent({
        actionType: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        status: 'FAILURE',
        metadata: { attemptedEmail: cleanEmail, reason: 'USER_NOT_FOUND' },
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    if (user.isAccountLocked()) {
      await recordAuditEvent({
        userId: user._id,
        actionType: 'AUTH_LOGIN_BLOCKED',
        entityType: 'USER',
        entityId: user._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        status: 'BLOCKED',
        metadata: { reason: 'ACCOUNT_LOCKED' },
      });

      return res.status(403).json({
        success: false,
        error: 'Account temporarily locked due to repeated failed login attempts. Try again later.',
        code: 'ACCOUNT_LOCKED',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      await user.recordFailedLogin();

      await recordAuditEvent({
        userId: user._id,
        actionType: 'AUTH_LOGIN_FAILED',
        entityType: 'USER',
        entityId: user._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        status: 'FAILURE',
        metadata: { failedAttempts: user.failedLoginAttempts },
      });

      return res.status(401).json({
        success: false,
        error: 'Invalid email address or password.',
        code: 'INVALID_CREDENTIALS',
      });
    }

    await user.recordSuccessfulLogin();
    const token = generateToken(user);

    await recordAuditEvent({
      userId: user._id,
      actionType: 'AUTH_LOGIN',
      entityType: 'USER',
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'SUCCESS',
      metadata: { email: user.email },
    });

    res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        storageQuotaBytes: user.storageQuotaBytes,
        storageUsedBytes: user.storageUsedBytes,
        settings: user.settings,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function logout(req, res, next) {
  try {
    if (req.user) {
      await recordAuditEvent({
        userId: req.user._id,
        actionType: 'AUTH_LOGOUT',
        entityType: 'USER',
        entityId: req.user._id.toString(),
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || 'Unknown',
        status: 'SUCCESS',
      });
    }

    res.json({
      success: true,
      message: 'Logged out successfully',
    });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req, res, next) {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req, res, next) {
  try {
    const { name, settings } = req.body;
    const user = await User.findById(req.user._id);

    if (name) user.name = name.trim();
    if (settings) {
      user.settings = { ...user.settings, ...settings };
    }

    await user.save();

    await recordAuditEvent({
      userId: user._id,
      actionType: 'USER_PROFILE_UPDATE',
      entityType: 'USER',
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        settings: user.settings,
      },
    });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req, res, next) {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        error: 'Current and new password are required.',
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        error: 'New password must be at least 8 characters long.',
      });
    }

    const user = await User.findById(req.user._id);
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        error: 'Current password is incorrect.',
      });
    }

    user.password = newPassword;
    await user.save();

    await recordAuditEvent({
      userId: user._id,
      actionType: 'PASSWORD_CHANGE',
      entityType: 'USER',
      entityId: user._id.toString(),
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] || 'Unknown',
      status: 'SUCCESS',
    });

    res.json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    next(error);
  }
}

