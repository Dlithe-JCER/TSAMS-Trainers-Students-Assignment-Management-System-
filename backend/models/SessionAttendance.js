import mongoose from 'mongoose';

const sessionAttendanceSchema = new mongoose.Schema(
  {
    studentName: { type: String, required: true, trim: true },
    usn:         { type: String, required: true, trim: true },
    batchId:     { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    batchName:   { type: String, required: true, trim: true },
    college:     { type: String, required: true, trim: true },
    session:     {
      type: String,
      required: true,
      enum: ['morning1', 'morning2', 'afternoon1', 'afternoon2'],
    },
    latitude:    { type: Number, default: null },
    longitude:   { type: Number, default: null },
    submittedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const SessionAttendance = mongoose.model('SessionAttendance', sessionAttendanceSchema);

export default SessionAttendance;
