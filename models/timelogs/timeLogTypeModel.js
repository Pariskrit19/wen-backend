const mongoose = require('mongoose');

const timeLogTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide time log type.'],
    unique: true,
    trim: true
  },
  color: {
    type: String,
    trim: true
  }
});

const TimeLogType = mongoose.model('TimeLog_Type', timeLogTypeSchema);

module.exports = TimeLogType;
