const router = require('express').Router();
const jwt = require('jsonwebtoken');
const multer = require('multer');
const User = require('../models/User');
const auth = require('../middleware/auth');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '7d' });

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
  email: user.email,
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

    const user = await User.create({ name, email, password });
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

    const valid = await user.comparePassword(password);
    if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

    const token = signToken(user._id);
    res.json({ token, user: serializeUser(user) });
  } catch (err) {
    res.status(500).json({ message: err.message });
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

      // Store profile image directly in DB as data URL.
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

module.exports = router;
