const mongoose = require('mongoose');
const { quarterSchema } = require('./leaveQuarter');

const UserLeaveSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: [true, 'Please provide user for user leave.']
  },
  fiscalYear: {
    type: Date,
    required: true
  },
  remainingSickLeaves: { type: Number, default: 0 },
  remainingCasualLeaves: { type: Number, default: 0 },
  leaves: [
    {
      allocatedLeaves: {
        type: Number,
        default: 0
      },
      remainingLeaves: {
        type: Number,
        default: 0
      },
      approvedLeaves: {
        sickLeaves: {
          type: Number,
          default: 0
        },
        casualLeaves: {
          type: Number,
          default: 0
        }
      },
      carriedOverLeaves: {
        type: Number,
        default: 0
      },

      quarter: quarterSchema
    }
  ]
});

UserLeaveSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: ''
  });
  next();
});

const UserLeave = mongoose.model('User_Leave', UserLeaveSchema);

module.exports = UserLeave;
