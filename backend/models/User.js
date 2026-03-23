const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, unique: true, sparse: true, lowercase: true, trim: true },
  role: { type: String, enum: ['user', 'admin'], default: 'user' },
  phoneNumber: { type: String, unique: true, sparse: true, trim: true },
  authProvider: {
    type: String,
    enum: ['local', 'google', 'phone', 'firebase'],
    default: 'local'
  },
  firebaseUid: { type: String, unique: true, sparse: true, trim: true },
  profilePhoto: { type: String, default: '' },
  githubProfile: { type: String, default: '' },
  linkedinProfile: { type: String, default: '' },
  password: {
    type: String,
    minlength: 6,
    validate: {
      validator: function(value) {
        if (this.authProvider !== 'local') return true;
        return typeof value === 'string' && value.length >= 6;
      },
      message: 'Password must be at least 6 characters for local accounts'
    }
  }
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.password) return next();
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  if (!this.password) return false;
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);
