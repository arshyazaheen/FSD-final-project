import mongoose from 'mongoose';

const ShareSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: [true, 'Document ID is required'],
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner User ID is required'],
      index: true,
    },
    recipientEmail: {
      type: String,
      lowercase: true,
      trim: true,
      default: null,
    },
    tokenHash: {
      type: String,
      required: [true, 'Hashed share token is required'],
      unique: true,
      index: true,
    },
    permission: {
      type: String,
      enum: ['VIEW', 'DOWNLOAD'],
      default: 'VIEW',
    },
    isPasswordProtected: {
      type: Boolean,
      default: false,
    },
    passphraseSalt: {
      type: String,
      default: null,
    },
    passphraseHash: {
      type: String,
      default: null,
    },
    encryptedItemKey: {
      type: String,
      default: null,
    },
    maxViews: {
      type: Number,
      default: 5,
      min: [1, 'Maximum views must be at least 1'],
    },
    currentViews: {
      type: Number,
      default: 0,
    },
    expiresAt: {
      type: Date,
      required: [true, 'Expiration timestamp is required'],
      index: true,
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true,
    },
    revokedAt: {
      type: Date,
      default: null,
    },
    accessLog: [
      {
        accessedAt: { type: Date, default: Date.now },
        ipHash: { type: String },
        userAgentSummary: { type: String },
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Helper method to verify if share link is still valid
ShareSchema.methods.isValid = function () {
  if (this.isRevoked) return { valid: false, reason: 'REVOKED' };
  if (this.expiresAt && new Date() > this.expiresAt) return { valid: false, reason: 'EXPIRED' };
  if (this.currentViews >= this.maxViews) return { valid: false, reason: 'VIEW_LIMIT_REACHED' };
  return { valid: true };
};

const Share = mongoose.model('Share', ShareSchema);
export default Share;

