const mongoose = require('mongoose');

const applicantSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true },
  email: { type: String, required: true },
  appliedAt: { type: Date, default: Date.now }
}, { _id: false });

const jobSchema = new mongoose.Schema({
  companyPhoto: { type: String, trim: true, required: true },
  companyName: { type: String, trim: true, required: true },
  jobRole: { type: String, trim: true, required: true },
  applyUrl: { type: String, trim: true, required: true },
  batchOrEducation: { type: String, trim: true, required: true },
  experience: { type: String, trim: true, required: true },
  jobDescription: { type: String, trim: true, required: true },
  endDate: { type: Date, required: true },
  postedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  applicants: [applicantSchema],
  isActive: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('Job', jobSchema);