require('dotenv').config();
const dns = require('dns');
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore DNS fallback error if environment restricts custom DNS
}
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/auth');
const resumeRoutes = require('./routes/resume');
const jobsRoutes = require('./routes/jobs');
const Job = require('./models/Job');

const app = express();

// Support multiple frontend origins (comma-separated) for Vercel production + preview URLs.
const allowedOrigins = (process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim().replace(/\/+$/, ''))  // remove trailing slashes
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

// Security headers
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'", 'https://firebaseapp.com', 'https://*.googleapis.com', 'https://*.google.com'],
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: []
    }
  },
  crossOriginEmbedderPolicy: false  // Disable to avoid breaking Firebase Auth popups
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// NoSQL injection protection — strips $ and . from request body keys
app.use(mongoSanitize());

// Cookie parser for httpOnly JWT cookies
app.use(cookieParser());

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

app.get('/', (req, res) => res.json({ status: 'ok', message: 'Resume.AI API Server Running' }));
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
