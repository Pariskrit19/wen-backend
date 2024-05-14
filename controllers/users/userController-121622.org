const User = require('../../models/users/userModel');
const asyncError = require('../../utils/asyncError');
const AppError = require('../../utils/appError');
const factory = require('../factoryController');
const EmailNotification = require('../../utils/email');
const Email = require('../../models/email/emailSettingModel');
const UserRole = require('../../models/users/userRoleModel');
const ActivityLogs = require('../../models/activityLogs/activityLogsModel');
const LeaveQuarter = require('../../models/leaves/leaveQuarter');

const { HRWENEMAIL, INFOWENEMAIL } = require('../../utils/constants');

// Compare two object and keep allowed fields to be updated
const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// Middleware to assign current logged in user id to params
exports.getMe = (req, res, next) => {
  req.params.id = req.user.id;
  next();
};

// Update current user
exports.updateMe = asyncError(async (req, res, next) => {
  // Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please use /updateMyPassword.',
        400
      )
    );
  }

  // Filtered out fields names that are allowed to be updated
  const filteredBody = filterObj(
    req.body,
    'name',
    'dob',
    'gender',
    'primaryPhone',
    'secondaryPhone',
    'joinDate',
    'maritalStatus',
    'photoURL'
  );

  // Update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredBody, {
    new: true,
    runValidators: true
  });

  res.status(200).json({
    status: 'success',
    data: {
      user: updatedUser
    }
  });
});

// Delete current user
exports.deleteMe = asyncError(async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    message: null
  });
});

// Disable selected user
exports.disableUser = asyncError(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(req.params.id, { active: false });

  const emailContent = await Email.findOne({ module: 'user-inactive' });

  const message = `<b><em>${user.name}</em> is disabled from on.</b>`;

  new EmailNotification().sendEmail({
    email: [INFOWENEMAIL, HRWENEMAIL],
    subject:
      emailContent.title.replace(/@username/i, user.name) ||
      'User was disabled',
    message: emailContent.body.replace(/@username/i, user.name) || message
  });

  ActivityLogs.create({
    status: 'updated',
    module: 'User',
    activity: `${req.user.name} made User (${user.name}) inactive`,
    user: {
      name: req.user.name,
      photo: req.user.photoURL
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      message: 'User disabled.',
      data: user
    }
  });
});

// Import users
exports.importUsers = asyncError(async (req, res, next) => {
  const userRoles = await UserRole.find({});

  const tranformDate = (date) => {
    date = date.toString();
    return `${date[0]}${date[1]}${date[2]}${date[3]}-${date[4]}${date[5]}-${date[6]}${date[7]}`;
  };

  const users = req.body.map((user) => ({
    name: user.name,
    username: user.username,
    email: user.email,
    password: user.password,
    photoUrl: null,
    status: 'Permanent',
    allocatedLeaves: {
      firstQuarter: 4,
      secondQuarter: 4,
      thirdQuarter: 4,
      fourthQuarter: 3
    },
    active: user.active === 'TRUE',
    dob: user.dob ? new Date(tranformDate(user.dob)) : new Date(),
    gender: user.gender,
    primaryPhone: user.primaryPhone || 123456,
    joinDate: user.joinDate
      ? new Date(tranformDate(user.joinDate))
      : new Date(),
    maritalStatus: user.maritalStatus,
    role:
      userRoles.find((role) => role.key === user.role)._id ||
      userRoles.find((role) => role.key === 'subscriber')._id
  }));
  await User.insertMany([...users], { lean: true });

  res.status(200).json({
    status: 'success',
    data: {
      message: 'Users Imported.'
    }
  });
});

// Get all ative users count
exports.getActiveUser = asyncError(async (req, res, next) => {
  const user = await User.find({ active: { $ne: false } }).count();

  res.status(200).json({
    status: 'success',
    data: {
      user
    }
  });
});

// get users between 15 of this month to 14 of next month
exports.getBirthMonthUser = asyncError(async (req, res, next) => {
  const currentDate = new Date();

  const activeUsers = await User.find({ active: { $ne: false } });

  let birthMonthUsers = [];

  if (currentDate.getMonth() === 11) {
    birthMonthUsers = activeUsers.filter((x) => {
      const dobYear = new Date(x.dob).getFullYear();

      if (currentDate.getDate() < 15) {
        return (
          new Date(x.dob) >=
            new Date(`${dobYear}/${currentDate.getMonth()}/15`) &&
          new Date(`${dobYear}/${currentDate.getMonth() + 1}/15`) >
            new Date(x.dob)
        );
      }
      return (
        new Date(x.dob) >=
          new Date(`${dobYear}/${currentDate.getMonth() + 1}/15`) &&
        new Date(x.dob) < new Date(`${dobYear + 1}/${1}/15`) > new Date(x.dob)
      );
    });
  } else if (currentDate.getMonth() === 0) {
    birthMonthUsers = activeUsers.filter((x) => {
      const dobYear = new Date(x.dob).getFullYear();

      if (currentDate.getDate() > 14) {
        return (
          new Date(x.dob) >=
            new Date(`${dobYear}/${currentDate.getMonth() + 1}/15`) &&
          new Date(x.dob) <
            new Date(`${dobYear}/${currentDate.getMonth() + 2}/15`)
        );
      }
      return (
        new Date(x.dob) >= new Date(`${dobYear - 1}/${12}/15`) &&
        new Date(x.dob) <
          new Date(`${dobYear}/${currentDate.getMonth() + 1}/15`)
      );
    });
  } else if (currentDate.getMonth() === 1) {
    birthMonthUsers = activeUsers.filter((x) => {
      const dobYear = new Date(x.dob).getFullYear();

      if (currentDate.getDate() > 14) {
        return (
          new Date(x.dob) >=
            new Date(`${dobYear}/${currentDate.getMonth() + 1}/15`) &&
          new Date(x.dob) <
            new Date(`${dobYear}/${currentDate.getMonth() + 2}/15`)
        );
      }
      return (
        new Date(x.dob) >= new Date(`${dobYear}/${1}/15`) &&
        new Date(x.dob) <
          new Date(`${dobYear}/${currentDate.getMonth() + 1}/15`)
      );
    });
  } else {
    birthMonthUsers = activeUsers.filter((x) => {
      const dobYear = new Date(x.dob).getFullYear();

      if (currentDate.getDate() > 14) {
        return (
          new Date(x.dob) >=
            new Date(`${dobYear}/${currentDate.getMonth() + 1}/15`) &&
          new Date(x.dob) <
            new Date(`${dobYear}/${currentDate.getMonth() + 2}/15`)
        );
      }
      return (
        new Date(x.dob) >=
          new Date(`${dobYear}/${currentDate.getMonth()}/15`) &&
        new Date(x.dob) <
          new Date(`${dobYear}/${currentDate.getMonth() + 1}/15`)
      );
    });
  }

  birthMonthUsers = birthMonthUsers.map((user) => {
    const formattedDob = user.dob.toISOString().split('-');
    return {
      _id: user._id,
      name: user.name,
      photoURL: user.photoURL,
      dob: [currentDate.getFullYear(), ...formattedDob.slice(1)].join('-')
    };
  });

  res.status(200).json({
    status: 'success',
    data: {
      users: birthMonthUsers
    }
  });
});

// get users for review of salary

exports.getSalarayReviewUsers = asyncError(async (req, res, next) => {
  const presentDate = new Date();

  // get Users with salary review time before 3 months
  const users = await User.aggregate([
    {
      $set: {
        newSalaryReviewDate: {
          $dateAdd: {
            startDate: '$lastReviewDate',
            unit: 'year',
            amount: 1
          }
        }
      }
    },
    {
      $match: {
        $and: [
          { newSalaryReviewDate: { $gte: presentDate } },
          {
            newSalaryReviewDate: {
              $lte: new Date(presentDate.getTime() + 90 * 24 * 60 * 60 * 1000)
            }
          }
        ]
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        newSalaryReviewDate: 1,
        lastReviewDate: 1,
        photoURL: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      users: users
    }
  });
});

// Reset Allocated Leaves of all co-workers
exports.resetAllocatedLeaves = asyncError(async (req, res, next) => {
  const { currentQuarter } = req.body;

  const quarters = await LeaveQuarter.find().sort({
    createdAt: -1
  });

  let user = null;

  user = await User.updateMany({}, [
    {
      $set: {
        'allocatedLeaves.firstQuarter': {
          $switch: {
            branches: [
              {
                case: { $eq: ['firstQuarter', currentQuarter] },
                then: quarters[0][currentQuarter].leaves
              }
            ],
            default: '$allocatedLeaves.firstQuarter'
          }
        },
        'allocatedLeaves.secondQuarter': {
          $switch: {
            branches: [
              {
                case: { $eq: ['secondQuarter', currentQuarter] },
                then: quarters[0][currentQuarter].leaves
              }
            ],
            default: '$allocatedLeaves.secondQuarter'
          }
        },
        'allocatedLeaves.thirdQuarter': {
          $switch: {
            branches: [
              {
                case: { $eq: ['thirdQuarter', currentQuarter] },
                then: quarters[0][currentQuarter].leaves
              }
            ],
            default: '$allocatedLeaves.thirdQuarter'
          }
        },
        'allocatedLeaves.fourthQuarter': {
          $switch: {
            branches: [
              {
                case: { $eq: ['fourthQuarter', currentQuarter] },
                then: quarters[0][currentQuarter].leaves
              }
            ],
            default: '$allocatedLeaves.fourthQuarter'
          }
        }
      }
    }
  ]);

  ActivityLogs.create({
    status: 'updated',
    module: 'User',
    activity: `${req.user.name} updated Allocated Leaves of all Co-workers`,
    user: {
      name: req.user.name,
      photo: req.user.photoURL
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      data: user
    }
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User);
exports.updateUser = factory.updateOne(User, ActivityLogs, 'User');
exports.deleteUser = factory.deleteOne(User);
