const router = require('express').Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getFirebaseAdmin } = require('../services/firebaseAdmin');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

// Set secure httpOnly cookie (cross-domain: SameSite=None requires Secure=true)
const setAuthCookie = (res, token) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.cookie('jwt_token', token, {
    httpOnly: true,                        // JS cannot access this cookie
    secure: isProduction,                  // HTTPS only in production
    sameSite: isProduction ? 'None' : 'Lax', // None for cross-domain (Vercel→Render)
    maxAge: 7 * 24 * 60 * 60 * 1000,     // 7 days in ms
    path: '/'
  });
};

// Rate limiters
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // max 10 login attempts
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many login attempts. Please try again after 15 minutes.' }
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                     // max 5 registrations per IP per hour
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many accounts created from this IP. Please try again after 1 hour.' }
});

const firebaseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 20,                    // Firebase auth is already secure, higher limit
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => process.env.NODE_ENV === 'test',
  message: { message: 'Too many authentication attempts. Please try again after 15 minutes.' }
});

const adminEmails = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(email => email.trim().toLowerCase())
  .filter(Boolean);

const resolveRoleByEmail = email => (adminEmails.includes(email.toLowerCase()) ? 'admin' : 'user');
const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype && file.mimetype.startsWith('image/')) return cb(null, true);
    cb(new Error('Only image files are allowed'));
  }
});

const serializeUser = (user) => ({
  id: user._id,
  name: user.name,
  email: user.email || '',
  role: user.role || 'user',
  phoneNumber: user.phoneNumber || '',
  authProvider: user.authProvider || 'local',
  profilePhoto: user.profilePhoto || '',
  title: user.title || '',
  githubProfile: user.githubProfile || '',
  linkedinProfile: user.linkedinProfile || '',
  about: user.about || '',
  education: user.education || {
    collegeName: '',
    degree: '',
    course: '',
    startYear: '',
    endYear: ''
  }
});

const sanitizeRemoteImageUrl = (value) => {
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
};

router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    if (password.length < 8)
      return res.status(400).json({ message: 'Password must be at least 8 characters' });

    if (!/[A-Z]/.test(password))
      return res.status(400).json({ message: 'Password must contain at least one uppercase letter' });

    if (!/\d/.test(password))
      return res.status(400).json({ message: 'Password must contain at least one number' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const role = resolveRoleByEmail(email);
    const user = await User.create({ name, email, password, role });
    const token = signToken(user._id);
    setAuthCookie(res, token);
    res.status(201).json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email and password required' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });
    if (!user.password) {
      return res.status(401).json({ message: 'Use Firebase login for this account' });
    }

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const role = resolveRoleByEmail(user.email);
    if (user.role !== role) {
      user.role = role;
      await user.save();
    }

    const token = signToken(user._id);
    setAuthCookie(res, token);
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ message: 'Login failed. Please try again.' });
  }
});


router.post('/firebase', firebaseLimiter, async (req, res) => {
  try {
    const { idToken, name, profilePhoto: profilePhotoFromClient } = req.body;
    if (!idToken) return res.status(400).json({ message: 'Firebase ID token is required' });

    const admin = getFirebaseAdmin();
    const decoded = await admin.auth().verifyIdToken(idToken);

    const firebaseUid = decoded.uid;
    const email = decoded.email ? String(decoded.email).toLowerCase() : '';
    const providerId = decoded.firebase?.sign_in_provider || '';

    if (providerId === 'password' && decoded.email_verified !== true) {
      return res.status(401).json({ message: 'Please verify your email before signing in.' });
    }

    const displayName = name?.trim() || decoded.name || (email ? email.split('@')[0] : 'User');
    const profilePhoto = sanitizeRemoteImageUrl(decoded.picture)
      || sanitizeRemoteImageUrl(profilePhotoFromClient)
      || '';
    const provider = providerId === 'google.com' ? 'google' : 'firebase';

    const lookupQuery = email
      ? { $or: [{ firebaseUid }, { email }] }
      : { firebaseUid };

    let user = await User.findOne(lookupQuery);

    if (!user) {
      user = await User.create({
        name: displayName,
        email: email || undefined,
        role: email ? resolveRoleByEmail(email) : 'user',
        authProvider: provider,
        firebaseUid,
        profilePhoto
      });
    } else {
      user.name = user.name || displayName;
      if (email) user.email = email;
      if (profilePhoto) user.profilePhoto = profilePhoto;
      user.firebaseUid = user.firebaseUid || firebaseUid;
      if (user.authProvider === 'local' && !user.password) {
        user.authProvider = provider;
      }
      if (email) {
        user.role = resolveRoleByEmail(email);
      }
      await user.save();
    }

    const token = signToken(user._id);
    setAuthCookie(res, token);
    return res.json({ token, user: serializeUser(user) });
  } catch (err) {
    const msg = err?.message || 'Firebase authentication failed';
    const isConfigError =
      msg.includes('Firebase admin credentials') ||
      msg.includes('Invalid FIREBASE_SERVICE_ACCOUNT_JSON value') ||
      msg.includes('Failed to parse private key') ||
      msg.includes('DECODER routines');

    if (isConfigError) {
      return res.status(500).json({
        message: 'Firebase Admin Private Key in backend/.env is incomplete or corrupted. Please replace FIREBASE_PRIVATE_KEY or FIREBASE_SERVICE_ACCOUNT_JSON with the complete json from Firebase Console.'
      });
    }

    return res.status(401).json({ message: msg });
  }
});

router.get('/me', auth, async (req, res) => {
  try {
    res.json({ user: serializeUser(req.user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/logout', (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  res.clearCookie('jwt_token', {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'None' : 'Lax',
    path: '/'
  });
  res.json({ message: 'Logged out successfully' });
});


router.post('/profile/photo', auth, (req, res) => {
  imageUpload.single('photo')(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        return res.status(400).json({ message: uploadErr.message || 'Photo upload failed' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No photo file uploaded' });
      }

      req.user.profilePhoto = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
      await req.user.save();

      return res.json({ message: 'Profile photo uploaded', user: serializeUser(req.user) });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  });
});

router.put('/profile', auth, async (req, res) => {
  try {
    const { name, profilePhoto, githubProfile, linkedinProfile, about, title, education, phoneNumber } = req.body;

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    const hasProfilePhoto = typeof profilePhoto === 'string';
    const trimmedPhoto = hasProfilePhoto ? profilePhoto.trim() : '';
    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const trimmedGithub = typeof githubProfile === 'string' ? githubProfile.trim() : '';
    const trimmedLinkedin = typeof linkedinProfile === 'string' ? linkedinProfile.trim() : '';
    const trimmedAbout = typeof about === 'string' ? about.trim() : '';
    const trimmedPhone = typeof phoneNumber === 'string' ? phoneNumber.trim() : '';

    if (hasProfilePhoto) {
      const maxPhotoLength = trimmedPhoto.startsWith('data:image/') ? 8 * 1024 * 1024 : 2000;
      if (trimmedPhoto.length > maxPhotoLength) {
        return res.status(400).json({ message: 'Profile photo data is too large' });
      }
    }

    if (trimmedGithub.length > 2000) {
      return res.status(400).json({ message: 'GitHub profile URL is too long' });
    }

    if (trimmedLinkedin.length > 2000) {
      return res.status(400).json({ message: 'LinkedIn profile URL is too long' });
    }

    req.user.name = name.trim();
    if (hasProfilePhoto) req.user.profilePhoto = trimmedPhoto;
    req.user.title = trimmedTitle;
    req.user.githubProfile = trimmedGithub;
    req.user.linkedinProfile = trimmedLinkedin;
    req.user.about = trimmedAbout;
    if (education && typeof education === 'object') {
      req.user.education = {
        collegeName: typeof education.collegeName === 'string' ? education.collegeName.trim() : '',
        degree: typeof education.degree === 'string' ? education.degree.trim() : '',
        course: typeof education.course === 'string' ? education.course.trim() : '',
        startYear: typeof education.startYear === 'string' ? education.startYear.trim() : '',
        endYear: typeof education.endYear === 'string' ? education.endYear.trim() : ''
      };
    }
    if (trimmedPhone) {
      req.user.phoneNumber = trimmedPhone;
    } else {
      req.user.phoneNumber = undefined;
    }
    await req.user.save();

    res.json({ message: 'Profile updated', user: serializeUser(req.user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/notification-token', auth, async (req, res) => {
  try {
    const { token, action } = req.body;
    if (typeof token !== 'string') {
      return res.status(400).json({ message: 'Valid notification token required' });
    }

    const normalizedToken = token.trim();
    const existingTokens = Array.isArray(req.user.notificationTokens)
      ? req.user.notificationTokens.filter(Boolean)
      : [];

    // Migrate legacy single-token field into token array when present.
    if (req.user.notificationToken && !existingTokens.includes(req.user.notificationToken)) {
      existingTokens.push(req.user.notificationToken);
    }

    if (!normalizedToken) {
      req.user.notificationToken = '';
      req.user.notificationTokens = [];
      await req.user.save();
      return res.json({ message: 'Notification tokens cleared' });
    }

    if (action === 'remove') {
      req.user.notificationTokens = existingTokens.filter(saved => saved !== normalizedToken);
      req.user.notificationToken = req.user.notificationTokens[0] || '';
      await req.user.save();
      return res.json({ message: 'Notification token removed' });
    }

    if (!existingTokens.includes(normalizedToken)) {
      existingTokens.push(normalizedToken);
    }

    // Cap tokens at 10 devices per user to prevent DB bloat
    const MAX_TOKENS = 10;
    const trimmedTokens = existingTokens.length > MAX_TOKENS
      ? existingTokens.slice(-MAX_TOKENS)
      : existingTokens;

    req.user.notificationTokens = trimmedTokens;
    req.user.notificationToken = normalizedToken;
    await req.user.save();
    res.json({ message: 'Notification token updated', count: req.user.notificationTokens.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
