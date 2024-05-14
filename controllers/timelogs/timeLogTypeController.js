const TimeLogType = require('../../models/timelogs/timeLogTypeModel');
const { LOG_TYPE_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getTimeLogType = factory.getOne(TimeLogType);
exports.getAllTimeLogTypes = factory.getAll(TimeLogType, LOG_TYPE_KEY);
exports.createTimeLogType = factory.createOne(TimeLogType);
exports.updateTimeLogType = factory.updateOne(TimeLogType);
exports.deleteTimeLogType = factory.deleteOne(TimeLogType);
