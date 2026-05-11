import mongoose from 'mongoose';

const sessionEntrySchema = new mongoose.Schema({
  session:     { type: String, enum: ['morning1', 'morning2', 'afternoon1', 'afternoon2'] },
  sessionLabel:{ type: String },
  generatedAt: { type: Date, default: Date.now },
}, { _id: false });

const dailyLogSchema = new mongoose.Schema(
  {
    date:      { type: String, required: true },        // "YYYY-MM-DD"
    batchId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },
    batchName: { type: String, required: true },
    college:   { type: String },
    sessions:  [sessionEntrySchema],
  },
  { timestamps: true }
);

// One log per day per batch
dailyLogSchema.index({ date: 1, batchId: 1 }, { unique: true });

const DailyLog = mongoose.model('DailyLog', dailyLogSchema);

export default DailyLog;
