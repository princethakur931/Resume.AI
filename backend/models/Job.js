const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now }
}, { _id: false });

const jobSchema = new mongoose.Schema({
  companyPhoto: { type: String, trim: true },
  companyName: { type: String, trim: true },
  jobRole: { type: String, trim: true },
  applyUrl: { type: String, trim: true },
  batchOrEducation: { type: String, trim: true },
  experience: { type: String, trim: true },
  jobDescription: { type: String, trim: true },
  endDate: { type: Date },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicants: [applicantSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);