const mongoose = require('mongoose');

const projectStatusSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide project status.'],
    unique: true,
    trim: true
  }
});

const ProjectStatus = mongoose.model('Project_Status', projectStatusSchema);

module.exports = ProjectStatus;
