import mongoose from 'mongoose';

const AccessRequestSchema = new mongoose.Schema(
  {
    targetUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Target User ID is required'],
      index: true,
    },
    requesterUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    requesterEmail: {
      type: String,
      required: [true, 'Requester email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address format'],
    },
    requesterName: {
      type: String,
      required: [true, 'Requester name is required'],
      trim: true,
    },
    trustedContactId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'TrustedContact',
      default: null,
    },
    requestType: {
      type: String,
      enum: ['EMERGENCY', 'LEGAL', 'GENERAL'],
      default: 'EMERGENCY',
    },
    justification: {
      type: String,
      required: [true, 'Access justification is required'],
      maxlength: [2000, 'Justification cannot exceed 2000 characters'],
    },
    status: {
      type: String,
      enum: ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED', 'EXPIRED'],
      default: 'PENDING',
      index: true,
    },
    requestTokenHash: {
      type: String,
      default: null,
      index: true,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    accessGrantedAt: {
      type: Date,
      default: null,
    },
    accessExpiresAt: {
      type: Date,
      default: null,
    },
    responseNote: {
      type: String,
      default: '',
      maxlength: [1000, 'Response note cannot exceed 1000 characters'],
    },
    respondedAt: {
      type: Date,
      default: null,
    },
    designatedCategories: {
      type: [String],
      default: ['EMERGENCY', 'MEDICAL'],
    },
  },
  {
    timestamps: true,
  }
);

// Method to verify if approved access is currently active
AccessRequestSchema.methods.isAccessActive = function () {
  if (this.status !== 'APPROVED') return false;
  if (!this.accessExpiresAt) return false;
  return new Date() < this.accessExpiresAt;
};

const AccessRequest = mongoose.model('AccessRequest', AccessRequestSchema);
export default AccessRequest;

