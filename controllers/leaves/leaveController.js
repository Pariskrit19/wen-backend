const mongoose = require('mongoose');
const Leave = require('../../models/leaves/leaveModel');
const factory = require('../factoryController');
const AppError = require('../../utils/appError');
const asyncError = require('../../utils/asyncError');
const common = require('../../utils/common');
const Email = require('../../models/email/emailSettingModel');
const {
  INFOWENEMAIL,
  HRWENEMAIL,
  LEAVE_CANCELLED,
  LEAVE_PENDING,
  LEAVE_APPROVED,
  LEAVE_REJECTED,
  USER_CANCELLED,
  POSITIONS
} = require('../../utils/constants');
const APIFeatures = require('../../utils/apiFeatures');
const { LEAVETYPES: leaveType } = require('../../utils/constants');
const User = require('../../models/users/userModel');
const EmailNotification = require('../../utils/email');
const ActivityLogs = require('../../models/activityLogs/activityLogsModel');
const UserLeave = require('../../models/leaves/UserLeavesModel');
const Attendance = require('../../models/attendances/attendanceModel');
const Holiday = require('../../models/resources/holidayModel');

exports.getLeave = factory.getOne(Leave);
exports.createLeave = factory.createOne(Leave, ActivityLogs, 'Leave');
exports.updateLeave = factory.updateOne(Leave, ActivityLogs, 'Leave');
exports.deleteLeave = factory.deleteOne(Leave, ActivityLogs, 'Leave');

exports.getAllLeaves = asyncError(async (req, res, next) => {
  const { fromDate, toDate } = req.query;
  const limitCount = parseInt(req.query.limit, 10) || 100;
  const page = parseInt(req.query.page, 10) || 1;
  const features = new APIFeatures(Leave.find({}), req.query)
    .filter()
    .sort()
    .limitFields()
    .search();

  const query =
    fromDate && toDate
      ? {
          leaveDates: { $gte: fromDate, $lte: toDate }
        }
      : {};
  const leaveDoc = await features.query.find(query);

  // Filter out leaves of inactive users and count active user leaves
  const activeUserLeaves = leaveDoc.filter((leave) => leave.user.active);
  const activeUserLeaveCount = activeUserLeaves.length;

  //paginate the filter leaves
  const startIndex = (page - 1) * limitCount;
  const paginatedLeaves = activeUserLeaves.slice(
    startIndex,
    startIndex + limitCount
  );

  res.status(200).json({
    status: 'success',
    results: paginatedLeaves.length,
    data: {
      data: paginatedLeaves,
      count: activeUserLeaveCount
    }
  });
});

// Update leave status of user for approve or cancel
exports.updateLeaveStatus = asyncError(async (req, res, next) => {
  const { leaveId, status } = req.params;
  const {
    remarks,
    reason,
    reapplyreason,
    leaveStatus: currentStatus
  } = req.body;
  const { fiscalYear, quarters } = req.fiscalYear;

  if (!leaveId || !status) {
    return next(new AppError('Missing leave ID or status in the route.', 400));
  }

  const leave = await Leave.findById(leaveId);

  if (!leave) {
    return next(new AppError('No leave found of the user.', 400));
  }

  let leaveStatus;
  const previousStatus = leave.leaveStatus;

  if (status === 'approve') {
    leaveStatus = LEAVE_APPROVED;
  } else if (status === 'cancel') {
    leaveStatus = LEAVE_CANCELLED;
  } else if (status === 'reject') {
    leaveStatus = LEAVE_REJECTED;
  } else if (status === 'pending') {
    leaveStatus = LEAVE_PENDING;
  } else if (status === 'user-cancel') {
    leaveStatus = USER_CANCELLED;
  } else {
    return next(
      new AppError('Please specify exact leave status in the route.', 400)
    );
  }

  if (previousStatus !== currentStatus) {
    return next(new AppError('Leave record has been modified. Please refresh'));
  }

  leave.remarks = remarks;
  leave.leaveStatus = leaveStatus;

  if (reason && status !== 'pending') {
    if (status === 'reject') {
      leave.rejectReason = reason;
    } else {
      leave.cancelReason = reason || leave.cancelReason;
    }
  }

  if (status === 'pending' && reapplyreason) {
    leave.reapplyreason = reapplyreason;
  }

  await leave.save();

  if (status === 'cancel' && leave.leaveType.name === 'Late Arrival') {
    const attendance = await Attendance.findOneAndUpdate(
      {
        user: leave.user._id,
        attendanceDate: leave.leaveDates[0],
        lateArrivalLeaveCut: true
      },
      {
        $set: {
          lateArrivalLeaveCut: false
        }
      }
    );
  }
  const user = await User.findOne({ _id: leave.user._id });
  if (
    [leaveType.casualLeave, leaveType.sickLeave].includes(leave.leaveType.name)
  ) {
    const userLeave = await UserLeave.findOne({
      fiscalYear: fiscalYear,
      user: leave.user._id
    });
    const isNotOnProbation =
      user.position.name !== POSITIONS.intern &&
      user.position.name !== POSITIONS.probation;

    let userLeaveToUpdate = [...userLeave.leaves],
      remainingCasualLeaves =
        userLeave.remainingCasualLeaves && userLeave.remainingCasualLeaves,
      remainingSickLeaves =
        userLeave.remainingSickLeaves && userLeave.remainingSickLeaves;

    if (status === 'approve') {
      if (leave.leaveDates.length === 1 && leave.halfDay === 'first-half') {
        const lateAttendanceUser = await Attendance.findOne({
          user: leave.user._id,
          isLateArrival: true,
          attendanceDate: leave.leaveDates[0]
        });
        if (lateAttendanceUser) {
          lateAttendanceUser.isLateArrival = false;
          await lateAttendanceUser.save();
        }
      }
      // update userLeave for each leave day taken of specififc quarter
      leave.leaveDates.forEach((l) => {
        const leaveTakenQuarter = quarters.find(
          (quarter) =>
            new Date(quarter.fromDate) <= new Date(l) &&
            new Date(l) <= new Date(quarter.toDate)
        );
        const isLeaveDateAfterPermanent =
          !user.statusChangeDate ||
          new Date(user.statusChangeDate) <= new Date(l);

        // LEAVE TYPE CASUAL IS IN THIS QUARTER THEN DEDUCT FROM REMAININGCASUALLEAVES
        if (
          leaveType.casualLeave === leave.leaveType.name &&
          leaveTakenQuarter &&
          isNotOnProbation &&
          isLeaveDateAfterPermanent
        )
          remainingCasualLeaves =
            remainingCasualLeaves - (leave.halfDay ? 0.5 : 1);
        // LEAVE TYPE SICK IS IN THIS QUARTER THEN DEDUCT FROM REMAININGSICKLEAVES
        if (
          leaveType.sickLeave === leave.leaveType.name &&
          leaveTakenQuarter &&
          isNotOnProbation &&
          isLeaveDateAfterPermanent
        )
          remainingSickLeaves = remainingSickLeaves - (leave.halfDay ? 0.5 : 1);

        const updateLeave = userLeaveToUpdate.map((x) => {
          // DEDUCT LEAVES ONLY IF LEAVE DATE IS AFTER USER JOIN DATE
          if (user.statusChangeDate && isLeaveDateAfterPermanent) {
            return leaveTakenQuarter &&
              x.quarter._id.toString() === leaveTakenQuarter._id.toString()
              ? {
                  ...JSON.parse(JSON.stringify(x)),
                  approvedLeaves: {
                    sickLeaves:
                      leaveType.sickLeave === leave.leaveType.name
                        ? leave.halfDay
                          ? x.approvedLeaves.sickLeaves + 0.5
                          : x.approvedLeaves.sickLeaves + 1
                        : x.approvedLeaves.sickLeaves,
                    casualLeaves:
                      leaveType.casualLeave === leave.leaveType.name
                        ? leave.halfDay
                          ? x.approvedLeaves.casualLeaves + 0.5
                          : x.approvedLeaves.casualLeaves + 1
                        : x.approvedLeaves.casualLeaves
                  },
                  remainingLeaves: leave.halfDay
                    ? x.remainingLeaves - 0.5
                    : x.remainingLeaves - 1
                }
              : x;
          }
          return (!user.statusChangeDate &&
            leaveTakenQuarter &&
            x.quarter._id.toString() === leaveTakenQuarter._id.toString()) ||
            (isLeaveDateAfterPermanent &&
              leaveTakenQuarter &&
              x.quarter._id.toString() === leaveTakenQuarter._id.toString())
            ? {
                ...JSON.parse(JSON.stringify(x)),
                approvedLeaves: {
                  sickLeaves:
                    leaveType.sickLeave === leave.leaveType.name
                      ? leave.halfDay
                        ? x.approvedLeaves.sickLeaves + 0.5
                        : x.approvedLeaves.sickLeaves + 1
                      : x.approvedLeaves.sickLeaves,
                  casualLeaves:
                    leaveType.casualLeave === leave.leaveType.name
                      ? leave.halfDay
                        ? x.approvedLeaves.casualLeaves + 0.5
                        : x.approvedLeaves.casualLeaves + 1
                      : x.approvedLeaves.casualLeaves
                },
                remainingLeaves: leave.halfDay
                  ? x.remainingLeaves - 0.5
                  : x.remainingLeaves - 1
              }
            : x;
        });

        userLeaveToUpdate = [...updateLeave];
      });
    }
    if (
      status === 'cancel' &&
      ['approved', 'user cancelled'].includes(previousStatus)
    ) {
      // update userLeave for each leave day taken of specififc quarter
      leave.leaveDates.forEach((l) => {
        const leaveTakenQuarter = quarters.find(
          (quarter) =>
            new Date(quarter.fromDate) <= new Date(l) &&
            new Date(l) <= new Date(quarter.toDate)
        );
        const isLeaveDateAfterPermanent =
          !user.statusChangeDate ||
          new Date(user.statusChangeDate) <= new Date(l);

        // LEAVE TYPE CASUAL AND IS IN THIS QUARTER THEN DEDUCT FROM REMAININGCASUALLEAVES
        if (
          leaveType.casualLeave === leave.leaveType.name &&
          leaveTakenQuarter &&
          isNotOnProbation &&
          isLeaveDateAfterPermanent
        )
          remainingCasualLeaves =
            remainingCasualLeaves + (leave.halfDay ? 0.5 : 1);
        // LEAVE TYPE SICK IS IN THIS QUARTER THEN DEDUCT FROM REMAININGSICKLEAVES
        if (
          leaveType.sickLeave === leave.leaveType.name &&
          leaveTakenQuarter &&
          isNotOnProbation &&
          isLeaveDateAfterPermanent
        )
          remainingSickLeaves = remainingSickLeaves + (leave.halfDay ? 0.5 : 1);

        const updateLeave = userLeaveToUpdate.map((x) => {
          if (user.statusChangeDate && isLeaveDateAfterPermanent) {
            return leaveTakenQuarter &&
              x.quarter._id.toString() === leaveTakenQuarter._id.toString()
              ? {
                  ...JSON.parse(JSON.stringify(x)),
                  approvedLeaves: {
                    sickLeaves:
                      leaveType.sickLeave === leave.leaveType.name
                        ? leave.halfDay
                          ? x.approvedLeaves.sickLeaves - 0.5
                          : x.approvedLeaves.sickLeaves - 1
                        : x.approvedLeaves.sickLeaves,
                    casualLeaves:
                      leaveType.casualLeave === leave.leaveType.name
                        ? leave.halfDay
                          ? x.approvedLeaves.casualLeaves - 0.5
                          : x.approvedLeaves.casualLeaves - 1
                        : x.approvedLeaves.casualLeaves
                  },
                  remainingLeaves: leave.halfDay
                    ? x.remainingLeaves + 0.5
                    : x.remainingLeaves + 1
                }
              : x;
          }
          return (!user.statusChangeDate &&
            leaveTakenQuarter &&
            x.quarter._id.toString() === leaveTakenQuarter._id.toString()) ||
            (isLeaveDateAfterPermanent &&
              leaveTakenQuarter &&
              x.quarter._id.toString() === leaveTakenQuarter._id.toString())
            ? {
                ...JSON.parse(JSON.stringify(x)),
                approvedLeaves: {
                  sickLeaves:
                    leaveType.sickLeave === leave.leaveType.name
                      ? leave.halfDay
                        ? x.approvedLeaves.sickLeaves - 0.5
                        : x.approvedLeaves.sickLeaves - 1
                      : x.approvedLeaves.sickLeaves,
                  casualLeaves:
                    leaveType.casualLeave === leave.leaveType.name
                      ? leave.halfDay
                        ? x.approvedLeaves.casualLeaves - 0.5
                        : x.approvedLeaves.casualLeaves - 1
                      : x.approvedLeaves.casualLeaves
                },
                remainingLeaves: leave.halfDay
                  ? x.remainingLeaves + 0.5
                  : x.remainingLeaves + 1
              }
            : x;
        });

        userLeaveToUpdate = [...updateLeave];
      });
    }

    userLeave.leaves = userLeaveToUpdate;
    userLeave.remainingCasualLeaves = remainingCasualLeaves;
    userLeave.remainingSickLeaves = remainingSickLeaves;
    await userLeave.save();
  }

  // update userLeave of a user

  if (status === 'pending') {
    await ActivityLogs.create({
      status: 'updated',
      module: 'Leave',
      activity: `${leave.user.name} reapplied Leave`,
      user: {
        name: req.user.name,
        photo: req.user.photoURL
      }
    });
  } else if (status === 'reject') {
    await common.sendPushNotification({
      to: user.pushToken,
      sound: 'default',
      title: 'Leave Rejected',
      body: reason,
      data: { type: 'leave' }
    });
    await ActivityLogs.create({
      status: 'updated',
      module: 'Leave',
      activity:
        req.user.name === leave.user.name
          ? `${req.user.name} rejected Leave`
          : `${req.user.name} rejected Leave of ${leave.user.name}`,
      user: {
        name: req.user.name,
        photo: req.user.photoURL
      }
    });
  } else {
    const isStatusApproved = status === 'approve';

    await common.sendPushNotification({
      to: user.pushToken,
      sound: 'default',
      title: isStatusApproved ? 'Leave Approved' : 'Leave Cancelled',
      body: isStatusApproved ? 'Enjoy your leave' : reason,
      data: { type: 'leave' }
    });

    await ActivityLogs.create({
      status: status === 'cancel' ? 'deleted' : 'updated',
      module: 'Leave',
      activity:
        req.user.name === leave.user.name
          ? `${req.user.name} ${
              isStatusApproved ? 'approved' : 'cancelled'
            } Leave`
          : `${req.user.name} ${
              isStatusApproved ? 'approved' : 'cancelled'
            } Leave of ${leave.user.name}`,
      user: {
        name: req.user.name,
        photo: req.user.photoURL
      }
    });
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: leave
    }
  });
});

// Calculate  applied leave days of a user of a year
exports.calculateLeaveDays = asyncError(async (req, res, next) => {
  const { currentFiscalYearStartDate, currentFiscalYearEndDate } =
    req.fiscalYear;
  const userId = mongoose.Types.ObjectId(req.params.userId);

  const leaveUser = await User.findById(req.params.userId);

  let startDate = currentFiscalYearStartDate;
  const isPermanentDateInThisFiscalYear =
    new Date(currentFiscalYearStartDate) <=
      new Date(leaveUser.statusChangeDate) &&
    new Date(leaveUser.statusChangeDate) <= new Date(currentFiscalYearEndDate);

  if (leaveUser.statusChangeDate && isPermanentDateInThisFiscalYear) {
    startDate = leaveUser.statusChangeDate;
  }

  const leaveCounts = await Leave.aggregate([
    {
      $unwind: '$leaveDates'
    },
    {
      $match: {
        user: userId,
        leaveStatus: { $in: ['approved', 'user cancelled'] },
        $and: [
          { leaveDates: { $gte: new Date(startDate) } },
          { leaveDates: { $lte: new Date(currentFiscalYearEndDate) } }
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
      $group: {
        _id: '$leaveType.name',
        leavesTaken: {
          $sum: {
            $cond: [{ $eq: ['$halfDay', ''] }, 1, 0.5]
          }
        }
      }
    },
    { $unwind: '$_id' }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: leaveCounts
    }
  });
});

// Get all users on leave today
exports.getUsersOnLeaveToday = asyncError(async (req, res, next) => {
  const todayDate = common.todayDate();

  const leave = await Leave.aggregate([
    {
      $unwind: '$leaveDates'
    },
    {
      $match: {
        leaveStatus: 'approved',
        leaveDates: { $eq: todayDate }
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
      $lookup: {
        from: 'leave_types',
        localField: 'leaveType',
        foreignField: '_id',
        as: 'leaveType'
      }
    },
    {
      $group: {
        _id: {
          user: '$user.name',
          leaveDates: '$leaveDates',
          leaveType: '$leaveType.name'
        }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      users: leave
    }
  });
});

// Get future approved/pending leaves
exports.getFutureLeaves = asyncError(async (req, res, next) => {
  const { todayDate } = req;

  const newLeaves = await Leave.aggregate([
    {
      $match: {
        leaveDates: {
          $elemMatch: {
            $gte: todayDate
          }
        },
        $or: [
          {
            leaveStatus: 'approved'
          },

          {
            leaveStatus: 'pending'
          }
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
      $match: {
        'user.active': true
      }
    },
    { $unwind: '$leaveDates' },
    {
      $match: {
        leaveDates: { $gte: todayDate },

        $or: [
          { 'user.exitDate': null },
          { 'user.exitDate': { $gte: '$leaveDate' } }
        ],
        $expr: {
          $and: [
            {
              $ne: [{ $dayOfWeek: '$leaveDates' }, 1] // Exclude Sundays (1)
            },
            {
              $ne: [{ $dayOfWeek: '$leaveDates' }, 7] // Exclude Saturdays (7)
            }
          ]
        }
      }
    },
    {
      $project: {
        _id: '$user._id',
        user: '$user.name',
        leaveDates: '$leaveDates',
        halfDay: '$halfDay',
        leaveType: '$leaveType.name',
        leaveStatus: '$leaveStatus',
        isSpecial: '$leaveType.isSpecial'
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      users: newLeaves
    }
  });
});

//get current day's leave
exports.getTodayLeaves = asyncError(async (req, res, next) => {
  const todayDate = common.todayDate();
  const newLeaves = await Leave.aggregate([
    {
      $match: {
        leaveStatus: 'approved',
        leaveDates: todayDate
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        as: 'user',
        pipeline: [
          {
            $project: {
              _id: 0,
              name: 1,
              photoURL: 1,
              active: 1
            }
          }
        ]
      }
    },
    {
      $match: {
        'user.active': true
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
      $project: {
        user: 1,
        leaveType: 1,
        leaveDates: 1,
        halfDay: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      users: newLeaves
    }
  });
});

// Delete selected leave dates of user
exports.deleteSelectedLeaveDate = asyncError(async (req, res, next) => {
  const leaveId = mongoose.Types.ObjectId(req.params.leaveId);
  const leaveDate = new Date(req.params.leaveDate);

  await Leave.findByIdAndUpdate(leaveId, {
    $pull: { leaveDates: leaveDate }
  });

  ActivityLogs.create({
    status: 'deleted',
    module: 'Leave',
    activity: `${req.user.name} deleted Leave Date : ${req.params.leaveDate}`,
    user: {
      name: req.user.name,
      photo: req.user.photoURL
    }
  });

  res.status(200).json({
    status: 'success',
    message: `Selected Leave Date : ${req.params.leaveDate} has been deleted.`
  });
});

// Filter leaves with search criteria
exports.filterExportLeaves = asyncError(async (req, res, next) => {
  const { fromDate, toDate, leaveStatus, user } = req.body;

  const matchConditions = [
    { leaveDates: { $gte: new Date(fromDate) } },
    { leaveDates: { $lte: new Date(toDate) } }
  ];

  if (user) {
    matchConditions.push({
      user: mongoose.Types.ObjectId(user)
    });
  }

  if (leaveStatus) {
    matchConditions.push({
      leaveStatus: leaveStatus
    });
  }

  const leave = await Leave.aggregate([
    {
      $match: {
        $and: matchConditions
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
      $lookup: {
        from: 'leave_types',
        localField: 'leaveType',
        foreignField: '_id',
        as: 'leaveType'
      }
    },
    {
      $group: {
        _id: {
          user: '$user.name',
          leaveDates: '$leaveDates',
          leaveType: '$leaveType.name',
          leaveStatus: '$leaveStatus',
          reason: '$reason'
        }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: leave
    }
  });
});

// Get pending leaves count
exports.getPendingLeavesCount = asyncError(async (req, res, next) => {
  const leaves = await Leave.find({ leaveStatus: { $eq: 'pending' } });
  const activeUserLeavePending = leaves.filter((leave) => leave.user.active);

  res.status(200).json({
    status: 'success',
    data: {
      leaves: activeUserLeavePending.length
    }
  });
});

// Get count of all users on leave today
exports.getUsersCountOnLeaveToday = asyncError(async (req, res, next) => {
  const todayDate = common.todayDate();

  const leaves = await Leave.aggregate([
    {
      $match: {
        leaveStatus: 'approved',
        leaveDates: todayDate
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
      $match: {
        'user.active': true
      }
    },
    {
      $group: {
        _id: '$user'
      }
    },
    {
      $count: 'count'
    }
  ]);

  res.status(200).json({
    status: 'success',
    leaves
  });
});

// get Fiscal year leaves
exports.getFiscalYearLeaves = asyncError(async (req, res, next) => {
  const { currentFiscalYearStartDate, currentFiscalYearEndDate } =
    req.fiscalYear;
  const leaveCounts = await Leave.aggregate([
    {
      $match: {
        leaveStatus: 'approved'
      }
    },
    {
      $unwind: '$leaveDates'
    },
    {
      $match: {
        $and: [
          { leaveDates: { $gte: new Date(currentFiscalYearStartDate) } },
          { leaveDates: { $lte: new Date(currentFiscalYearEndDate) } }
        ]
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
      $match: {
        'user.active': true
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
      $group: {
        _id: {
          id: '$_id',
          user: '$user.name',
          leaveType: '$leaveType.name',
          isSpecial: '$leaveType.isSpecial',
          leaveStatus: '$leaveStatus',
          reason: '$reason',
          halfDay: '$halfDay'
        },

        leaveDates: {
          $push: '$leaveDates'
        }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      data: leaveCounts
    }
  });
});

exports.sendLeaveApplyEmailNotifications = asyncError(
  async (req, res, next) => {
    const user = await User.findById(req.body.user);
    let isDateSerial = {};
    if (req.body.leaveDates.length > 3) {
      const holidays = await Holiday.find().sort('-createdAt').limit(1);
      isDateSerial = common.getRangeDates(
        req.body.leaveDates,
        holidays[0].holidays
      );
    }

    const dateToDisplay = isDateSerial.isRange
      ? isDateSerial.dates
          .toString()
          .split(',')
          .map((x) => `<span>${x.split('T')[0]}</span>`)
          .join(' - ')
      : req.body.leaveDates
          .toString()
          .split(',')
          .map((x) => `<p>${x.split('T')[0]}</p>`)
          .join('');

    const isHr = user.role.key === 'hr';
    const email = isHr ? [INFOWENEMAIL] : [INFOWENEMAIL, HRWENEMAIL];

    if (req.body.leaveStatus === LEAVE_PENDING) {
      const emailContent = await Email.findOne({ module: 'leave-pending' });

      const message = `<b><em>${user.name}</em>  applied for leave on dates ${req.body.leaveDates}</b>`;

      new EmailNotification().sendEmail({
        email,
        subject: !req.body.reapply
          ? emailContent.title.replace(/@username/i, user.name)
          : `${user.name}  re-applied for leave`,
        message:
          emailContent.body
            .replace(/@username/i, user.name)
            .replace(/@reason/i, req.body.leaveReason)
            .replace(/@leavetype/i, req.body.leaveType)
            .replace(/@date/i, dateToDisplay) || message
      });
    } else if (req.body.leaveStatus === USER_CANCELLED) {
      const emailContent = await Email.findOne({ module: 'user-leave-cancel' });

      new EmailNotification().sendEmail({
        email,
        subject:
          emailContent.title.replace(/@username/i, req.body.user.name) ||
          `${req.body.user.name} cancelled leave `,
        message:
          emailContent.body
            .replace(/@username/i, req.body.user.name)
            .replace(/@reason/i, req.body.userCancelReason || '')
            .replace(/@leavetype/i, req.body.leaveType)
            .replace(/@date/i, dateToDisplay) || 'Leave Cancelled'
      });
    } else if (req.body.leaveStatus === LEAVE_CANCELLED) {
      const emailContent = await Email.findOne({ module: 'leave-cancel' });

      new EmailNotification().sendEmail({
        email: [...email, req.body.user.email],
        subject:
          emailContent.title.replace(/@username/i, req.body.user.name) ||
          `${req.body.user.name}  leaves cancelled`,
        message:
          emailContent.body
            .replace(/@username/i, req.body.user.name)
            .replace(/@reason/i, req.body.leaveCancelReason || '')
            .replace(/@leavetype/i, req.body.leaveType)
            .replace(/@date/i, dateToDisplay) || 'Leave Cancelled'
      });
    } else if (req.body.leaveStatus === LEAVE_APPROVED) {
      const emailContent = await Email.findOne({ module: 'leave-approve' });

      new EmailNotification().sendEmail({
        email: [req.body.user.email],
        subject: emailContent.title || `${req.body.user.name}  leaves approved`,
        message: emailContent.body
          .replace(/@username/i, req.body.user.name)
          .replace(/@reason/i, req.body.leaveApproveReason || '')
      });
    } else if (req.body.leaveStatus === LEAVE_REJECTED) {
      const emailContent = await Email.findOne({ module: 'leave-reject' });

      new EmailNotification().sendEmail({
        email: [req.body.user.email],
        subject:
          emailContent.title.replace(/@username/i, req.body.user.name) ||
          `${req.body.user.name}  leaves rejected`,
        message: emailContent.body
          .replace(/@username/i, req.body.user.name)
          .replace(/@reason/i, req.body.leaveCancelReason || '')
          .replace(/@date/i, dateToDisplay)
      });
    }

    res.status(200).json({
      status: 'success'
    });
  }
);
