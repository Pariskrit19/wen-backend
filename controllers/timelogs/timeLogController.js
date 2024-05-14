const mongoose = require('mongoose');

const TimeLog = require('../../models/timelogs/timeLogModel');
const factory = require('../factoryController');
const AppError = require('../../utils/appError');
const asyncError = require('../../utils/asyncError');
const common = require('../../utils/common');
const APIFeatures = require('../../utils/apiFeatures');
const ActivityLogs = require('../../models/activityLogs/activityLogsModel');
const {
  WEEKLY_REPORT_KEY,
  encrypt,
  WORK_LOG_REPORT_KEY,
  LOG_KEY
} = require('../../utils/crypto');
const Project = require('../../models/projects/projectModel');

exports.getTimeLog = factory.getOne(TimeLog);
// exports.getAllTimeLogs = factory.getAll(TimeLog);
exports.createTimeLog = factory.createOne(TimeLog);
exports.updateTimeLog = factory.updateOne(TimeLog);
exports.deleteTimeLog = factory.deleteOne(TimeLog, ActivityLogs, 'TimeLog');

//calculate total office hour
exports.CalculateOtherTotalHour = asyncError(async (req, res, next) => {
  const ApiInstance = new APIFeatures(TimeLog.find({}), req.query).filter();
  const newfeatures = ApiInstance.formattedQuery;

  const newFilter = { isOt: true };

  Object.keys(newfeatures).forEach((data) => {
    if (TimeLog.schema.path(data) instanceof mongoose.Schema.Types.ObjectId) {
      newFilter[data] = new mongoose.Types.ObjectId(newfeatures[data]);
    } else if (data === 'logDate') {
      newFilter[data] = {
        $gte: new Date(newfeatures[data].$gte),
        $lte: new Date(newfeatures[data].$lte)
      };
    } else {
      newFilter[data] = newfeatures[data];
    }
  });

  const totalHour = await TimeLog.aggregate([
    {
      $match: newFilter
    },
    {
      $group: {
        _id: null,
        totalHour: { $sum: '$totalHours' }
      }
    }
  ]);

  return res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        data: totalHour
      },
      LOG_KEY
    )
  });
});

exports.getTotalLogHoursOfAProject = asyncError(async (req, res) => {
  const { notSelectedIds, selectedIds, isSelectAll } = req.body;
  const query = req.query;
  let filterObj = {};
  Object.keys(query).forEach((key) => {
    if (query[key]) {
      filterObj = { ...filterObj, [key]: query[key] };
    }
  });
  let timelogs = [];
  if (isSelectAll) {
    timelogs = await TimeLog.find(filterObj).nin('_id', notSelectedIds);
  } else {
    timelogs = await TimeLog.find().in('_id', selectedIds);
  }

  if (timelogs.length > 0) {
    const totalHrsArr = timelogs.map((item) => item.totalHours);
    const result = totalHrsArr.reduce((acc, cur) => acc + cur, 0);
    return res.status(200).json({
      status: 'success',
      data: {
        count: result
      }
    });
  }

  return res.status(200).json({
    status: 'success',
    data: {
      count: 0
    }
  });
});

//get all the timelogs with sorting
exports.getAllTimeLogs = asyncError(async (req, res, next) => {
  if (
    TimeLog.schema.path(req.query.sort.replace('-', '')) instanceof
    mongoose.Schema.Types.ObjectId
  ) {
    const ApiInstance = new APIFeatures(TimeLog.find({}), req.query)
      .filter()
      .search()
      .paginate();
    const newfeatures = ApiInstance.formattedQuery;
    const paginatedfeature = ApiInstance.paginateObject;

    const newFilter = {};

    Object.keys(newfeatures).forEach((data) => {
      if (TimeLog.schema.path(data) instanceof mongoose.Schema.Types.ObjectId) {
        newFilter[data] = new mongoose.Types.ObjectId(newfeatures[data]);
      } else if (data === 'isOt') {
        newFilter[data] = !!newfeatures[data];
      } else if (data === 'logDate') {
        newFilter[data] = {
          $gte: new Date(newfeatures[data].$gte),
          $lte: new Date(newfeatures[data].$lte)
        };
      } else {
        newFilter[data] = newfeatures[data];
      }
    });

    const orderSort = req.query.sort[0] === '-' ? -1 : 1;
    const sortField = req.query.sort.replace('-', '');

    const sortObject = { $sort: { [`${sortField}.name`]: orderSort } };

    const [sortedData, totalCount] = await Promise.all([
      TimeLog.aggregate(
        [
          {
            $match: newFilter
          },
          {
            $lookup: {
              from: 'users',
              let: { user_id: '$user' },
              pipeline: [
                { $match: { $expr: { $eq: ['$$user_id', '$_id'] } } },
                {
                  $project: {
                    name: 1
                  }
                }
              ],
              as: 'user'
            }
          },
          {
            $unwind: '$user'
          },

          {
            $lookup: {
              from: 'projects',
              let: { project_id: '$project' },
              pipeline: [
                { $match: { $expr: { $eq: ['$$project_id', '$_id'] } } },
                { $project: { name: 1, slug: 1 } }
              ],
              as: 'project'
            }
          },
          {
            $lookup: {
              from: 'timelog_types',
              let: { logtype_id: '$logType' },
              pipeline: [
                { $match: { $expr: { $eq: ['$$logtype_id', '$_id'] } } },
                { $project: { name: 1 } }
              ],
              as: 'logType'
            }
          },
          {
            ...sortObject
          },
          { $skip: paginatedfeature.skip },
          { $limit: paginatedfeature.limit },
          {
            $set: {
              project: { $arrayElemAt: ['$project', 0] },
              logType: { $arrayElemAt: ['$logType', 0] }
            }
          }
        ],
        {
          collation: {
            locale: 'en'
          }
        }
      ),
      TimeLog.countDocuments(newfeatures)
    ]);

    return res.status(200).json({
      status: 'success',
      results: sortedData.length,
      data: encrypt(
        {
          data: sortedData,
          count: totalCount
        },
        LOG_KEY
      )
    });
  }
  const features = new APIFeatures(TimeLog.find({}), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .search();

  const [doc, count] = await Promise.all([
    features.query,
    TimeLog.countDocuments(features.formattedQuery)
  ]);

  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: encrypt(
      {
        data: doc,
        count
      },
      LOG_KEY
    )
  });
});

// Get weekly logs of user
exports.getWeeklyLogsOfUser = asyncError(async (req, res, next) => {
  const { firstDayOfWeek, lastDayOfWeek } = common.dateInThisWeek();

  const features = new APIFeatures(
    TimeLog.find({
      $and: [
        { logDate: { $gte: firstDayOfWeek } },
        { logDate: { $lte: lastDayOfWeek } }
      ]
    }),
    req.query
  )
    .filter()
    .sort()
    .limitFields()
    .paginate();

  if (
    TimeLog.schema.path(req.query.sort.replace('-', '')) instanceof
      mongoose.Schema.Types.ObjectId &&
    req.query.sort.includes('project')
  ) {
    const paginatedfeature = features.paginateObject;

    const orderSort = req.query.sort[0] === '-' ? -1 : 1;

    const [sortedData, totalCount] = await Promise.all([
      TimeLog.aggregate([
        {
          $match: {
            $and: [
              { logDate: { $gte: firstDayOfWeek } },
              { logDate: { $lte: lastDayOfWeek } },
              { user: { $eq: mongoose.Types.ObjectId(req.query.user) } }
            ]
          }
        },
        {
          $addFields: {
            id: '$_id'
          }
        },
        {
          $lookup: {
            from: 'users',
            let: { user_id: '$user' },
            pipeline: [
              { $match: { $expr: { $eq: ['$$user_id', '$_id'] } } },
              {
                $project: {
                  name: 1
                }
              }
            ],
            as: 'user'
          }
        },
        {
          $unwind: '$user'
        },
        {
          $lookup: {
            from: 'projects',
            let: { project_id: '$project' },
            pipeline: [
              { $match: { $expr: { $eq: ['$$project_id', '$_id'] } } },
              {
                $project: {
                  name: 1,
                  slug: 1,
                  lowerName: { $toLower: '$name' }
                }
              }
            ],
            as: 'project'
          }
        },
        {
          $set: {
            project: { $arrayElemAt: ['$project', 0] }
          }
        },
        {
          $set: {
            project: {
              $cond: [
                { $lte: ['$project.lowerName', null] },
                { name: 'Other', slug: 'other', lowerName: 'other' },
                '$project'
              ]
            }
          }
        },

        {
          $sort: {
            'project.lowerName': orderSort
          }
        },
        {
          $lookup: {
            from: 'timelog_types',
            let: { logtype_id: '$logType' },
            pipeline: [
              { $match: { $expr: { $eq: ['$$logtype_id', '$_id'] } } },
              { $project: { name: 1 } }
            ],
            as: 'logTypes'
          }
        },
        { $skip: paginatedfeature.skip },
        { $limit: paginatedfeature.limit },
        {
          $set: {
            logType: { $arrayElemAt: ['$logTypes', 0] }
          }
        },
        {
          $unset: ['logTypes', 'projects', 'project.lowerName']
        }
      ]),
      TimeLog.countDocuments({
        ...features.formattedQuery,
        logDate: { $gte: firstDayOfWeek }
      })
    ]);
    return res.status(200).json({
      status: 'success',
      results: sortedData.length,
      data: encrypt(
        {
          data: sortedData,
          count: totalCount
        },
        LOG_KEY
      )
    });
  }

  const [doc, count] = await Promise.all([
    features.query,
    TimeLog.countDocuments({
      ...features.formattedQuery,
      logDate: { $gte: firstDayOfWeek }
    })
  ]);
  res.status(200).json({
    status: 'success',
    results: doc.length,
    data: encrypt(
      {
        data: doc,
        count
      },
      LOG_KEY
    )
  });
});

// Check for allowed time log days before add/edit
exports.checkTimeLogDays = (req, res, next) => {
  const { logDate } = req.body;

  const today = new Date().getDate();
  const logDay = new Date(logDate).getDate();

  const allowedTimeLogDays = process.env.ALLOWED_TIMELOG_DAYS;

  const allowedTImeLogsOnMonday = 3;

  if (!['admin', 'manager'].includes(req.user.roleKey)) {
    // allow log before 3 days on monday
    if (new Date().getDay() === 1) {
      if (!(today - logDay <= allowedTImeLogsOnMonday)) {
        return next(
          new AppError(
            `You are not allowed to add/edit time log after ${allowedTImeLogsOnMonday} Days`,
            400
          )
        );
      }
    }

    if (!(today - logDay <= allowedTimeLogDays) && new Date().getDay() !== 1) {
      return next(
        new AppError(
          `You are not allowed to add/edit time log after ${allowedTimeLogDays} Days`,
          400
        )
      );
    }
  }
  next();
};

// check per day logtime of user
exports.checkLogTimeHours = asyncError(async (req, res, next) => {
  const { logDate, user, hours, minutes } = req.body;

  const LogDay = logDate.split('T')[0].concat('T00:00:00.000Z');

  const matchConditions = [
    { user: { $eq: mongoose.Types.ObjectId(user) } },
    { logDate: { $eq: new Date(LogDay) } }
  ];

  // for edit case
  if (req.body._id) {
    matchConditions.push({
      _id: { $ne: mongoose.Types.ObjectId(req.body._id) }
    });
  }

  const timeLogs = await TimeLog.aggregate([
    {
      $match: {
        $and: matchConditions
      }
    },
    {
      $group: {
        _id: null,
        totalHours: { $sum: '$totalHours' }
      }
    }
  ]);

  let totalHours = hours + minutes / 60;

  if (timeLogs.length !== 0) {
    totalHours += timeLogs[0].totalHours;
  }

  if (totalHours > 24) {
    return next(
      new AppError(`You are not allowed to log more than 24 hours a day`, 400)
    );
  }

  next();
});

// Get weekly time summary of user with time log details
exports.getUserWeeklyTimeSpent = asyncError(async (req, res, next) => {
  const userId = mongoose.Types.ObjectId(req.query.userId);

  const { firstDayOfWeek, lastDayOfWeek } = common.dateInThisWeek();

  const userTimeSummary = await TimeLog.aggregate([
    {
      $match: {
        user: userId,
        $and: [
          { logDate: { $gte: firstDayOfWeek } },
          { logDate: { $lte: lastDayOfWeek } }
        ]
      }
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              _id: 1,
              slug: 1,
              name: 1
            }
          }
        ],
        as: 'project'
      }
    },
    {
      $lookup: {
        from: 'timelog_types',
        localField: 'logType',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              _id: 0,
              name: 1
            }
          }
        ],
        as: 'logType'
      }
    },
    {
      $group: {
        _id: '$user',
        timeSpentThisWeek: { $sum: '$totalHours' },
        timeLogs: {
          $push: {
            project: '$project',
            logType: '$logType',
            logDate: '$logDate',
            totalHours: '$totalHours',
            remarks: '$remarks'
          }
        }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        weeklySummary: userTimeSummary
      },
      LOG_KEY
    )
  });
});

//Get user total time spent on a day for projects
exports.getWeeklyTimeSpentProject = asyncError(async (req, res, next) => {
  const projectId = mongoose.Types.ObjectId(req.query.projectId);
  const { firstDayOfWeek, lastDayOfWeek } = common.dateInThisWeek();

  const timeSpendWeekly = await TimeLog.aggregate([
    {
      $match: {
        project: projectId,
        $and: [
          { logDate: { $gte: firstDayOfWeek } },
          { logDate: { $lte: lastDayOfWeek } }
        ]
      }
    },
    {
      $group: {
        _id: '$project',
        timeSpentThisWeek: { $sum: '$totalHours' }
      }
    },
    {
      $project: {
        timeSpentThisWeek: '$timeSpentThisWeek'
      }
    }
  ]);
  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        weeklySummary: timeSpendWeekly
      },
      LOG_KEY
    )
  });
});

// Get weekly time summary of timelogs
exports.getWeeklyOtherTimeLog = asyncError(async (req, res) => {
  const projectId = mongoose.Types.ObjectId(process.env.OTHER_PROJECT_ID);

  const { firstDayOfWeek, lastDayOfWeek } = common.dateInThisWeek();

  const OtherProjectTimeSummary = await TimeLog.aggregate([
    {
      $match: {
        project: projectId,
        $and: [
          { logDate: { $gte: firstDayOfWeek } },
          { logDate: { $lte: lastDayOfWeek } }
        ]
      }
    },

    {
      $group: {
        _id: null,
        timeSpentThisWeek: { $sum: '$totalHours' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        weeklySummary: OtherProjectTimeSummary
      },
      LOG_KEY
    )
  });
});

//today time spent on other project
exports.getTodayOtherTimeLog = asyncError(async (req, res) => {
  const projectId = mongoose.Types.ObjectId(process.env.OTHER_PROJECT_ID);

  const { todayDate, tomorrowDate } = common.todayTomorrowDate();

  const timeSpentToday = await TimeLog.aggregate([
    {
      $match: {
        project: projectId,
        $and: [
          { logDate: { $gte: todayDate } },
          { logDate: { $lt: tomorrowDate } }
        ]
      }
    },

    {
      $group: {
        _id: null,
        timeSpentToday: { $sum: '$totalHours' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        timeSpentToday
      },
      LOG_KEY
    )
  });
});

// Get user total time spent on a day for projects
exports.getUserTodayTimeSpent = asyncError(async (req, res, next) => {
  const userId = mongoose.Types.ObjectId(req.query.userId);

  const { todayDate, tomorrowDate } = common.todayTomorrowDate();

  const timeSpentToday = await TimeLog.aggregate([
    {
      $match: {
        user: userId,
        $and: [
          { logDate: { $gte: todayDate } },
          { logDate: { $lt: tomorrowDate } }
        ]
      }
    },
    {
      $group: {
        _id: '$user',
        timeSpentToday: { $sum: '$totalHours' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        timeSpentToday
      },
      LOG_KEY
    )
  });
});

// Get weekly time summary of user with time log details
exports.getWeeklyReport = asyncError(async (req, res, next) => {
  const { fromDate, toDate, projectStatus, logType, client, project } =
    req.query;

  const matchConditions = [
    { logDate: { $gte: new Date(fromDate) } },
    { logDate: { $lte: new Date(toDate) } }
  ];

  if (logType) {
    matchConditions.push({
      logType: { $eq: mongoose.Types.ObjectId(logType) }
    });
  }

  if (projectStatus) {
    matchConditions.push({
      'project.projectStatus': { $eq: mongoose.Types.ObjectId(projectStatus) }
    });
  }

  if (client) {
    matchConditions.push({
      'project.client': { $eq: mongoose.Types.ObjectId(client) }
    });
  }

  if (project) {
    matchConditions.push({
      'project._id': { $eq: mongoose.Types.ObjectId(project) }
    });
  }

  const report = await TimeLog.aggregate([
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        as: 'project'
      }
    },
    {
      $match: {
        $and: matchConditions
      }
    },
    {
      $group: {
        _id: '$project',
        timeSpent: { $sum: '$totalHours' }
      }
    },
    {
      $addFields: { project: '$_id' }
    },
    {
      $sort: {
        'project.createdAt': -1
      }
    },

    {
      $project: {
        _id: 0,
        'project._id': 1,
        'project.name': 1,
        'project.projectStatus': 1,
        'project.client': 1,
        timeSpent: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        report
      },
      WEEKLY_REPORT_KEY
    )
  });
});

// Get time log summary for chart
exports.getTimelogForChart = asyncError(async (req, res, next) => {
  const { project, logType } = req.query;

  const matchConditions = [
    { project: { $eq: mongoose.Types.ObjectId(project) } }
  ];

  if (logType) {
    const logs = logType.split(',');
    matchConditions.push({
      logType: { $in: logs.map((log) => mongoose.Types.ObjectId(log)) }
    });
  }

  const chart = await TimeLog.aggregate([
    {
      $match: {
        $and: matchConditions
      }
    },
    {
      $lookup: {
        from: 'timelog_types',
        localField: 'logType',
        foreignField: '_id',
        as: 'logType'
      }
    },
    {
      $group: {
        _id: '$logType',
        timeSpent: { $sum: '$totalHours' }
      }
    },
    {
      $addFields: { logType: '$_id' }
    },
    {
      $project: {
        _id: 0,
        'logType.name': 1,
        'logType.color': 1,
        timeSpent: 1
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      chart
    }
  });
});

// Get worklog reports
exports.getWorklogReport = asyncError(async (req, res, next) => {
  const { fromDate, toDate, logType, user, project } = req.query;

  const matchConditions = [
    { logDate: { $gte: new Date(fromDate) } },
    { logDate: { $lte: new Date(toDate) } }
  ];

  if (logType) {
    matchConditions.push({
      logType: { $eq: mongoose.Types.ObjectId(logType) }
    });
  }

  if (user) {
    matchConditions.push({
      user: { $eq: mongoose.Types.ObjectId(user) }
    });
  }

  if (project) {
    matchConditions.push({
      project: { $eq: mongoose.Types.ObjectId(project) }
    });
  }

  const report = await TimeLog.aggregate([
    {
      $match: {
        $and: matchConditions
      }
    },
    {
      $lookup: {
        from: 'projects',
        localField: 'project',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              name: 1
            }
          }
        ],
        as: 'project'
      }
    },
    {
      $lookup: {
        from: 'users',
        localField: 'user',
        foreignField: '_id',
        pipeline: [
          {
            $project: {
              name: 1
            }
          }
        ],
        as: 'user'
      }
    },
    {
      $group: {
        _id: '$user',
        timeLogs: {
          $push: {
            project: '$project',
            logType: '$logType',
            logDate: '$logDate',
            totalHours: '$totalHours',
            remarks: '$remarks'
          }
        },
        totalTimeSpent: { $sum: '$totalHours' }
      }
    }
  ]);

  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        report
      },
      WORK_LOG_REPORT_KEY
    )
  });
});

exports.getTimelogAuthors = asyncError(async (req, res, next) => {
  const { project } = req.query;
  const timelogs = await TimeLog.find({
    project: mongoose.Types.ObjectId(project)
  });
  const projectDetail = await Project.findOne({
    _id: mongoose.Types.ObjectId(project)
  });
  let authors = [
    ...projectDetail.developers,
    ...projectDetail.designers,
    ...projectDetail.qa,
    ...projectDetail.devOps
  ];
  if (timelogs.length > 0) {
    const logTimeUsers = timelogs.map((logtime) => logtime.user);
    let index = 0;
    while (index < logTimeUsers.length) {
      if (
        authors.findIndex((item) => item._id.equals(logTimeUsers[index]._id)) <
        0
      ) {
        authors = [...authors, logTimeUsers[index]];
      }

      index++;
    }
  }

  res.status(200).json({
    status: 'success',
    data: encrypt(
      {
        authors
      },
      LOG_KEY
    )
  });
});
