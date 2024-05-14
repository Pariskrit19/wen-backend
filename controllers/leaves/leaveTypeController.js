const UserLeave = require('../../models/leaves/UserLeavesModel');
const { LeaveQuarter } = require('../../models/leaves/leaveQuarter');
const LeaveType = require('../../models/leaves/leaveTypeModel');
const asyncError = require('../../utils/asyncError');
const { LEAVETYPES } = require('../../utils/constants');
const factory = require('../factoryController');
const { todayDate } = require('../../utils/common');
const { default: mongoose } = require('mongoose');

exports.getLeaveType = factory.getOne(LeaveType);
exports.getAllLeaveTypes = factory.getAll(LeaveType);
exports.createLeaveType = factory.createOne(LeaveType);
exports.updateLeaveType = asyncError(async (req, res, next) => {
  let oldCasualLeaveType = null,
    oldSickLeaveType = null;
  const isCasualLeaveType = req.body.name === LEAVETYPES.casualLeave;
  const isSickLeaveType = req.body.name === LEAVETYPES.sickLeave;

  if (isCasualLeaveType)
    oldCasualLeaveType = await LeaveType.findById(req.params.id);

  if (isSickLeaveType)
    oldSickLeaveType = await LeaveType.findById(req.params.id);

  const reqBody = { ...req.body, updatedBy: req.user.id };
  const doc = await LeaveType.findByIdAndUpdate(req.params.id, reqBody, {
    new: true,
    runValidators: true
  });

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  if (isCasualLeaveType || isSickLeaveType) {
    const leaveQuarters = await LeaveQuarter.find().sort({
      createdAt: -1
    });

    const currentFiscalYear = leaveQuarters[0] && leaveQuarters[0].fiscalYear;

    const userLeave = await UserLeave.find({
      fiscalYear: currentFiscalYear
    });
    const currentQuarter = leaveQuarters[0].quarters.find(
      (quarter) =>
        new Date(quarter.fromDate) <= new Date(todayDate()) &&
        new Date(todayDate()) <= new Date(quarter.toDate)
    );
    const userLeavesLength = userLeave.length;
    const adjustedCasualLeaveDaysDifference = isCasualLeaveType
      ? doc.leaveDays - oldCasualLeaveType.leaveDays
      : 0;
    const adjustedSickLeaveDaysDifference = isSickLeaveType
      ? doc.leaveDays - oldSickLeaveType.leaveDays
      : 0;

    const quarterlyAdjustedDays = isCasualLeaveType
      ? adjustedCasualLeaveDaysDifference
      : adjustedSickLeaveDaysDifference;
    for (let i = 0; i < userLeavesLength; i++) {
      if (
        userLeave[i] &&
        userLeave[i].user &&
        userLeave[i].user.status === 'Permanent'
      ) {
        const userLeaveQuarterly = [...userLeave[i].leaves].find(
          (leave) =>
            leave.quarter._id.toString() === currentQuarter._id.toString()
        );

        await UserLeave.updateOne(
          { _id: userLeave[i]._id, 'leaves._id': userLeaveQuarterly._id },
          {
            $set: {
              remainingCasualLeaves:
                userLeave[i].remainingCasualLeaves +
                adjustedCasualLeaveDaysDifference,
              remainingSickLeaves:
                userLeave[i].remainingSickLeaves +
                adjustedSickLeaveDaysDifference,
              'leaves.$.remainingLeaves':
                userLeaveQuarterly.remainingLeaves + quarterlyAdjustedDays
            }
          }
        );
      }
    }
  }

  res.status(200).json({
    status: 'success',
    data: {
      data: doc
    }
  });
});
exports.deleteLeaveType = factory.deleteOne(LeaveType);
