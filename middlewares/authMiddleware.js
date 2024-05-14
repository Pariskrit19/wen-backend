const { promisify } = require('util');
const jwt = require('jsonwebtoken');

const asyncError = require('../utils/asyncError');
const AppError = require('../utils/appError');
const User = require('../models/users/userModel');
const UserRole = require('../models/users/userRoleModel');

/**
 * Protect route based on the user exist
 */
exports.protect = asyncError(async (req, res, next) => {
  // Getting token and check of it's there
  let token;
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (!token) {
    return next(
      new AppError('You are not logged in! Please log in to get access.', 401)
    );
  }

  // Verification token
  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  // Check if user still exists
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(
      new AppError(
        'The user belonging to this token does no longer exist.',
        401
      )
    );
  }

  // Check if user changed password after the token was issued
  // if (currentUser.changedPasswordAfter(decoded.iat)) {
  //   return next(
  //     new AppError('User recently changed password! Please log in again.', 401)
  //   );
  // }

  // Grant access to protected routes
  if (!currentUser.active) {
    return next(new AppError('Account is deactivated', 401));
  }
  req.user = currentUser;

  // Check user role and assign role key to current user object to check for permission
  if (req.user.role) {
    const userRole = await UserRole.findById(req.user.role);
    req.user.roleKey = userRole.key;
  }

  next();
});

/**
 * Check role for the permission
 */
exports.restrictTo =
  (...roles) =>
  (req, res, next) => {
    if (!roles.includes(req.user.roleKey)) {
      return next(
        new AppError('You do not have permission to perform this action', 403)
      );
    }

    next();
  };

// Set user id for the nested routes via params
exports.setUserIdForNestedRoutes = (req, res, next) => {
  if (!req.params.userId) {
    req.body.user = req.user.id;
  } else {
    req.body.user = req.params.userId;
  }
  next();
};

exports.checkUserIP = (req, res, next) => {
  let ip = req.header('x-forwarded-for') || req.connection.remoteAddress;
  ip = ip.split(`:`).pop();
  if (ip !== '202.166.207.19') {
    return next(
      new AppError(
        'You do not have permission to perform this action due to IP restriction.',
        403
      )
    );
  }

  next();
};

exports.checkTeamAccess = (req, res, next) => {
  const teamAccess = req.header('x-team-access');
  if (teamAccess !== process.env.TEAM_ACCESS_KEY) {
    return next(
      new AppError('You do not have permission to perform this action.', 403)
    );
  }

  next();
};

exports.checkIfValueToDeleteIsUsed =
  (Model, key, messageKey) => async (req, res, next) => {
    const datasUsingValue = await Model.find({ [key]: req.params.id });
    if (datasUsingValue.length > 0)
      return next(
        new AppError(`Cannot delete ${messageKey} while it is being used`, 403)
      );

    next();
  };
