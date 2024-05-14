const mongoose = require('mongoose');

const holidaysSchema = new mongoose.Schema(
  {
    holidays: {
      type: [
        {
          title: {
            type: String,
            required: [true, 'Please provide holiday title.'],
            trim: true
          },
          date: {
            type: String,
            required: [true, 'Please provide holiday date.']
          },
          allowLeaveApply: {
            type: Boolean,
            default: false
          },
          remarks: String
        }
      ]
    }
  },
  {
    timestamps: true
  }
);

const Holiday = mongoose.model('Holiday', holidaysSchema);

module.exports = Holiday;
