const mongoose = require('mongoose');

const projectTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide project type.'],
    unique: true,
    trim: true
  }
});

const ProjectType = mongoose.model('Project_Type', projectTypeSchema);

module.exports = ProjectType;
