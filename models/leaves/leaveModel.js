const mongoose = require('mongoose');
const { sendPushNotification } = require('../../utils/common');
const {
  LEAVETYPES: leaveType,
  LEAVE_APPROVED,
  POSITIONS
} = require('../../utils/constants');
const { LeaveQuarter } = require('./leaveQuarter');
const LeaveType = require('./leaveTypeModel');
const UserLeave = require('./UserLeavesModel');
const User = require('../users/userModel');
const AppError = require('../../utils/appError');

const leaveSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user for leave.']
    },
    halfDay: {
      type: String,
      default: ''
    },
    leaveType: {
      type: mongoose.Schema.ObjectId,
      ref: 'Leave_Type',
      required: [true, 'Please provide leave type.']
    },
    leaveDates: [Date],
    leaveStatus: {
      type: String,
      enum: ['pending', 'approved', 'cancelled', 'rejected', 'user cancelled'],
      default: 'pending'
    },
    reason: {
      type: String,
      trim: true,
      required: [true, 'Please provide leave reason.'],
      minlength: [10, 'Leave Reason must have more or equal then 50 characters']
    },
    cancelReason: {
      type: String,
      trim: true,
      required: false
    },
    rejectReason: {
      type: String,
      trim: true,
      required: false
    },
    reapplyreason: {
      type: String,
      trim: true
    },
    remarks: {
      type: String,
      trim: true
    },
    leaveDocument: {
      type: String
    },
    createdBy: {
      type: mongoose.Schema.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

// Populate required data
leaveSchema.pre(/^find/, function (next) {
  this.populate({
    path: 'user',
    select: 'role -position name email active'
  }).populate({
    path: 'leaveType',
    select: 'name isSpecial'
  });
  this.populate({
    path: 'createdBy',
    select: '-role -position name '
  });
  next();
});

leaveSchema.pre('save', async function (next) {
  if (!['pending'].includes(this.leaveStatus)) {
    return next();
  }
  const leaves = await this.constructor.aggregate([
    {
      $match: {
        user: mongoose.Types.ObjectId(this.user),
        leaveStatus: { $in: ['approved', 'pending'] }
      }
    },
    {
      $unwind: '$leaveDates'
    },
    {
      $match: {
        leaveDates: { $in: this.leaveDates }
      }
    }
  ]);

  if (leaves && leaves.length === 0) {
    next();
    return;
  }

  if (
    leaves &&
    leaves.length === 1 &&
    leaves[0].halfDay &&
    this.halfDay &&
    this.halfDay !== leaves[0].halfDay
  ) {
    next();
    return;
  }

  const err = new AppError(`Leave has already been applied`, 400);

  next(err);
});

// update userLeave Document of user with approve status
leaveSchema.post('save', async (doc) => {
  // update when applied leave is directed applied fom apply section and role is admin
  if (doc.createdAt === doc.updatedAt) {
    const leaveTypeDoc = await LeaveType.findById(doc.leaveType);

    // update only if applied leave is sick or casual leave and status is approved
    if (
      [leaveType.casualLeave, leaveType.sickLeave].includes(
        leaveTypeDoc.name
      ) &&
      doc.leaveStatus === LEAVE_APPROVED
    ) {
      const latestYearQuarter = await LeaveQuarter.findOne().sort({
        createdAt: -1
      });
      const user = await User.findOne({ _id: doc.user });

      const isNotOnProbation =
        user.position.name !== POSITIONS.intern &&
        user.position.name !== POSITIONS.probation;

      const userLeave = await UserLeave.findOne({
        fiscalYear: latestYearQuarter.fiscalYear,
        user: doc.user
      });

      let userLeaveToUpdate = [...userLeave.leaves],
        remainingCasualLeaves =
          userLeave.remainingCasualLeaves && userLeave.remainingCasualLeaves,
        remainingSickLeaves =
          userLeave.remainingSickLeaves && userLeave.remainingSickLeaves;

      doc.leaveDates.forEach(async (leave) => {
        const leaveTakenQuarter = latestYearQuarter.quarters.find(
          (quarter) =>
            new Date(quarter.fromDate) <= new Date(leave) &&
            new Date(leave) <= new Date(quarter.toDate)
        );
        const isLeaveDateAfterPermanent =
          !user.statusChangeDate ||
          new Date(user.statusChangeDate) <= new Date(leave);
        // LEAVE TYPE CASUAL AND IS THIS QUARTER THEN DEDUCT FROM REMAININGCASUALLEAVES
        if (
          leaveType.casualLeave === leaveTypeDoc.name &&
          leaveTakenQuarter &&
          isNotOnProbation &&
          isLeaveDateAfterPermanent
        )
          remainingCasualLeaves =
            remainingCasualLeaves - (doc.halfDay ? 0.5 : 1);

        // LEAVE TYPE SICK AND IS THIS QUARTER THEN DEDUCT FROM REMAININGSICKLEAVES
        if (
          leaveType.sickLeave === leaveTypeDoc.name &&
          leaveTakenQuarter &&
          isNotOnProbation &&
          isLeaveDateAfterPermanent
        )
          remainingSickLeaves = remainingSickLeaves - (doc.halfDay ? 0.5 : 1);

        const updateLeave = userLeaveToUpdate.map((x) => {
          if (user.statusChangeDate && isLeaveDateAfterPermanent) {
            return leaveTakenQuarter &&
              x.quarter._id.toString() === leaveTakenQuarter._id.toString()
              ? {
                  ...JSON.parse(JSON.stringify(x)),
                  approvedLeaves: {
                    sickLeaves:
                      leaveType.sickLeave === leaveTypeDoc.name
                        ? doc.halfDay
                          ? x.approvedLeaves.sickLeaves + 0.5
                          : x.approvedLeaves.sickLeaves + 1
                        : x.approvedLeaves.sickLeaves,
                    casualLeaves:
                      leaveType.casualLeave === leaveTypeDoc.name
                        ? doc.halfDay
                          ? x.approvedLeaves.casualLeaves + 0.5
                          : x.approvedLeaves.casualLeaves + 1
                        : x.approvedLeaves.casualLeaves
                  },
                  remainingLeaves: doc.halfDay
                    ? x.remainingLeaves - 0.5
                    : x.remainingLeaves - 1
                }
              : x;
          }

          return (!user.statusChangeDate &&
            leaveTakenQuarter &&
            x.quarter._id.toString() === leaveTakenQuarter._id.toString()) ||
            (isLeaveDateAfterPermanent &&
              leaveTakenQuarter &&
              x.quarter._id.toString() === leaveTakenQuarter._id.toString())
            ? {
                ...JSON.parse(JSON.stringify(x)),
                approvedLeaves: {
                  sickLeaves:
                    leaveType.sickLeave === leaveTypeDoc.name
                      ? doc.halfDay
                        ? x.approvedLeaves.sickLeaves + 0.5
                        : x.approvedLeaves.sickLeaves + 1
                      : x.approvedLeaves.sickLeaves,
                  casualLeaves:
                    leaveType.casualLeave === leaveTypeDoc.name
                      ? doc.halfDay
                        ? x.approvedLeaves.casualLeaves + 0.5
                        : x.approvedLeaves.casualLeaves + 1
                      : x.approvedLeaves.casualLeaves
                },
                remainingLeaves: doc.halfDay
                  ? x.remainingLeaves - 0.5
                  : x.remainingLeaves - 1
              }
            : x;
        });

        userLeaveToUpdate = [...updateLeave];
      });
      userLeave.leaves = userLeaveToUpdate;
      userLeave.remainingCasualLeaves = remainingCasualLeaves;
      userLeave.remainingSickLeaves = remainingSickLeaves;
      await userLeave.save();
      await sendPushNotification({
        to: user.pushToken,
        sound: 'default',
        title: 'Leave Approved',
        body: 'And here is the body!'
      });
    }
  }
});

const Leave = mongoose.model('Leave', leaveSchema);
module.exports = Leave;
