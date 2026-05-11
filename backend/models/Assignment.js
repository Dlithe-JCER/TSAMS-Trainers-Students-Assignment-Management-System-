import mongoose from 'mongoose';

const assignmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    college: { type: String, required: true, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },
    adminRemark: { type: String, trim: true },
  },
  { timestamps: true }
);

const Assignment = mongoose.model('Assignment', assignmentSchema);
export default Assignment;
