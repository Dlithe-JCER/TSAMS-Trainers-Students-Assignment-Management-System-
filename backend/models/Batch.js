import mongoose from 'mongoose';

const batchSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    assignmentName: {
      type: String,
      trim: true,
      default: '',
    },
    college: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ['active', 'completed', 'inactive'],
      default: 'active',
    },
    type: {
      type: String,
      enum: ['technical', 'non-technical'],
      default: 'technical',
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Batch = mongoose.model('Batch', batchSchema);

export default Batch;
