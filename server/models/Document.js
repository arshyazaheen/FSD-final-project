import mongoose from 'mongoose';

const DocumentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner User ID is required'],
      index: true,
    },
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
      trim: true,
    },
    storageFilename: {
      type: String,
      required: [true, 'Storage filename is required'],
      unique: true,
      index: true,
    },
    mimeType: {
      type: String,
      required: [true, 'MIME type is required'],
    },
    sizeBytes: {
      type: Number,
      required: [true, 'File size in bytes is required'],
    },
    checksumSha256: {
      type: String,
      required: [true, 'SHA-256 checksum is required'],
    },
    iv: {
      type: String,
      required: [true, 'AES-GCM Initialization Vector is required'],
    },
    authTag: {
      type: String,
      required: [true, 'AES-GCM Authentication Tag is required'],
    },
    encryptedDek: {
      type: String,
      required: [true, 'Encrypted Data Encryption Key envelope is required'],
    },
    category: {
      type: String,
      enum: ['IDENTITY', 'FINANCIAL', 'MEDICAL', 'LEGAL', 'PERSONAL', 'TAX', 'EMERGENCY', 'OTHER'],
      default: 'PERSONAL',
      index: true,
    },
    tags: [
      {
        type: String,
        trim: true,
      },
    ],
    notes: {
      type: String,
      default: '',
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
    },
    privacyAssessment: {
      scanned: { type: Boolean, default: false },
      score: { type: Number, default: 100 },
      riskLevel: {
        type: String,
        enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
        default: 'LOW',
      },
      grade: {
        type: String,
        enum: ['EXCELLENT', 'GOOD', 'ATTENTION', 'CRITICAL'],
        default: 'EXCELLENT',
      },
      entityCounts: {
        type: mongoose.Schema.Types.Mixed,
        default: () => ({}),
      },
      detectedEntities: [
        {
          type: { type: String },
          label: { type: String },
          maskedValue: { type: String },
          severity: { type: String },
          confidence: { type: String },
          remediation: { type: String },
        },
      ],
      scannedAt: { type: Date, default: null },
      scanDurationMs: { type: Number, default: 0 },
    },
    retentionExpiresAt: {
      type: Date,
      default: null,
      index: true,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true,
    },
    deletedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for listing active user documents sorted by date
DocumentSchema.index({ userId: 1, isDeleted: 1, createdAt: -1 });
DocumentSchema.index({ userId: 1, category: 1 });

const Document = mongoose.model('Document', DocumentSchema);
export default Document;

