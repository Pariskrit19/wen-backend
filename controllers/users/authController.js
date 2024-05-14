/* eslint-disable no-await-in-loop */
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const asyncError = require('../../utils/asyncError');
const AppError = require('../../utils/appError');
const User = require('../../models/users/userModel');
const Role = require('../../models/users/userRoleModel');
const Email = require('../../models/email/emailSettingModel');
const Invite = require('../../models/users/inviteModel');
const EmailNotification = require('../../utils/email');
const factory = require('../factoryController');
const { HRWENEMAIL, INFOWENEMAIL } = require('../../utils/constants');
const ActivityLogs = require('../../models/activityLogs/activityLogsModel');
const { LeaveQuarter } = require('../../models/leaves/leaveQuarter');
const common = require('../../utils/common');
const UserLeave = require('../../models/leaves/UserLeavesModel');
const { USER_INVITE_KEY } = require('../../utils/crypto');
const OTP = require('../../models/users/otpModel');

// Create sign-in token
const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN
  });

// Hash token for user invite and password reset token
const hashToken = (token) =>
  crypto.createHash('sha256').update(token).digest('hex');

// Create and send response for sign-in
const createSendToken = (user, statusCode, req, res) => {
  const token = signToken(user._id);

  res.cookie('jwt', token, {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
    secure: req.secure || req.headers['x-forwarded-proto'] === 'https'
  });

  // Remove password from output
  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user
    }
  });
};

/**
 * Send invitation link for user to signup and complete profile
 */
exports.inviteUser = asyncError(async (req, res, next) => {
  const { email } = req.body;
  const invalidEmails = [];
  let emails = [];
  let user = null;
  const isMultipleEmails = email.split(',').length > 0;

  if (isMultipleEmails) {
    emails = [...email.split(',')];
  } else {
    emails = [email];
  }
  // eslint-disable-next-line no-plusplus
  for (let i = 0; i < emails.length; i++) {
    try {
      const invitedEmailDetail = await Invite.findOne({
        email: emails[i],
        inviteTokenUsed: false
      });

      if (!invitedEmailDetail) {
        // eslint-disable-next-line no-await-in-loop
        user = await Invite.create({
          email: emails[i].trim()
        });
      } else {
        user = invitedEmailDetail;
      }

      // Generate the random invite token
      const token = user.createInviteToken();
      // eslint-disable-next-line no-await-in-loop
      await user.save({ validateBeforeSave: false });

      const inviteURL = `${req.get('origin')}/users/signup/${token}`;

      const message = `<b>Please signup and complete your profile by clicking the provided link : <a href={${inviteURL}}>${inviteURL}</a></b>`;
      // Send it to user's email
      const emailContent = await Email.findOne({ module: 'user-invite' });

      await new EmailNotification().sendEmail({
        email: emails[i],
        subject: emailContent.title || 'Your sign up link (valid for 60 mins) ',
        message: emailContent.body.replace(/@url/gi, `${inviteURL}`) || message
      });
    } catch (err) {
      if (user) {
        user.inviteToken = undefined;
        user.inviteTokenExpires = undefined;
        user.inviteTokenUsed = false;
        await user.save({ validateBeforeSave: false });
      }

      invalidEmails.push(emails[i]);
    }
  }

  if (invalidEmails.length > 0) {
    return next(
      new AppError(
        `Error sending the email ${invalidEmails.join(',')}. Try again later!`
      ),
      500
    );
  }

  ActivityLogs.create({
    status: 'created',
    module: 'User',
    activity: `${req.user.name} invited ${emails} to WENAPP`,
    user: {
      name: req.user.name,
      photo: req.user.photoURL
    }
  });

  res.status(200).json({
    status: 'success',
    message: 'Invitation for sign up sent to email!'
  });
});

/**
 * Save user in db
 * Create jwt sign-in token
 * Finally send created user in api response
 */
exports.signup = asyncError(async (req, res, next) => {
  const hashedToken = hashToken(req.params.token);
  const todayDate = common.todayDate();

  const { email } = req.body;

  const invitedUser = await Invite.findOne({
    email,
    inviteTokenUsed: false
  });

  if (!invitedUser) {
    return next(
      new AppError('Please enter the email you were invited with. ', 400)
    );
  }

  const validTokenInvitedUser = await Invite.findOne({
    email,
    inviteTokenExpires: { $gt: Date.now() },
    inviteTokenUsed: false
  });

  if (
    !validTokenInvitedUser ||
    (invitedUser && invitedUser.inviteToken !== hashedToken)
  ) {
    return next(new AppError('Your sign up token has expired.', 400));
  }

  const isEmailAlreadyPresent = await User.findOne({ email });

  if (isEmailAlreadyPresent)
    return next(new AppError('Email already exists.', 400));

  const roles = await Role.findOne({ key: 'subscriber' });

  const newUser = await User.create({
    name: req.body.name,
    username: req.body.username,
    email,
    password: req.body.password,
    passwordConfirm: req.body.passwordConfirm,
    role: roles._id,
    position: req.body.position,
    photoURL: req.body.photoURL,
    dob: req.body.dob,
    gender: req.body.gender,
    primaryPhone: req.body.primaryPhone,
    secondaryPhone: req.body.secondaryPhone,
    maritalStatus: req.body.maritalStatus,
    joinDate: req.body.joinDate
  });

  if (newUser) {
    const quarters = await LeaveQuarter.find()
      .sort({
        createdAt: -1
      })
      .limit(1);
    const currentQuarter = quarters[0].quarters.find(
      (quarter) =>
        new Date(quarter.fromDate) <= new Date(todayDate) &&
        new Date(todayDate) <= new Date(quarter.toDate)
    );

    const allQuarterDetails = quarters[0].quarters.map((quarter) => ({
      approvedLeaves: {
        sickLeaves: 0,
        casualLeaves: 0
      },
      allocatedLeaves:
        quarter._id === currentQuarter._id
          ? common.getNumberOfMonthsInAQuarter(
              currentQuarter.toDate,
              new Date(req.body.joinDate)
            )
          : 0,
      remainingLeaves:
        quarter._id === currentQuarter._id
          ? common.getNumberOfMonthsInAQuarter(
              currentQuarter.toDate,
              new Date(req.body.joinDate)
            )
          : 0,
      carriedOverLeaves: 0,
      leaveDeductionBalance: 0,
      quarter
    }));

    const userLeave = new UserLeave({
      user: newUser._id,
      fiscalYear: quarters[0].fiscalYear,
      leaves: allQuarterDetails
    });
    await userLeave.save();

    await Invite.findByIdAndUpdate(invitedUser._id, { inviteTokenUsed: true });

    const emailContent = await Email.findOne({ module: 'user-signup' });

    const message = `<b><em>${newUser.name}</em> joined WENAPP</b>`;
    new EmailNotification().sendEmail({
      email: [INFOWENEMAIL, HRWENEMAIL],
      subject:
        emailContent.title.replace(/@username/i, newUser.name) ||
        'User was Created',
      message: emailContent.body.replace(
        /@username/i,
        `<em>${newUser.name}</em>` || message
      )
    });
  }

  ActivityLogs.create({
    status: 'created',
    module: 'User',
    activity: `${newUser.name} has signed up to WENAPP`,
    user: {
      name: newUser.name,
      photo: newUser.photoURL
    }
  });
  createSendToken(newUser, 201, req, res);
});

/**
 * Check user login
 * Create jwt sign-in token
 * Finally send logged in user with token in api response
 */
exports.login = asyncError(async (req, res, next) => {
  const { email, password } = req.body;

  // Check if email and password exist
  if (!email || !password) {
    return next(new AppError('Please provide email and password', 400));
  }
  // Check if user exists && password is correct
  const user = await User.findOne({
    $or: [{ email }, { username: email }]
  }).select('+password');

  if (user && user.active === false) {
    return next(new AppError('Account is Deactivated', 401));
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }
  // If everything ok, send token to client
  createSendToken(user, 200, req, res);
});

/**
 * Login with fingerprint in mobile
 */
exports.loginWithBiometric = asyncError(async (req, res, next) => {
  const { user } = req.body;
  const userLoggedIn = await User.findOne({
    _id: user._id
  });
  createSendToken(userLoggedIn, 200, req, res);
});

exports.storePushToken = asyncError(async (req, res, next) => {
  const { userId, expoPushToken } = req.body;
  const user = await User.findByIdAndUpdate(
    userId,
    {
      pushToken: expoPushToken
    },
    { new: true }
  );
  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

/**
 * Check user based on email
 * Generate reset token and send to user email
 */
exports.forgotPassword = asyncError(async (req, res, next) => {
  // Get user based on POSTed email
  const user = await User.findOne({
    email: req.body.email
  });
  if (!user) {
    return next(new AppError('User not found with entered email.', 404));
  }
  if (!user.active) {
    return next(new AppError('User is deactivated.', 404));
  }

  // Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  // Send it to user's email
  try {
    const resetURL = `${req.get('origin')}/users/resetPassword/${resetToken}`;

    const message = `<b>Please use provided link for password reset : </b><p>${resetURL}</p>`;

    const emailContent = await Email.findOne({ module: 'user-reset-password' });

    await new EmailNotification().sendEmail({
      email: user.email,
      subject:
        emailContent.title ||
        'Your password reset token (valid for only 30 minutes) ',
      message: emailContent.body.replace(/@url/gi, `${resetURL}`) || message
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!'
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email. Try again later!'),
      500
    );
  }
});

/**
 * Get user based on the reset password token saved in db
 * Set new password
 * Update passwordChangedAt property in db
 * Log the user and send jwt token
 */
exports.resetPassword = asyncError(async (req, res, next) => {
  // Get user based on the token
  const hashedToken = hashToken(req.params.token);
  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() }
  });

  // If token has not expired, and there is user, set the new password
  if (!user) {
    return next(new AppError('Token is invalid or has expired', 400));
  }
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  await user.save();

  // Update passwordChangedAt property for the user
  // Log the user in, send JWT
  createSendToken(user, 200, req, res);
});

/**
 * Update user password
 */
exports.updatePassword = asyncError(async (req, res, next) => {
  // Get user from collection
  const user = await User.findById(req.user.id).select('+password');

  // Check if POSTed current password is correct
  if (!(await user.correctPassword(req.body.passwordCurrent, user.password))) {
    return next(new AppError('Your current password is wrong.', 401));
  }

  // If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  const newUser = await user.save();

  const emailContent = await Email.findOne({ module: 'user-update-password' });

  // send email
  await new EmailNotification().sendEmail({
    email: user.email,
    subject: emailContent.title || 'Password updated',
    message:
      emailContent.body.replace(/@username/i, user.name) ||
      'Your Password is updated Succesfully!'
  });

  newUser.password = undefined;

  res.status(200).json({
    status: 'success',
    data: {
      newUser
    }
  });
});

/**
 * Update user password in mobile
 */
exports.updatePasswordInMobile = asyncError(async (req, res, next) => {
  // Get user from collection
  const user = await User.findOne({ email: req.body.email }).select(
    '+password'
  );

  // If so, update password
  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  const newUser = await user.save();

  const emailContent = await Email.findOne({ module: 'user-update-password' });

  // send email
  await new EmailNotification().sendEmail({
    email: user.email,
    subject: emailContent.title || 'Password updated',
    message:
      emailContent.body.replace(/@username/i, user.name) ||
      'Your Password is updated Succesfully!'
  });

  newUser.password = undefined;

  res.status(200).json({
    status: 'success',
    data: {
      newUser
    }
  });
});

// Logout user from app
exports.logout = asyncError(async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $unset: { pushToken: '' } });

  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true
  });
  res.status(200).json({ status: 'success' });
});

// Create OTP and Send to email
exports.createOTP = asyncError(async (req, res) => {
  const { email, username } = req.body;

  const isEmailValid = await User.findOne({ email });
  if (!email) {
    return res.status(400).json({
      status: 'error',
      data: {
        message: 'Please provide email'
      }
    });
  }

  if (!isEmailValid)
    return res.status(400).json({
      status: 'error',
      data: {
        message: 'No user present with the email'
      }
    });

  const otp = common.generateOTP();
  const now = new Date();
  const expiresAt = common.addMinutesToDate(now, 3);
  const otpData = new OTP({ email, otp, expiresAt });
  const newOtp = await otpData.save();

  new EmailNotification().sendEmail({
    email: email,
    subject: 'OTP',
    message: `OTP: ${otp}`
  });
  res.status(200).json({
    status: 'success',
    data: {
      email,
      expiresAt,
      otpId: newOtp._id
    }
  });
});

// Verify OTP
exports.verifyOTP = asyncError(async (req, res) => {
  const { email, otp, otpId } = req.body;

  if (!email || !otp) {
    return res.status(400).json({
      status: 'error',
      data: {
        message: 'Please provide email and otp'
      }
    });
  }

  const otpData = await OTP.findOne({
    _id: otpId
  });

  if (!otpData) {
    return res.status(400).json({
      status: 'error',
      data: {
        message: 'Bad Request'
      }
    });
  }

  // Check if otp already used
  if (otpData.isVerified) {
    return res.status(400).json({
      status: 'error',
      data: {
        message: 'OTP Already Used'
      }
    });
  }

  const currentTime = new Date();
  // Check if otp is expired or not
  if (currentTime > new Date(otpData.expiresAt)) {
    return res.status(400).json({
      status: 'error',
      data: {
        message: 'OTP Expired'
      }
    });
  }

  // Check if otp is equal to OTP in the db
  if (otp !== otpData.otp) {
    return res.status(400).json({
      status: 'error',
      data: {
        message: 'OTP Not Matched'
      }
    });
  }

  otpData.isVerified = true;
  await otpData.save();

  res.status(200).json({ status: 'success', data: { message: 'OTP Matched' } });
});

exports.getAllInvitedUsers = factory.getAll(Invite, USER_INVITE_KEY);
