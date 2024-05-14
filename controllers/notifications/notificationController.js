const Notifications = require('../../models/notification/notificationModel');
const APIFeatures = require('../../utils/apiFeatures');
const asyncError = require('../../utils/asyncError');
const Holidays = require('../../models/resources/holidayModel');
const { yesterdayDate, todayDate } = require('../../utils/common');
const Attendance = require('../../models/attendances/attendanceModel');
const User = require('../../models/users/userModel');
const Leave = require('../../models/leaves/leaveModel');
const Configurations = require('../../models/configurations/configurationsModel');
const { LEAVE_APPROVED } = require('../../utils/constants');

exports.getAllNotifications = asyncError(async (req, res, next) => {
  const { role, userId, joinDate } = req.query;
  const features = new APIFeatures(
    Notifications.find({
      showTo: {
        $in: [role, userId]
      },
      createdAt: { $gte: joinDate }
    }).sort('-name'),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .search();

  const [doc, count] = await Promise.all([
    features.query,
    Notifications.countDocuments({
      ...features.formattedQuery,
      showTo: {
        $in: [role, userId]
      },
      createdAt: { $gte: joinDate }
    })
  ]);
  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: {
      data: doc,
      count
    }
  });
});

//get all notification excluding deleted-notifications
exports.getNotDeletedNotifications = asyncError(async (req, res, next) => {
  const { role, userId, joinDate } = req.query;

  const features = new APIFeatures(
    Notifications.find({
      showTo: {
        $in: [role, userId]
      },
      createdAt: { $gte: joinDate },
      deletedFor: { $not: { $elemMatch: { userId: userId } } }
    }).sort('-name'),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .search();
  const doc = await features.query;
  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: {
      data: doc
    }
  });
});

exports.deleteNotification = asyncError(async (req, res, next) => {
  await Notifications.deleteMany({
    createdAt: {
      $lte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      data: 'Sucessfully deleted Activity Logs '
    }
  });
});

//to delete a notification by the user.
exports.deleteSingleNotification = asyncError(async (req, res, next) => {
  const { notificationId, role, userId } = req.query;
  await Notifications.findOneAndUpdate(
    {
      _id: notificationId,
      showTo: {
        $in: [role, userId]
      }
    },
    {
      $push: { deletedFor: { userId: userId, deletedAt: new Date() } }
    },
    {
      new: true
    }
  );
  res.status(200).json({
    status: 'success',
    data: {
      message: 'Notification deleted successfully. '
    }
  });
});

exports.updateNotification = asyncError(async (req, res, next) => {
  const updatedActivities = await Notifications.updateMany(
    { _id: { $in: req.body.activities } },
    { $push: { viewedBy: req.body.user } },
    { new: true }
  );
  res.status(200).json({
    status: 'success',
    data: {
      data: updatedActivities
    }
  });
});

//create notification for users
exports.createNotification = asyncError(async (req, res, next) => {
  const data = await Notifications.create(req.body);
  res.status(200).json({
    status: 'success',
    data: {
      data
    }
  });
});

exports.notifyToApplyLeave = asyncError(async (req, res, next) => {
  const configuratons = await Configurations.findOne();

  if (configuratons.SendLeaveApplyNotification === false) {
    res.status(200).json({
      status: 'success',
      data: {
        data: 'success'
      }
    });
    return;
  }

  const holidays = await Holidays.findOne().sort({ createdAt: -1 }).limit(1);
  const holidayList = holidays.holidays.map((holiday) => holiday.date);

  // check if today is holiday/weekends and don't send any notifications
  if (
    [0, 6].includes(todayDate().getDay()) ||
    holidayList.includes(todayDate())
  ) {
    res.status(200).json({
      status: 'success',
      data: {
        data: 'success'
      }
    });
    return;
  }

  // check previous last working day

  // check if a date is a holiday
  function isHoliday(date) {
    return holidayList.includes(date);
  }

  // check if a date is a weekend day (Saturday or Sunday)
  function isWeekend(date) {
    const currentDate = new Date(date);
    return currentDate.getDay() === 0 || currentDate.getDay() === 6;
  }

  // recursive function to check if a date is a holiday or weekend
  function getWorkingDate(date) {
    // base case: if date is neither a holiday nor a weekend, return date
    if (!isHoliday(date) && !isWeekend(date)) {
      return new Date(date);
    }

    // recursive case: if date is a holiday or a weekend, check the previous day
    const previousDay = yesterdayDate(date);
    return getWorkingDate(previousDay);
  }

  const previousWorkingDate = getWorkingDate(yesterdayDate());
  const attendance = await Attendance.aggregate([
    {
      $match: {
        $and: [{ attendanceDate: { $eq: previousWorkingDate } }]
      }
    }
  ]);

  const userWithAttendance = attendance.map((att) => att.user.toString());

  const Users = await User.find({ active: { $ne: false } });

  // filter users with no previous's working day punch
  const previousWorkingDayNoPunchUser = Users.filter(
    (user) => !userWithAttendance.includes(user._id.toString())
  );

  const previousWorkingDayPunchUser = Users.filter((user) =>
    userWithAttendance.includes(user._id.toString())
  );

  previousWorkingDayNoPunchUser.forEach(async (user) => {
    const leave = await Leave.find({
      user: user._id,
      leaveDates: {
        $elemMatch: {
          $eq: previousWorkingDate
        }
      },
      leaveStatus: LEAVE_APPROVED
    });

    const todayAttendance = await Attendance.find({
      user: user._id,
      attendanceDate: todayDate()
    });

    // send notification if previous working day  leaves not taken and punched in today
    if (
      leave &&
      leave.length === 0 &&
      todayAttendance &&
      todayAttendance.length !== 0
    ) {
      await Notifications.create({
        showTo: user._id,
        module: 'Leave',
        remarks: `You have not applied for Leave. Please apply !`,
        extraInfo: JSON.stringify({
          tab: '1'
        })
      });
    }
  });

  previousWorkingDayPunchUser.forEach(async (user) => {
    const yesterdayAttendance = await Attendance.find({
      user: user._id,
      attendanceDate: previousWorkingDate
    }).sort({ punchInTime: -1 });

    const todayAttendance = await Attendance.find({
      user: user._id,
      attendanceDate: todayDate()
    });
    const totalOfficeHour =
      yesterdayAttendance
        .filter((att) => att.punchOutTime)
        .map(
          (att) =>
            new Date(att.punchOutTime).getTime() -
            new Date(att.punchInTime).getTime()
        )
        .reduce((officeHour, hour) => officeHour + hour, 0) /
      (1000 * 3600);

    // send notification if yesterday's office hour is half or less than half of total office hours
    if (
      !user.isPartTime &&
      totalOfficeHour &&
      totalOfficeHour < configuratons.officeHour / 2 &&
      todayAttendance &&
      todayAttendance.length !== 0
    ) {
      await Notifications.create({
        showTo: user._id,
        module: 'Leave',
        remarks: `You have not applied for Leave. Please apply !`,
        extraInfo: JSON.stringify({
          tab: '1'
        })
      });
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      data: 'success'
    }
  });
});
