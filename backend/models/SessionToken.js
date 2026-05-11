import mongoose from 'mongoose';
import crypto from 'crypto';

const sessionTokenSchema = new mongoose.Schema(
  {
    token:     { type: String, required: true, unique: true, default: () => crypto.randomBytes(16).toString('hex') },
    session:   { type: String, required: true, enum: ['morning1', 'morning2', 'afternoon1', 'afternoon2'] },
    batchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    batchName: { type: String, required: true },
    college:   { type: String },
    date:      { type: String, required: true },   // YYYY-MM-DD
    expiresAt:   { type: Date, required: true },
    submitUntil: { type: Date, required: true }, // expiresAt + 8 min — window where students may submit
    usedIps:     [{ type: String }],
  },
  { timestamps: true }
);

// Delete token 10 min after QR expiry (covers the 8-min submit window)
sessionTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 600 });

const SessionToken = mongoose.model('SessionToken', sessionTokenSchema);

export default SessionToken;
