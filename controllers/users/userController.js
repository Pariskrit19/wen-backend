const { default: mongoose } = require('mongoose');
const User = require('../../models/users/userModel');
const asyncError = require('../../utils/asyncError');
const AppError = require('../../utils/appError');
const factory = require('../factoryController');
const EmailNotification = require('../../utils/email');
const Email = require('../../models/email/emailSettingModel');
const UserRole = require('../../models/users/userRoleModel');
const ActivityLogs = require('../../models/activityLogs/activityLogsModel');
const { LeaveQuarter } = require('../../models/leaves/leaveQuarter');
const LeaveTypes = require('../../models/leaves/leaveTypeModel');
const common = require('../../utils/common');
const {
  HRWENEMAIL,
  INFOWENEMAIL,
  POSITIONS,
  LEAVE_APPROVED,
  LEAVETYPES
} = require('../../utils/constants');
const UserLeave = require('../../models/leaves/UserLeavesModel');
const Notifications = require('../../models/notification/notificationModel');
const Leave = require('../../models/leaves/leaveModel');
const LeaveType = require('../../models/leaves/leaveTypeModel');
const UserPosition = require('../../models/users/userPositionModel');
const { USERS_KEY, encrypt, SALARY_REVIEW_KEY } = require('../../utils/crypto');

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
  const userPosition = await UserPosition.find({});

  const getUserName = (email) => {
    if (!email) {
      throw new AppError('please provide email', 400);
    }
    let usernameArr = email.split('@')[0].split('.');
    return usernameArr.length === 1
      ? usernameArr[0]
      : usernameArr[1] + usernameArr[0];
  };

  let importedUsers = [];

  const latestYearQuarter = await LeaveQuarter.findOne().sort({
    createdAt: -1
  });

  const currentQuarter = latestYearQuarter.quarters.find(
    (quarter) =>
      new Date(quarter.fromDate) <= new Date(common.todayDate()) &&
      new Date(common.todayDate()) <= new Date(quarter.toDate)
  );

  // req.body.forEach(async (user1)
  const usersToImport = req.body;
  for (let i = 0; i < req.body.length; i++) {
    const joinedQuarter = latestYearQuarter.quarters.find(
      (quarter) =>
        quarter.fromDate <=
          new Date(common.transformDate(usersToImport[i].joindate)) &&
        quarter.toDate >=
          new Date(common.transformDate(usersToImport[i].joindate))
    );

    // Joined Date Not In Any Quarters
    if (!joinedQuarter) {
      console.error(`Joined Date Invalid For ${usersToImport[i].name}`);
      return res.status(400).json({
        status: 'error',
        message: `Joined Date Invalid For ${usersToImport[i].name}`
      });
    }
    const user2 = {
      name: usersToImport[i].name,
      username: getUserName(usersToImport[i].email),
      email: usersToImport[i].email,
      password: 'test1234',
      passwordConfirm: 'test1234',
      photoUrl: null,
      status: 'Probation',
      active: usersToImport[i].active === 'TRUE',
      dob: usersToImport[i].dob ? new Date(usersToImport[i].dob) : new Date(),
      gender: usersToImport[i].gender,
      primaryPhone: +usersToImport[i].primaryphone || 123456,
      joinDate: common.transformDate(usersToImport[i].joindate),
      maritalStatus: usersToImport[i].maritalstatus,
      role: userRoles.find(
        (role) =>
          role.value.toLowerCase() === usersToImport[i].role.toLowerCase()
      )
        ? userRoles.find(
            (role) =>
              role.value.toLowerCase() === usersToImport[i].role.toLowerCase()
          )._id
        : userRoles.find((role) => role.value.toLowerCase() === 'subscriber')
            ._id,
      position:
        userPosition.find(
          (p) =>
            p.name.toLowerCase() === usersToImport[i].position.toLowerCase()
        ) &&
        userPosition.find(
          (p) =>
            p.name.toLowerCase() === usersToImport[i].position.toLowerCase()
        )._id
    };
    const user = new User(user2);
    await user.save();

    importedUsers.push(user);
    // update status change Date of user
    // await User.findByIdAndUpdate(
    //   user._id,
    //   { statusChangeDate: common.todayDate() },
    //   {
    //     new: true,
    //     runValidators: true
    //   }
    // );
    const userLeaveDoc = new UserLeave({
      user: user._id,
      fiscalYear: latestYearQuarter.fiscalYear,
      remainingSickLeaves: 0,
      remainingCasualLeaves: 0,
      carriedOverLeaves: 0,
      leaveDeductionBalance: 0,
      leaves: latestYearQuarter.quarters.map((quarter) => ({
        quarter: quarter,

        approvedLeaves: {
          sickLeaves: 0,
          casualLeaves: 0
        },
        allocatedLeaves:
          joinedQuarter._id.toString() === quarter._id.toString()
            ? common.getNumberOfMonthsInAQuarter(
                quarter.toDate,
                new Date(user.joinDate)
              )
            : common.getNumberOfMonthsInAQuarter(
                !currentQuarter ? quarter.toDate : currentQuarter.toDate,
                !currentQuarter ? quarter.fromDate : currentQuarter.fromDate
              ),
        remainingLeaves:
          joinedQuarter._id.toString() === quarter._id.toString()
            ? common.getNumberOfMonthsInAQuarter(
                quarter.toDate,
                new Date(user.joinDate)
              )
            : common.getNumberOfMonthsInAQuarter(
                !currentQuarter ? quarter.toDate : currentQuarter.toDate,
                !currentQuarter ? quarter.fromDate : currentQuarter.fromDate
              )
      }))
    });
    await userLeaveDoc.save();
  }
  res.status(200).json({
    status: 'success',
    data: {
      message: 'Users Imported.',
      users: importedUsers
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

      if (new Date(x.dob).getMonth() === 0) {
        return (
          new Date(x.dob) >= new Date(`${dobYear}/${1}/1`) &&
          new Date(x.dob) < new Date(`${dobYear}/${1}/15`)
        );
      }
      return (
        new Date(x.dob) >=
          new Date(`${dobYear}/${currentDate.getMonth() + 1}/15`) &&
        new Date(x.dob) <= new Date(`${dobYear}/${12}/31`)
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

      if (new Date(x.dob).getMonth() === 11) {
        return (
          new Date(x.dob) >= new Date(`${dobYear}/${12}/15`) &&
          new Date(x.dob) <= new Date(`${dobYear}/${12}/31`)
        );
      }
      return (
        new Date(x.dob) >= new Date(`${dobYear}/${1}/1`) &&
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

    let DOB = '';

    if (currentDate.getMonth() === 11 && new Date(user.dob).getMonth() === 0) {
      DOB = [currentDate.getFullYear() + 1, ...formattedDob.slice(1)].join('-');
    } else if (
      currentDate.getMonth() === 0 &&
      new Date(user.dob).getMonth() === 11
    ) {
      DOB = [currentDate.getFullYear() - 1, ...formattedDob.slice(1)].join('-');
    } else {
      DOB = [currentDate.getFullYear(), ...formattedDob.slice(1)].join('-');
    }

    return {
      _id: user._id,
      name: user.name,
      photoURL: user.photoURL,
      dob: DOB
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

  const { user, days } = req.query;

  const conditions = [
    {
      active: { $eq: true }
    }
  ];

  if (user) {
    conditions.push({ _id: mongoose.Types.ObjectId(user) });
  }

  const newSalaryReviewDate =
    days && !Number.isNaN(+days)
      ? {
          $gte: presentDate,
          $lte: new Date(
            presentDate.getTime() + parseInt(days, 10) * 24 * 60 * 60 * 1000
          )
        }
      : {
          $gte: presentDate
        };

  // get Users with salary review time before 3 months
  const users = await User.aggregate([
    {
      $match: { $and: conditions }
    },
    {
      $addFields: {
        pastReviewDate: { $arrayElemAt: ['$lastReviewDate', -1] }
      }
    },
    {
      $set: {
        newSalaryReviewDate: {
          $dateAdd: {
            startDate: '$pastReviewDate',
            unit: 'year',
            amount: 1
          }
        }
      }
    },
    {
      $match: {
        newSalaryReviewDate
      }
    },
    {
      $project: {
        _id: 1,
        name: 1,
        newSalaryReviewDate: 1,
        lastReviewDate: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        users: users
      },
      SALARY_REVIEW_KEY
    )
  });
});

const getLeavesOfNewFiscalYear = async (quarter) => {
  const leaveTypes = await LeaveType.find({
    name: { $in: [LEAVETYPES.casualLeave, LEAVETYPES.sickLeave] }
  });

  return Leave.aggregate([
    {
      $unwind: '$leaveDates'
    },
    {
      $match: {
        leaveDates: {
          $gte: new Date(quarter.fromDate)
        },
        leaveStatus: LEAVE_APPROVED,
        $or: [
          { leaveType: { $eq: leaveTypes[0]._id } },
          { leaveType: { $eq: leaveTypes[1]._id } }
        ]
      }
    },
    {
      $lookup: {
        from: 'leave_types',
        localField: 'leaveType',
        foreignField: '_id',
        as: 'leaveType'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user'
      }
    },
    {
      $set: {
        leaveType: {
          $arrayElemAt: ['$leaveType', 0]
        },
        user: {
          $arrayElemAt: ['$user', 0]
        }
      }
    },
    {
      $group: {
        _id: '$user._id',
        casualLeaves: {
          $sum: {
            $cond: [
              { $eq: ['$leaveType.name', LEAVETYPES.casualLeave] },
              { $cond: [{ $eq: ['$halfDay', ''] }, 1, 0.5] },
              0
            ]
          }
        },
        sickLeaves: {
          $sum: {
            $cond: [
              { $eq: ['$leaveType.name', LEAVETYPES.sickLeave] },
              { $cond: [{ $eq: ['$halfDay', ''] }, 1, 0.5] },
              0
            ]
          }
        }
      }
    }
  ]);
};

// Reset Allocated Leaves of all co-workers
exports.resetAllocatedLeaves = asyncError(async (req, res, next) => {
  const todayDate = common.todayDate();

  const quarters = await LeaveQuarter.find()
    .sort({
      createdAt: -1
    })
    .limit(1);

  const isUserLeaveAlreadyCreated = await UserLeave.findOne(
    {
      fiscalYear: quarters[0].fiscalYear
    },
    ''
  );

  const currentQuarter = quarters[0].quarters.find(
    (quarter) =>
      new Date(quarter.fromDate) <= new Date(todayDate) &&
      new Date(todayDate) <= new Date(quarter.toDate)
  );

  const allUsers = await User.find({ active: true });
  if (isUserLeaveAlreadyCreated && !req.isQuarterCreated) {
    const numberOfMonthsInAQuarter = common.getNumberOfMonthsInAQuarter(
      currentQuarter.toDate,
      currentQuarter.fromDate
    );
    await Promise.all(
      allUsers.map(async (user) => {
        let carriedOverLeaves = 0;
        let quarterRemainingLeaves =
          user.position && user.position.name === POSITIONS.intern
            ? numberOfMonthsInAQuarter
            : currentQuarter.leaves;
        const isOnProbation = POSITIONS.probation === user.status;

        const doc = await UserLeave.findOne({
          user: user._id,
          fiscalYear: quarters[0].fiscalYear
        });
        const currentQuarterIndex = doc.leaves.findIndex((leave) =>
          leave.quarter._id.equals(currentQuarter._id)
        );

        const previousQuarterRemainingLeaves = doc.leaves[
          currentQuarterIndex - 1
        ]
          ? doc.leaves[currentQuarterIndex - 1].remainingLeaves
          : 0;
        // when remaining leaves is left in previous quarter and is not intern
        if (
          previousQuarterRemainingLeaves > 0 &&
          user.position &&
          user.position.name !== POSITIONS.intern
        ) {
          quarterRemainingLeaves = isOnProbation
            ? previousQuarterRemainingLeaves +
              numberOfMonthsInAQuarter +
              doc.leaves[currentQuarterIndex].carriedOverLeaves
            : previousQuarterRemainingLeaves +
              doc.leaves[currentQuarterIndex].allocatedLeaves +
              doc.leaves[currentQuarterIndex].carriedOverLeaves;

          carriedOverLeaves =
            previousQuarterRemainingLeaves +
            doc.leaves[currentQuarterIndex].carriedOverLeaves;
        }

        const currentQuarterLeaveDetails = {
          ...doc.leaves[currentQuarterIndex],
          remainingLeaves:
            quarterRemainingLeaves -
            (doc.leaves[currentQuarterIndex].approvedLeaves.sickLeaves +
              doc.leaves[currentQuarterIndex].approvedLeaves.casualLeaves),
          allocatedLeaves: isOnProbation
            ? numberOfMonthsInAQuarter
            : doc.leaves[currentQuarterIndex].allocatedLeaves,
          carriedOverLeaves
        };

        doc.leaves = quarters[0].quarters.map((quarter, index) =>
          index === currentQuarterIndex
            ? currentQuarterLeaveDetails
            : doc.leaves[index]
        );

        await doc.save();

        if (POSITIONS.probation !== user.status) {
          await Notifications.create({
            showTo: user._id,
            module: 'Leave',
            remarks: `Your quarterly leave has been updated.`
          });
        }
      })
    );
  } else {
    const numberOfMonthsInAQuarter = common.getNumberOfMonthsInAQuarter(
      quarters[0].quarters[0].toDate,
      quarters[0].quarters[0].fromDate
    );
    const leaves = await getLeavesOfNewFiscalYear(quarters[0].quarters[0]);

    const leaveTypes = await LeaveType.find();

    const sickLeave = leaveTypes.find(
      (type) => type.name === LEAVETYPES.sickLeave
    );
    const causalLeave = leaveTypes.find(
      (type) => type.name === LEAVETYPES.casualLeave
    );

    allUsers.forEach(async (user) => {
      const isOnProbation = POSITIONS.probation === user.status;
      const userLeaves = leaves.find(
        (leave) => leave._id.toString() === user._id.toString()
      );
      const sickLeaves =
        userLeaves && userLeaves.sickLeaves ? userLeaves.sickLeaves : 0;
      const casualLeaves =
        userLeaves && userLeaves.casualLeaves ? userLeaves.casualLeaves : 0;

      const userLeave = new UserLeave({
        user: user._id,
        fiscalYear: quarters[0].fiscalYear,
        remainingSickLeaves: sickLeave.leaveDays - sickLeaves,
        remainingCasualLeaves: causalLeave.leaveDays - casualLeaves,
        leaves: quarters[0].quarters.map((quarter) => ({
          approvedLeaves: {
            sickLeaves,
            casualLeaves
          },
          allocatedLeaves: isOnProbation
            ? numberOfMonthsInAQuarter
            : quarter.leaves,
          remainingLeaves: isOnProbation
            ? numberOfMonthsInAQuarter
            : quarter.leaves - sickLeaves - casualLeaves,
          carriedOverLeaves: 0,
          leaveDeductionBalance: 0,
          quarter: quarter
        }))
      });
      await userLeave.save();
      if (POSITIONS.probation !== user.status) {
        await Notifications.create({
          showTo: user._id,
          module: 'Leave',
          remarks: `Your quarterly leave has been updated.`
        });
      }
    });
  }

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
      data: req.isQuarterCreated
        ? req.quarters
        : 'Reset Allocated Leaves Successfull'
    }
  });
});

exports.getUser = factory.getOne(User);
exports.getAllUsers = factory.getAll(User, USERS_KEY);
exports.updateUser = factory.updateOne(User, ActivityLogs, 'User');
exports.deleteUser = factory.deleteOne(User);
