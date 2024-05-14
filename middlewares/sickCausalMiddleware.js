const asyncError = require('../utils/asyncError');
const LeaveTypes = require('../models/leaves/leaveTypeModel');
const { LEAVETYPES } = require('../utils/constants');

/**
 * Get Sick and Causal Leave Type Id
 */
exports.getSickCasualLeave = asyncError(async (req, res, next) => {
  const LeaveType = await LeaveTypes.find({
    $or: [
      {
        name: {
          $regex: LEAVETYPES.sickLeave,
          $options: 'i'
        }
      },
      {
        name: {
          $regex: LEAVETYPES.casualLeave,
          $options: 'i'
        }
      }
    ]
  });

  req.leaveTypes = LeaveType;

  next();
});
