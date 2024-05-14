const ProjectTag = require('../../models/projects/projectTagModel');
const { PROJECCT_TAG_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getProjectTag = factory.getOne(ProjectTag);
exports.getAllProjectTags = factory.getAll(ProjectTag, PROJECCT_TAG_KEY);
exports.createProjectTag = factory.createOne(ProjectTag);
exports.updateProjectTag = factory.updateOne(ProjectTag);
exports.deleteProjectTag = factory.deleteOne(ProjectTag);
