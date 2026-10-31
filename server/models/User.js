import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address format'],
      index: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters long'],
    },
    name: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    role: {
      type: String,
      enum: ['USER', 'ADMIN', 'AUDITOR'],
      default: 'USER',
    },
    authSalt: {
      type: String,
      default: '',
    },
    kdfParams: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({
        algorithm: 'PBKDF2-SHA256',
        iterations: 600000,
        derivedKeyLength: 256,
      }),
    },
    status: {
      type: String,
      enum: ['ACTIVE', 'LOCKED', 'SUSPENDED'],
      default: 'ACTIVE',
    },
    storageQuotaBytes: {
      type: Number,
      default: 5368709120, // 5 GB default
    },
    storageUsedBytes: {
      type: Number,
      default: 0,
    },
    failedLoginAttempts: {
      type: Number,
      default: 0,
    },
    lockedUntil: {
      type: Date,
      default: null,
    },
    lastLoginAt: {
      type: Date,
      default: null,
    },
    vaultKeyEnvelope: {
      type: String,
      default: null,
    },
    settings: {
      twoFactorEnabled: { type: Boolean, default: false },
      emailAlerts: { type: Boolean, default: true },
      defaultRetentionDays: { type: Number, default: 0 }, // 0 = indefinite
      autoPrivacyScan: { type: Boolean, default: true },
    },
  },
  {
    timestamps: true,
  }
);

// Pre-save hook: Hash password with bcrypt before saving if modified
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (err) {
    next(err);
  }
});

// Compare plaintext password with stored bcrypt hash
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if account is currently locked out
UserSchema.methods.isAccountLocked = function () {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
};

// Record failed login attempt and apply temporary lockout if threshold exceeded
UserSchema.methods.recordFailedLogin = async function () {
  this.failedLoginAttempts += 1;
  if (this.failedLoginAttempts >= 5) {
    // 15-minute temporary security lockout
    this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000);
  }
  return this.save();
};

// Reset failed login counter upon successful authentication
UserSchema.methods.recordSuccessfulLogin = async function () {
  this.failedLoginAttempts = 0;
  this.lockedUntil = null;
  this.lastLoginAt = new Date();
  return this.save();
};

// Transform output JSON to remove secret fields
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.password;
  delete obj.__v;
  return obj;
};

const User = mongoose.model('User', UserSchema);
export default User;

