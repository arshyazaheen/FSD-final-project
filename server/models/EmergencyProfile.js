import mongoose from 'mongoose';

const EmergencyProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Owner User ID is required'],
      unique: true,
      index: true,
    },
    bloodType: {
      type: String,
      enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'UNKNOWN'],
      default: 'UNKNOWN',
    },
    allergies: {
      type: [String],
      default: [],
    },
    chronicConditions: {
      type: [String],
      default: [],
    },
    medications: {
      type: [String],
      default: [],
    },
    primaryPhysician: {
      name: { type: String, default: '' },
      phone: { type: String, default: '' },
      clinic: { type: String, default: '' },
    },
    insurancePolicy: {
      provider: { type: String, default: '' },
      policyNumber: { type: String, default: '' },
      groupNumber: { type: String, default: '' },
      emergencyPhone: { type: String, default: '' },
    },
    emergencyInstructions: {
      type: String,
      default: '',
      maxlength: [2000, 'Emergency instructions cannot exceed 2000 characters'],
    },
    designatedContactIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'TrustedContact',
      },
    ],
    emergencyDocumentIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Document',
      },
    ],
    autoGrantAfterHours: {
      type: Number,
      default: 24, // Delay window for emergency trigger
      min: [0, 'Auto-grant delay cannot be negative'],
    },
    isProfileEnabled: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const EmergencyProfile = mongoose.model('EmergencyProfile', EmergencyProfileSchema);
export default EmergencyProfile;

