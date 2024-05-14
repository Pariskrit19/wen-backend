const ProjectType = require('../../models/projects/projectTypeModel');
const { PROJECT_TYPE_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getProjectType = factory.getOne(ProjectType);
exports.getAllProjectTypes = factory.getAll(ProjectType, PROJECT_TYPE_KEY);
exports.createProjectType = factory.createOne(ProjectType);
exports.updateProjectType = factory.updateOne(ProjectType);
exports.deleteProjectType = factory.deleteOne(ProjectType);
