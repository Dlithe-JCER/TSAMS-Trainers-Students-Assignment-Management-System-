import mongoose from 'mongoose';

const submissionSchema = new mongoose.Schema(
  {
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
      required: false,
      default: null,
    },
    trainerName: {
      type: String,
      required: true,
    },
    college: {
      type: String,
      trim: true,
    },
    classroom: {
      type: String,
      trim: true,
    },
    assignmentName: {
      type: String,
      trim: true,
    },
    batchName: {
      type: String,
      required: true,
    },
    topicsCovered: {
      type: String,
      required: true,
    },
    sessionDate: {
      type: Date,
      required: true,
    },
    githubLink: {
      type: String,
      required: true,
    },
    assignmentLink: {
      type: String,
      required: true,
    },
    morningSession1: { type: Number, default: 0 },
    morningSession2: { type: Number, default: 0 },
    afternoonSession1: { type: Number, default: 0 },
    afternoonSession2: { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    feedback: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

const Submission = mongoose.model('Submission', submissionSchema);

export default Submission;
