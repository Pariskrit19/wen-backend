const mongoose = require('mongoose');
const common = require('../../utils/common');

const quarterSchema = new mongoose.Schema({
  quarterName: String,
  fromDate: Date,
  toDate: Date,
  leaves: Number,
  isResetLeaveAllocatedLeavesDisabled: { type: Boolean, default: false }
});

const leaveQuarterSchema = new mongoose.Schema(
  {
    fiscalYear: {
      type: Date,
      required: true,
      default: common.getStartDateOfTheYear()
    },
    quarters: [quarterSchema]
  },
  {
    timestamps: true
  }
);

const LeaveQuarter = mongoose.model('Leave_Quarter', leaveQuarterSchema);

// module.exports = LeaveQuarter;
module.exports = { quarterSchema, LeaveQuarter };
