import mongoose from 'mongoose';

const TrustedContactSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner User ID is required'],
      index: true,
    },
    contactName: {
      type: String,
      required: [true, 'Contact name is required'],
      trim: true,
      maxlength: [100, 'Contact name cannot exceed 100 characters'],
    },
    contactEmail: {
      type: String,
      required: [true, 'Contact email is required'],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address format'],
    },
    phone: {
      type: String,
      trim: true,
      default: '',
    },
    relationship: {
      type: String,
      required: [true, 'Relationship is required'],
      enum: ['SPOUSE', 'CHILD', 'PARENT', 'SIBLING', 'ATTORNEY', 'PHYSICIAN', 'TRUSTED_ADVISOR', 'FRIEND', 'OTHER'],
      default: 'TRUSTED_ADVISOR',
    },
    status: {
      type: String,
      enum: ['PENDING', 'ACTIVE', 'REVOKED'],
      default: 'ACTIVE',
      index: true,
    },
    invitationTokenHash: {
      type: String,
      default: null,
    },
    invitationExpiresAt: {
      type: Date,
      default: null,
    },
    permissions: {
      canViewEmergencyProfile: {
        type: Boolean,
        default: true,
      },
      canRequestEmergencyAccess: {
        type: Boolean,
        default: true,
      },
      allowedCategories: {
        type: [String],
        default: ['EMERGENCY', 'MEDICAL', 'IDENTITY'],
      },
      canDownloadDocuments: {
        type: Boolean,
        default: false,
      },
    },
    securityNote: {
      type: String,
      default: '',
      maxlength: [500, 'Security note cannot exceed 500 characters'],
    },
    lastAccessedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

TrustedContactSchema.index({ userId: 1, contactEmail: 1 }, { unique: true });

const TrustedContact = mongoose.model('TrustedContact', TrustedContactSchema);
export default TrustedContact;

