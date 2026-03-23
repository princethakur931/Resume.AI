require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const jobsRoutes = require('./routes/jobs');
const Job = require('./models/Job');

const app = express();

// Support multiple frontend origins (comma-separated) for Vercel production + preview URLs.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser clients and same-origin requests.
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);

    return callback(new Error(`CORS blocked for origin: ${origin}`));
  },
  credentials: true
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/resumeai')
  .then(async () => {
    console.log('MongoDB connected');

    const cleanupExpiredJobs = async () => {
      try {
        await Job.deleteMany({ endDate: { $lt: new Date() } });
      } catch (err) {
        console.error('Expired jobs cleanup failed:', err.message);
      }
    };

    await cleanupExpiredJobs();
    setInterval(cleanupExpiredJobs, 60 * 1000);
  })
  .catch(err => console.error('MongoDB error:', err));

app.use('/api/auth', authRoutes);
app.use('/api/resume', resumeRoutes);
app.use('/api/jobs', jobsRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
