const mongoose = require('mongoose');

const projectTagSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide project tag name.'],
    unique: true,
    trim: true
  }
});

const ProjectTag = mongoose.model('Project_Tag', projectTagSchema);

module.exports = ProjectTag;
