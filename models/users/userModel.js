const mongoose = require('mongoose');
const validator = require('validator');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide your name.'],
      trim: true
    },
    username: {
      type: String,
      trim: true
    },
    officeTime: {
      utcDate: { type: String, default: '2022-11-13T03:15:00.000Z' },
      hour: { type: String, default: '3' },
      minute: { type: String, default: '25' }
    },
    officeEndTime: {
      type: String,
      default: '2022-11-13T12:15:00.000Z'
    },
    email: {
      type: String,
      required: [true, 'Please provide your email.'],
      unique: true,
      lowercase: true,
      validate: [validator.isEmail, 'Please provide a valid email.']
    },
    password: {
      type: String,
      required: [true, 'Please provide a password'],
      minlength: 8,
      select: false
    },
    passwordConfirm: {
      type: String,
      required: [true, 'Please confirm your password.'],
      validate: {
        // This only works on CREATE and SAVE!!!
        validator: function (el) {
          return el === this.password;
        },
        message: 'Passwords are not same!'
      }
    },
    photoURL: {
      type: String,
      default: null
    },
    role: {
      type: mongoose.Schema.ObjectId,
      ref: 'User_Role'
    },
    position: {
      type: mongoose.Schema.ObjectId,
      ref: 'User_Position'
    },
    positionType: {
      type: mongoose.Schema.ObjectId,
      ref: 'User_Position_Type'
    },
    status: {
      type: String,
      enum: ['Permanent', 'Probation'],
      default: 'Probation'
    },
    statusChangeDate: {
      type: Date
    },
    active: {
      type: Boolean,
      default: true
    },
    dob: {
      type: Date,
      required: [true, 'Please provide your date of birth.']
    },
    gender: {
      type: String,
      default: 'Male'
    },
    primaryPhone: {
      type: Number,
      required: [true, 'Please provide your primary phone number.']
    },
    secondaryPhone: Number,
    joinDate: {
      type: Date,
      required: [true, 'Please provide your join date.']
    },
    maritalStatus: {
      type: String,
      default: 'Unmarried'
    },
    leaveadjustmentBalance: {
      type: Number,
      default: 0
    },
    lastReviewDate: { type: [Date], default: [] },
    isPartTime: {
      type: Boolean,
      default: false
    },
    pushToken: String,
    exitDate: Date,
    panNumber: Number,
    citNumber: Number,
    bankName: String,
    bankAccNumber: String,
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
  },
  {
    timestamps: true
  }
);

// Document Middleware
userSchema.pre('save', async function (next) {
  // Only run this function if password was actually modified
  if (!this.isModified('password')) return next();

  // Hash the password with cost of 12
  this.password = await bcrypt.hash(this.password, 12);

  // Delete passwordConfirm field
  this.passwordConfirm = undefined;
  next();
});

// Query Middleware : Select active users only
userSchema.pre(/^find/, function (next) {
  // this points to the current query
  // this.find({ active: { $ne: false } });

  this.populate({
    path: 'role',
    select: 'key value permission'
  })
    .populate({
      path: 'position',
      select: 'name'
    })
    .populate({
      path: 'positionType',
      select: 'name'
    });
  next();
});

// Check user password with saved db password
userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

// Save password changed date on db
userSchema.pre('save', function (next) {
  if (!this.isModified('password') || this.isNew) return next();

  // this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Model Middleware
userSchema.pre('insertMany', async (next, docs) => {
  const hashUser = docs.map(async (doc) => {
    // Hash the password with cost of 12
    doc.password = await bcrypt.hash(doc.password, 12);

    // Delete passwordConfirm field
    doc.passwordConfirm = undefined;
    return doc;
  });

  docs = await Promise.all(hashUser);

  next();
});

// Check if user is trying to change password after expiration
userSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
      this.passwordChangedAt.getTime() / 1000,
      10
    );

    return JWTTimestamp < changedTimestamp;
  }

  // False means NOT changed
  return false;
};

// Password reset token for user
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 30 * 60 * 1000;

  return resetToken;
};

const User = mongoose.model('User', userSchema);

module.exports = User;
