const mongoose = require('mongoose');
const common = require('../../utils/common');

const attendanceSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    attendanceDate: {
      type: Date,
      default: common.todayDate()
    },
    punchInTime: {
      type: Date,
      default: Date.now(),
      required: [true, 'Please provide punch in time.']
    },
    punchInLocation: {
      type: [Number, Number]
    },

    punchOutLocation: {
      type: [Number, Number]
    },
    punchOutTime: Date,
    punchInNote: String,
    punchOutNote: String,
    punchInIp: {
      type: String
    },
    punchOutIp: {
      type: String
    },
    isLateArrival: {
      type: Boolean
    },
    lateArrivalLeaveCut: {
      type: Boolean,
      default: false
    },
    midDayExit: {
      type: Boolean,
      default: false
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    },
    updatedBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

attendanceSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user createdBy updatedBy',
    select: '-role -position name'
  });
  next();
});

const Attendance = mongoose.model('Attendance', attendanceSchema);
module.exports = Attendance;
