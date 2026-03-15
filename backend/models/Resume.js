const mongoose = require('mongoose');

const resumeSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  originalText: { type: String },
  latexCode: { type: String },
  optimizedLatex: { type: String },
  pdfBase64: { type: String },
  jobDescription: { type: String },
  status: {
    type: String,
    enum: ['idle', 'processing', 'compiled', 'error'],
    default: 'idle'
  },
  atsScore: { type: Number, default: 0 },
  extractedKeywords: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('Resume', resumeSchema);
