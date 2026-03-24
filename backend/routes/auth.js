const router = require('express').Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { getFirebaseAdmin } = require('../services/firebaseAdmin');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
  githubProfile: user.githubProfile || '',
  linkedinProfile: user.linkedinProfile || ''
});

router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'All fields required' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(400).json({ message: 'Email already registered' });

    const role = resolveRoleByEmail(email);
    const user = await User.create({ name, email, password, role });
    const token = signToken(user._id);
    res.status(201).json({ token, user: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/login', async (req, res) => {
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
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/firebase', async (req, res) => {
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
    const profilePhoto = decoded.picture || profilePhotoFromClient || '';
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
    return res.json({ token, user: serializeUser(user) });
  } catch (err) {
    const msg = err?.message || 'Firebase authentication failed';
    const isConfigError = msg.includes('Firebase admin credentials are missing') || msg.includes('Invalid FIREBASE_SERVICE_ACCOUNT_JSON value');
    if (isConfigError) {
      return res.status(500).json({
        message: 'Firebase Admin is not configured on backend. Set FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY in backend/.env and restart backend.'
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
    const { name, profilePhoto, githubProfile, linkedinProfile } = req.body;

    if (typeof name !== 'string' || name.trim().length < 2) {
      return res.status(400).json({ message: 'Name must be at least 2 characters' });
    }

    const hasProfilePhoto = typeof profilePhoto === 'string';
    const trimmedPhoto = hasProfilePhoto ? profilePhoto.trim() : '';
    const trimmedGithub = typeof githubProfile === 'string' ? githubProfile.trim() : '';
    const trimmedLinkedin = typeof linkedinProfile === 'string' ? linkedinProfile.trim() : '';

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
    req.user.githubProfile = trimmedGithub;
    req.user.linkedinProfile = trimmedLinkedin;
    await req.user.save();

    res.json({ message: 'Profile updated', user: serializeUser(req.user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/notification-token', auth, async (req, res) => {
  try {
    const { token } = req.body;
    if (!token || typeof token !== 'string') {
      return res.status(400).json({ message: 'Valid notification token required' });
    }

    req.user.notificationToken = token.trim();
    await req.user.save();
    res.json({ message: 'Notification token updated' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
