import mongoose from 'mongoose';

const AuditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true,
    },
    actionType: {
      type: String,
      required: [true, 'Action type is required'],
      index: true,
    },
    entityType: {
      type: String,
      required: [true, 'Entity type is required'],
      index: true,
    },
    entityId: {
      type: String,
      default: null,
    },
    ipHash: {
      type: String,
      required: [true, 'Anonymized IP hash is required'],
    },
    userAgentSummary: {
      type: String,
      default: '',
      maxlength: 256,
    },
    status: {
      type: String,
      enum: ['SUCCESS', 'FAILURE', 'BLOCKED'],
      default: 'SUCCESS',
      index: true,
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: () => ({}),
    },
    previousLogHash: {
      type: String,
      required: [true, 'Previous log hash is required for tamper-evident chaining'],
    },
    logHash: {
      type: String,
      required: [true, 'Forensic log hash is required'],
      unique: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ userId: 1, createdAt: -1 });

const AuditLog = mongoose.model('AuditLog', AuditLogSchema);
export default AuditLog;

