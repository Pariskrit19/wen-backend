const mongoose = require('mongoose');

const emailSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide Email title.'],
      trim: true
    },
    body: {
      type: String,
      trim: true,
      required: [true, 'Please provide Email body.']
    },
    module: {
      type: String,
      required: [true, 'Please provide Email Module'],
      trim: true
    }
  },
  {
    timestamps: true
  }
);

const Email = mongoose.model('Email', emailSchema);
module.exports = Email;
