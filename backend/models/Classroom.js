import mongoose from 'mongoose';

const classroomSchema = new mongoose.Schema(
  {
    college: {
      type: String,
      required: true,
      trim: true,
    },
    assignmentName: {
      type: String,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    batch: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
    },
    status: {
      type: String,
      enum: ['available', 'allocated', 'maintenance'],
      default: 'available',
    },
    capacity: {
      type: Number,
      default: 30,
    },
    startDate: {
      type: Date,
    },
    endDate: {
      type: Date,
    },
    description: {
      type: String,
      trim: true,
    },
    adminRemark: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

const Classroom = mongoose.model('Classroom', classroomSchema);

export default Classroom;