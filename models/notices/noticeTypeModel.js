const mongoose = require('mongoose');

const noticeTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide notice type name.'],
    unique: true,
    trim: true
  }
});

const NoticeType = mongoose.model('Notice_Type', noticeTypeSchema);
module.exports = NoticeType;
