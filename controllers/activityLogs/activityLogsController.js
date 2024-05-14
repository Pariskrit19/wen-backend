const ActivityLogs = require('../../models/activityLogs/activityLogsModel');
const APIFeatures = require('../../utils/apiFeatures');
const asyncError = require('../../utils/asyncError');
const { encrypt, ACTIVITY_LOGS_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getAllActivityLogs = asyncError(async (req, res, next) => {
  const { fromDate, toDate } = req.query;

  const features = new APIFeatures(ActivityLogs.find({}), req.query)
    .filter()
    .sort()
    .limitFields()
    .paginate()
    .search();
  if (fromDate && toDate) {
    const doc = await features.query.find({
      createdAt: { $gte: fromDate, $lte: toDate }
    });
    const count = await ActivityLogs.countDocuments({
      ...features.formattedQuery,
      createdAt: { $gt: fromDate, $lt: toDate }
    });

    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: encrypt(
        {
          data: doc,
          count
        },
        ACTIVITY_LOGS_KEY
      )
    });
  } else {
    const [doc, count] = await Promise.all([
      features.query,
      ActivityLogs.countDocuments(features.formattedQuery)
    ]);
    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: encrypt(
        {
          data: doc,
          count
        },
        ACTIVITY_LOGS_KEY
      )
    });
  }
});

exports.createActivityLog = factory.createOne(ActivityLogs);

exports.deleteActivityLog = asyncError(async (req, res, next) => {
  await ActivityLogs.deleteMany({
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

exports.updateActivityLog = asyncError(async (req, res, next) => {
  const updatedActivities = await ActivityLogs.updateMany(
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
