import mongoose from 'mongoose';

const trainerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      lowercase: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    college: {
      type: String,
      trim: true,
    },
    allottedCollege: {
      type: String,
      trim: true,
    },
    allottedProgrammingLanguage: {
      type: String,
      trim: true,
    },
    allottedLevel: {
      type: String,
      trim: true,
    },
    assignmentName: {
      type: String,
      trim: true,
    },
    allottedBatch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    topicCoverage: {
      type: String,
      trim: true,
    },
    adminRemark: {
      type: String,
      trim: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    password: {
      type: String,
      minlength: 6,
    },
    verified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    role: {
      type: String,
      enum: ['trainer', 'admin', 'superAdmin'],
      default: 'trainer',
    },
  },
  {
    timestamps: true,
  }
);

const Trainer = mongoose.model('Trainer', trainerSchema);

export default Trainer;
