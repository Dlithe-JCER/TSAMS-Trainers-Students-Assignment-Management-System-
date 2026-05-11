import mongoose from 'mongoose';

const tocDocumentSchema = new mongoose.Schema(
  {
    college: {
      type: String,
      required: true,
      trim: true,
    },
    assignmentName: {
      type: String,
      required: true,
      trim: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    level: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
    },
    filePath: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const TocDocument = mongoose.model('TocDocument', tocDocumentSchema);

export default TocDocument;
