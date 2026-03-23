const router = require('express').Router();
const authMiddleware = require('../middleware/auth');
const adminMiddleware = require('../middleware/admin');
const Job = require('../models/Job');

const DEFAULT_COMPANY_PHOTO = '/job-icon.jpg';

const requiredFields = [
  'companyName',
  'jobRole',
  'applyUrl',
  'batchOrEducation',
  'experience',
  'jobDescription',
  'endDate'
];

async function cleanupExpiredJobs() {
  await Job.deleteMany({ endDate: { $lt: new Date() } });
}

const publicProjection = {
  companyPhoto: 1,
  companyName: 1,
  jobRole: 1,
  applyUrl: 1,
  batchOrEducation: 1,
  experience: 1,
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
          endDate: { $gte: now }
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

router.post('/:id/apply', authMiddleware, async (req, res) => {
  try {
    await cleanupExpiredJobs();
    const now = new Date();
    const job = await Job.findOne({ _id: req.params.id, isActive: true, endDate: { $gte: now } });
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
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ message: `${field} is required` });
      }
    }

    const parsedEndDate = new Date(`${req.body.endDate}T23:59:59.999`);
    if (Number.isNaN(parsedEndDate.getTime())) {
      return res.status(400).json({ message: 'Invalid end date' });
    }
    if (parsedEndDate <= new Date()) {
      return res.status(400).json({ message: 'End date must be in the future' });
    }

    let parsedApplyUrl = '';
    try {
      parsedApplyUrl = new URL(req.body.applyUrl).toString();
    } catch {
      return res.status(400).json({ message: 'Invalid apply redirect URL' });
    }

    const job = await Job.create({
      companyPhoto: req.body.companyPhoto || DEFAULT_COMPANY_PHOTO,
      companyName: req.body.companyName,
      jobRole: req.body.jobRole,
      applyUrl: parsedApplyUrl,
      batchOrEducation: req.body.batchOrEducation,
      experience: req.body.experience,
      jobDescription: req.body.jobDescription,
      endDate: parsedEndDate,
      postedBy: req.user._id
    });

    res.status(201).json({ message: 'Job posted successfully', job });
  } catch (err) {
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