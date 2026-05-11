import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema(
  {
    studentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
    },
    qrSessionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QRSession',
      required: true,
    },
    studentName: {
      type: String,
      required: true,
      trim: true,
    },
    usn: {
      type: String,
      required: true,
      trim: true,
    },
    batchName: {
      type: String,
      required: true,
      trim: true,
    },
    college: {
      type: String,
      required: true,
      trim: true,
    },
    latitude: {
      type: Number,
    },
    longitude: {
      type: Number,
    },
    attendanceTimestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const Attendance = mongoose.model('Attendance', attendanceSchema);

export default Attendance;
