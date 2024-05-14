const Email = require('../../models/email/emailSettingModel');
const { EMAIL_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getEmail = factory.getOne(Email);
exports.getAllEmails = factory.getAll(Email, EMAIL_KEY);
exports.createEmail = factory.createOne(Email);
exports.updateEmail = factory.updateOne(Email);
exports.deleteEmail = factory.deleteOne(Email);
