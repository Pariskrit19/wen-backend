const mongoose = require('mongoose');

const Attendance = require('../../models/attendances/attendanceModel');
const factory = require('../factoryController');
const AppError = require('../../utils/appError');
const asyncError = require('../../utils/asyncError');
const common = require('../../utils/common');
const Email = require('../../models/email/emailSettingModel');
const User = require('../../models/users/userModel');
const ActivityLogs = require('../../models/activityLogs/activityLogsModel');

const EmailNotification = require('../../utils/email');
const { HRWENEMAIL, INFOWENEMAIL } = require('../../utils/constants');
const {
  encrypt,
  LATE_ARRIVAL_KEY,
  ATTENDANCE_KEY
} = require('../../utils/crypto');
const Configurations = require('../../models/configurations/configurationsModel');

exports.getAttendance = factory.getOne(Attendance);
exports.getAllAttendances = factory.getAll(Attendance, ATTENDANCE_KEY);
exports.createAttendance = factory.createOne(
  Attendance,
  ActivityLogs,
  'Attendance'
);
exports.updateAttendance = factory.updateOne(
  Attendance,
  ActivityLogs,
  'Attendance'
);
exports.deleteAttendance = factory.deleteOne(Attendance);

// Update punch out time and mid day exit and notes
exports.updatePunchOutTime = asyncError(async (req, res, next) => {
  const reqBody = {
    midDayExit: req.body.midDayExit,
    punchOutTime: Date.now(),
    punchOutNote: req.body.punchOutNote,
    updatedBy: req.user.id,
    punchOutLocation: req.body.punchOutLocation,
    punchOutIp: req.body.punchOutIp
  };

  const doc = await Attendance.findByIdAndUpdate(req.params.id, reqBody, {
    new: true,
    runValidators: true
  });

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc
    }
  });
});

// office hour calculate
exports.calculateTotalUserOfficeHour = asyncError(async (req, res, next) => {
  const { fromDate, toDate, user, officehour } = req.query;

  const totalhourCondition = {};

  if (officehour) {
    let officeHourQuery = JSON.stringify(req.query.officehour).replace(
      /\b(gte|gt|lte|lt|eq)\b/g,
      (match) => `$${match}`
    );
    officeHourQuery = JSON.parse(officeHourQuery);
    const op = Object.keys(officeHourQuery)[0];
    totalhourCondition[op] = ['$officehour', Number(officeHourQuery[op])];
  }

  const matchConditions = [
    { attendanceDate: { $gte: new Date(fromDate) } },
    { attendanceDate: { $lte: new Date(toDate) } },
    { user: mongoose.Types.ObjectId(user) }
  ];

  const totalHourQuery = !officehour
    ? [
        {
          $match: {
            $and: matchConditions
          }
        },
        {
          $addFields: {
            punchTimeDifference: {
              $ifNull: [
                {
                  $dateDiff: {
                    startDate: '$punchInTime',
                    endDate: '$punchOutTime',
                    unit: 'millisecond'
                  }
                },
                0
              ]
            }
          }
        },
        {
          $group: {
            _id: null,
            totalhours: { $sum: '$punchTimeDifference' }
          }
        }
      ]
    : [
        {
          $match: {
            $and: matchConditions
          }
        },
        {
          $addFields: {
            punchTimeDifference: {
              $ifNull: [
                {
                  $dateDiff: {
                    startDate: '$punchInTime',
                    endDate: '$punchOutTime',
                    unit: 'millisecond'
                  }
                },
                0
              ]
            }
          }
        },
        {
          $group: {
            _id: '$attendanceDate',
            officehour: { $sum: '$punchTimeDifference' }
          }
        },
        {
          $match: {
            $expr: totalhourCondition
          }
        },
        {
          $group: {
            _id: null,
            totalhours: { $sum: '$officehour' }
          }
        }
      ];

  const totalHours = await Attendance.aggregate(totalHourQuery);

  res.status(200).json({
    status: 'success',
    data: totalHours
  });
});

// Search attendances with date range and for particular user
exports.searchAttendances = asyncError(async (req, res, next) => {
  const { fromDate, toDate, user, page, limit } = req.query;

  const pages = page * 1 || 1;
  const limits = limit * 1 || 1000;
  const skip = (pages - 1) * limit;

  let sortObject = { $sort: { _id: -1 } };
  const orderType = req.query.sort.includes('-') ? -1 : 1;

  if (req.query.sort) {
    if (req.query.sort.includes('punchInTime')) {
      sortObject = req.query.sort.includes('user')
        ? {
            $sort: {
              'PunchInPart.hour': orderType,
              'PunchInPart.minute': orderType,
              'PunchInPart.second': orderType,
              'data.user': 1
            }
          }
        : {
            $sort: {
              'PunchInPart.hour': orderType,
              'PunchInPart.minute': orderType,
              'PunchInPart.second': orderType
            }
          };
    } else if (req.query.sort.includes('punchOutTime')) {
      sortObject = req.query.sort.includes('user')
        ? {
            $sort: {
              'PunchOutPart.hour': orderType,
              'PunchOutPart.minute': orderType,
              'PunchOutPart.second': orderType,
              'data.user': 1
            }
          }
        : {
            $sort: {
              'PunchOutPart.hour': orderType,
              'PunchOutPart.minute': orderType,
              'PunchOutPart.second': orderType
            }
          };
    } else {
      const intermediate = req.query.sort
        .split(',')
        .reduce((prevobj, current) => {
          const trimmedData = current.replace('-', '').trim();
          const sortString = ['officehour'].includes(trimmedData)
            ? trimmedData
            : 'data.'.concat(trimmedData);
          const orderTypes = current[0] === '-' ? -1 : 1;
          return Object.assign(prevobj, {
            [sortString]: orderTypes
          });
        }, {});
      sortObject = { $sort: intermediate };
    }
  }

  const matchConditions = [
    { attendanceDate: { $gte: new Date(fromDate) } },
    { attendanceDate: { $lte: new Date(toDate) } }
  ];

  if (user) {
    matchConditions.push({
      user: mongoose.Types.ObjectId(user)
    });
  }

  const aggregateArray = [
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
      $match: {
        'user.active': true
      }
    },
    {
      $set: {
        user: {
          $arrayElemAt: ['$user.name', 0]
        },
        userId: {
          $arrayElemAt: ['$user._id', 0]
        }
      }
    },
    {
      $group: {
        _id: {
          attendanceDate: '$attendanceDate',
          user: '$user',
          userId: '$userId'
        },
        data: {
          $addToSet: {
            punchInTime: '$punchInTime',
            attendanceDate: '$attendanceDate',
            createdAt: '$createdAt',
            createdBy: '$createdBy',
            midDayExit: '$midDayExit',
            punchOutTime: '$punchOutTime',
            updatedAt: '$updatedAt',
            user: '$user',
            _id: '$_id',
            punchOutNote: '$punchOutNote',
            punchInNote: '$punchInNote',
            punchInLocation: '$punchInLocation',
            punchOutLocation: '$punchOutLocation',
            punchInIp: '$punchInIp',
            punchOutIp: '$punchOutIp',
            isLateArrival: '$isLateArrival',
            punchTimeDifference: {
              $dateDiff: {
                startDate: '$punchInTime',
                endDate: '$punchOutTime',
                unit: 'millisecond'
              }
            }
          }
        }
      }
    },
    {
      $unwind: '$data'
    },
    {
      $sort: {
        'data.punchInTime': 1
      }
    },
    {
      $group: {
        _id: '$_id',
        data: {
          $push: '$data'
        },
        firstPunchInTime: { $min: '$data.punchInTime' },
        lastPunchOutTime: { $last: '$data.punchOutTime' }
      }
    },
    {
      $project: {
        _id: 1,
        data: 1,
        PunchInPart: {
          hour: { $hour: '$firstPunchInTime' },
          minute: { $minute: '$firstPunchInTime' },
          second: { $second: '$firstPunchInTime' }
        },
        PunchOutPart: {
          hour: {
            $ifNull: [{ $hour: '$lastPunchOutTime' }, 0]
          },
          minute: { $ifNull: [{ $minute: '$lastPunchOutTime' }, 0] },
          second: { $ifNull: [{ $second: '$lastPunchOutTime' }, 0] }
        },
        officehour: {
          $reduce: {
            input: '$data',
            initialValue: 0,
            in: {
              $add: ['$$value', { $ifNull: ['$$this.punchTimeDifference', 0] }]
            }
          }
        }
      }
    },
    {
      ...sortObject
    }
  ];

  if (req.query.officehour) {
    let officeHourQuery = JSON.stringify(req.query.officehour).replace(
      /\b(gte|gt|lte|lt|eq)\b/g,
      (match) => `$${match}`
    );
    officeHourQuery = JSON.parse(officeHourQuery);
    const op = Object.keys(officeHourQuery)[0];
    officeHourQuery[op] = ['$officehour', Number(officeHourQuery[op])];

    aggregateArray.push({
      $match: { $expr: officeHourQuery }
    });
  }

  const attendances = await Attendance.aggregate(
    [
      ...aggregateArray,
      {
        $facet: {
          metadata: [{ $count: 'total' }],
          data: [{ $skip: +skip }, { $limit: +limits }]
        }
      }
    ],
    {
      collation: {
        locale: 'en'
      }
    }
  );

  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        attendances
      },
      ATTENDANCE_KEY
    )
  });
});

// Get users count for today's punch in
exports.getPunchInCountToday = asyncError(async (req, res, next) => {
  const todayDate = common.todayDate();

  const attendance = await Attendance.aggregate([
    {
      $match: {
        attendanceDate: { $eq: todayDate }
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
    { $group: { _id: '$user' } },
    {
      $count: 'count'
    }
  ]);

  res.status(200).json({
    status: 'success',
    attendance
  });
});

// Search attendaces with late arrival time
exports.getLateArrivalAttendances = asyncError(async (req, res, next) => {
  const { fromDate, toDate, user, lateArrivalLeaveCut } = req.query;
  const matchConditions = [
    { isLateArrival: { $eq: true } },
    { attendanceDate: { $gte: new Date(fromDate) } },
    { attendanceDate: { $lte: new Date(toDate) } },
    { lateArrivalLeaveCut: { $eq: +lateArrivalLeaveCut !== 1 } }
  ];

  if (user) {
    matchConditions.push({
      user: mongoose.Types.ObjectId(user)
    });
  }

  const configurations = await Configurations.find();
  const lateArrivalThreshold = configurations[0].lateArrivalThreshold;
  const attendances = await Attendance.aggregate([
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
      $match: {
        'user.active': true
      }
    },
    {
      $set: {
        user: {
          $arrayElemAt: ['$user.name', 0]
        },
        userId: { $arrayElemAt: ['$user._id', 0] },
        officeTime: '$user.officeTime'
      }
    },
    {
      $group: {
        _id: { attendaceDate: '$attendanceDate', user: '$userId' },
        data: { $push: '$$ROOT' }
      }
    },
    {
      $unwind: '$data'
    },
    { $sort: { 'data.punchInTime': 1 } },
    {
      $group: {
        _id: '$_id',
        data: { $first: '$$ROOT' }
      }
    },
    {
      $unwind: '$data'
    },
    {
      $project: {
        _id: '$data.data._id',
        attendanceDate: '$data.data.attendanceDate',
        user: '$data.data.user',
        lateArrivalLeaveCut: '$data.data.lateArrivalLeaveCut',
        midDayExit: '$data.data.midDayExit',
        punchInTime: '$data.data.punchInTime',
        punchOutTime: '$data.data.punchOutTime',
        punchInNote: '$data.data.punchInNote',
        punchOutNote: '$data.data.punchOutNote',
        userId: '$data.data.userId',
        punchInLocation: '$punchInLocation',
        punchOutLocation: '$punchOutLocation',
        isLateArrival: '$data.data.isLateArrival',
        officeTime: {
          $arrayElemAt: ['$data.data.officeTime', 0]
        }
      }
    },

    {
      $group: {
        _id: {
          userId: '$userId',
          user: '$user'
        },
        data: { $push: '$$ROOT' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      attendances: encrypt(attendances, LATE_ARRIVAL_KEY),
      lateArrivalThreshold: encrypt(lateArrivalThreshold, LATE_ARRIVAL_KEY)
    }
  });
});

exports.leaveCutForLateAttendace = asyncError(async (req, res, next) => {
  await Attendance.updateMany(
    { _id: { $in: req.body.attendance } },
    { lateArrivalLeaveCut: true }
  );

  const leaveCutUser = await User.findById(req.body.userId);

  const emailContent = await Email.findOne({ module: 'late-attendance' });

  const message = `<b><em>${
    leaveCutUser.name
  }</em> late arival leave cut at ${req.body.leaveCutdate
    .toString()
    .split(',')
    .map((x) => `<p>${x.split('T')[0]}</p>`)
    .join('')}</b>`;

  new EmailNotification().sendEmail({
    email: [INFOWENEMAIL, HRWENEMAIL, leaveCutUser.email],
    subject:
      emailContent.title.replace(/@username/i, leaveCutUser.name) ||
      `late arrival leave cut`,
    message:
      emailContent.body
        .replace(/@username/i, leaveCutUser.name)
        .replace(
          /@date/i,
          req.body.leaveCutdate
            .toString()
            .split(',')
            .map((x) => `<p>${x.split('T')[0]}</p>`)
            .join('')
        )
        .replace(/@leavetype/i, req.body.leaveType || '') || message
  });

  ActivityLogs.create({
    status: 'deleted',
    module: 'Attendance',
    activity: `${req.user.name} added Late Arrival Leave Cut of (${leaveCutUser.name})`,
    user: {
      name: req.user.name,
      photo: req.user.photoURL
    }
  });

  res.status(200).json({
    status: 'success',
    data: 'Successfull !'
  });
});
