const Policy = require('../../models/resources/policyModel');
const factory = require('../factoryController');

exports.getPolicy = factory.getOne(Policy);
exports.getAllPolicies = factory.getAll(Policy);
exports.createPolicy = factory.createOne(Policy);
exports.updatePolicy = factory.updateOne(Policy);
exports.deletePolicy = factory.deleteOne(Policy);
