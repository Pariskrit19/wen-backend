const ProjectStatus = require('../../models/projects/projectStatusModel');
const { PROJECT_STATUS_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getProjectStatus = factory.getOne(ProjectStatus);
exports.getAllProjectStatus = factory.getAll(ProjectStatus, PROJECT_STATUS_KEY);
exports.createProjectStatus = factory.createOne(ProjectStatus);
exports.updateProjectStatus = factory.updateOne(ProjectStatus);
exports.deleteProjectStatus = factory.deleteOne(ProjectStatus);
