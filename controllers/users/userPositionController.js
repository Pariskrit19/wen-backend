const UserPosition = require('../../models/users/userPositionModel');
const { USER_POSITION_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getUserPosition = factory.getOne(UserPosition);
exports.getAllUserPositions = factory.getAll(UserPosition, USER_POSITION_KEY);
exports.createUserPosition = factory.createOne(UserPosition);
exports.updateUserPosition = factory.updateOne(UserPosition);
exports.deleteUserPosition = factory.deleteOne(UserPosition);
