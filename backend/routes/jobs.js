const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const Job = require('../models/Job');
const NotificationService = require('../services/notificationService');

const DEFAULT_COMPANY_PHOTO = '/job-icon.jpg';

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function sanitizeHttpsUrl(value) {
  if (typeof value !== 'string') return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'https:') return '';
    return parsed.toString();
  } catch {
    return '';
  }
}

function buildJobPayload(body) {
  const companyName = normalizeText(body.companyName);
  const jobDescription = normalizeText(body.jobDescription);

  if (!companyName) {
    throw new Error('Company name is required');
  }

  if (!jobDescription) {
    throw new Error('Job description is required');
  }

  let parsedEndDate = null;
  const endDateInput = normalizeText(body.endDate);
  if (endDateInput) {
    parsedEndDate = new Date(`${endDateInput}T23:59:59.999`);
    if (Number.isNaN(parsedEndDate.getTime())) {
      throw new Error('Invalid end date');
    }
    if (parsedEndDate <= new Date()) {
      throw new Error('End date must be in the future');
    }
  }

  let parsedApplyUrl = '';
  const applyUrlInput = normalizeText(body.applyUrl);
  if (applyUrlInput) {
    let formattedUrl = applyUrlInput;
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`;
    }
    try {
      parsedApplyUrl = new URL(formattedUrl).toString();
    } catch {
      throw new Error('Invalid apply redirect URL');
    }
  }

  const companyPhotoInput = normalizeText(body.companyPhoto);

  // Determine company photo: accept data URLs (file uploads), valid http/https URLs, or fall back to default
  let companyPhoto = DEFAULT_COMPANY_PHOTO;
  if (companyPhotoInput) {
    if (companyPhotoInput.startsWith('data:image/')) {
      // Base64 data URL from file upload or paste — accept as-is
      companyPhoto = companyPhotoInput;
    } else {
      // Try to parse as a web URL (https or http)
      try {
        const parsed = new URL(companyPhotoInput);
        if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
          companyPhoto = parsed.toString();
        }
      } catch {
        // Invalid URL — keep default
      }
    }
  }

  return {
    companyPhoto,
    companyName,
    jobRole: normalizeText(body.jobRole),
    applyUrl: parsedApplyUrl,
    batchOrEducation: normalizeText(body.batchOrEducation),
    experience: normalizeText(body.experience),
    location: normalizeText(body.location),
    jobDescription,
    endDate: parsedEndDate
  };
}

async function cleanupExpiredJobs() {
  await Job.deleteMany({
    endDate: {
      $type: 'date',
      $lt: new Date()
    }
  });
}

const publicProjection = {
  companyPhoto: 1,
  companyName: 1,
  jobRole: 1,
  applyUrl: 1,
  batchOrEducation: 1,
  experience: 1,
  location: 1,
  jobDescription: 1,
  endDate: 1,
  createdAt: 1,
  applicantsCount: { $size: '$applicants' }
};

router.get('/', authMiddleware, async (req, res) => {
  try {
    await cleanupExpiredJobs();
    const now = new Date();
    const jobs = await Job.aggregate([
      {
        $match: {
          isActive: true,
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $project: {
          ...publicProjection,
          hasApplied: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: '$applicants',
                    as: 'applicant',
                    cond: { $eq: ['$$applicant.userId', req.user._id] }
                  }
                }
              },
              0
            ]
          }
        }
      }
    ]);

    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(404).json({ message: 'Job not found' });
    }
    const now = new Date();
    const jobs = await Job.aggregate([
      {
        $match: {
          _id: new mongoose.Types.ObjectId(req.params.id),
          isActive: true,
          $or: [
            { endDate: { $exists: false } },
            { endDate: null },
            { endDate: { $gte: now } }
          ]
        }
      },
      {
        $project: {
          ...publicProjection,
          hasApplied: {
            $gt: [
              {
                $size: {
                  $filter: {
                    input: { $ifNull: ['$applicants', []] },
                    as: 'applicant',
                    cond: { $eq: ['$$applicant.userId', req.user._id] }
                  }
                }
              },
              0
            ]
          }
        }
      }
    ]);
    
    if (!jobs.length) {
       return res.status(404).json({ message: 'Job not found or no longer active' });
    }
    res.json({ job: jobs[0] });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    await cleanupExpiredJobs();
    const now = new Date();
    const job = await Job.findOne({
      _id: req.params.id,
      isActive: true,
      $or: [
        { endDate: { $exists: false } },
        { endDate: null },
        { endDate: { $gte: now } }
      ]
    });
    if (!job) return res.status(404).json({ message: 'Job is not available anymore' });

    const alreadyApplied = job.applicants.some(applicant => applicant.userId.toString() === req.user._id.toString());
    if (alreadyApplied) {
      return res.json({
        message: 'You already applied for this job',
        alreadyApplied: true,
        redirectUrl: job.applyUrl
      });
    }

    job.applicants.push({
      userId: req.user._id,
      name: req.user.name,
      email: req.user.email
    });

    await job.save();
    res.json({
      message: 'Application submitted successfully',
      alreadyApplied: false,
      redirectUrl: job.applyUrl
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/admin/all', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    await cleanupExpiredJobs();
    const jobs = await Job.find()
      .sort({ createdAt: -1 })
      .populate('applicants.userId', 'name email');

    res.json({ jobs });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payload = buildJobPayload(req.body);

    const job = await Job.create({
      ...payload,
      postedBy: req.user._id
    });

    // Send push notifications to all users
    const notification = {
      title: `New Job: ${payload.jobRole}`,
      body: `${payload.companyName} is hiring!`,
      icon: payload.companyPhoto || '/pwa-192.png',
      tag: 'new-job'
    };
    const data = {
      jobId: job._id.toString(),
      companyName: payload.companyName,
      jobRole: payload.jobRole,
      companyImage: payload.companyPhoto
    };

    const notificationResult = await NotificationService.sendToAll(notification, data);

    res.status(201).json({
      message: 'Job posted successfully',
      job,
      notification: notificationResult
    });
  } catch (err) {
    if (
      err.message === 'Company name is required' ||
      err.message === 'Job description is required' ||
      err.message === 'Invalid end date' ||
      err.message === 'End date must be in the future' ||
      err.message === 'Invalid apply redirect URL'
    ) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

router.patch('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const payload = buildJobPayload(req.body);
    const job = await Job.findByIdAndUpdate(req.params.id, payload, { new: true });
    if (!job) return res.status(404).json({ message: 'Job not found' });

    res.json({ message: 'Job updated successfully', job });
  } catch (err) {
    if (
      err.message === 'Company name is required' ||
      err.message === 'Job description is required' ||
      err.message === 'Invalid end date' ||
      err.message === 'End date must be in the future' ||
      err.message === 'Invalid apply redirect URL'
    ) {
      return res.status(400).json({ message: err.message });
    }
    res.status(500).json({ message: err.message });
  }
});

router.delete('/admin/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const job = await Job.findByIdAndDelete(req.params.id);
    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ message: 'Job deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.patch('/admin/:id/status', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { isActive } = req.body;
    if (typeof isActive !== 'boolean') {
      return res.status(400).json({ message: 'isActive must be boolean' });
    }

    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { isActive },
      { new: true }
    );

    if (!job) return res.status(404).json({ message: 'Job not found' });
    res.json({ message: 'Job status updated', job });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;