const ActivityLogs = require('../../models/activityLogs/activityLogsModel');
const Configurations = require('../../models/configurations/configurationsModel');
const asyncError = require('../../utils/asyncError');
const { CONFIGURATION_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getConfigurations = factory.getOne(Configurations);
exports.getAllConfigurations = factory.getAll(
  Configurations,
  CONFIGURATION_KEY
);
exports.createConfiguration = factory.createOne(Configurations);
exports.updateConfiguration = asyncError(async (req, res, next) => {
  await Configurations.updateOne({}, { ...req.body }, { upsert: true });

  res.status(201).json({
    status: 'success',
    data: req.body
  });
});

exports.updateLateAttendanceThreshold = asyncError(async (req, res, next) => {
  await Configurations.updateOne(
    {},
    {
      ...req.body
    }
  );

  ActivityLogs.create({
    status: 'updated',
    module: 'Attendance',
    activity: `${req.user.name} updated Late Arrival Threshold`,
    user: {
      name: req.user.name,
      photo: req.user.photoURL
    }
  });

  res.status(201).json({
    status: 'success',
    data: req.body
  });
});

exports.deleteConfiguration = factory.deleteOne(Configurations);
