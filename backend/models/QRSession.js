import mongoose from 'mongoose';

const qrSessionSchema = new mongoose.Schema(
  {
    qrToken: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    batchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Batch',
      required: true,
    },
    classroomId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Classroom',
    },
    generatedAt: {
      type: Date,
      default: Date.now,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ['active', 'expired', 'completed'],
      default: 'active',
    },
    trainerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Trainer',
    },
  },
  {
    timestamps: true,
  }
);

// Auto-expire old QR sessions
qrSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

const QRSession = mongoose.model('QRSession', qrSessionSchema);

export default QRSession;
