const UserRole = require('../../models/users/userRoleModel');
const { USER_ROLE_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getUserRole = factory.getOne(UserRole);
exports.getAllUserRoles = factory.getAll(UserRole, USER_ROLE_KEY);
exports.createUserRole = factory.createOne(UserRole);
exports.updateUserRole = factory.updateOne(UserRole);
exports.deleteUserRole = factory.deleteOne(UserRole);
