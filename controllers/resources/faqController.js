const FAQ = require('../../models/resources/faqModel');
const factory = require('../factoryController');

exports.getFAQ = factory.getOne(FAQ);
exports.getAllFAQs = factory.getAll(FAQ);
exports.createFAQ = factory.createOne(FAQ);
exports.updateFAQ = factory.updateOne(FAQ);
exports.deleteFAQ = factory.deleteOne(FAQ);
