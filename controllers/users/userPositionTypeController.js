const UserPositionType = require('../../models/users/userPositionTypeModel');
const { USER_POSITION_TYPE_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getUserPositionType = factory.getOne(UserPositionType);
exports.getAllUserPositionTypes = factory.getAll(
  UserPositionType,
  USER_POSITION_TYPE_KEY
);
exports.createUserPositionType = factory.createOne(UserPositionType);
exports.updateUserPositionType = factory.updateOne(UserPositionType);
exports.deleteUserPositionType = factory.deleteOne(UserPositionType);
