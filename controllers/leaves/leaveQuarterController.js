const { LeaveQuarter } = require('../../models/leaves/leaveQuarter');
const factory = require('../factoryController');
const ActivityLogs = require('../../models/activityLogs/activityLogsModel');
const asyncError = require('../../utils/asyncError');
const {
  CREATE_ACTIVITY_LOG_MESSAGE,
  UPDATE_ACTIVITY_LOG_MESSAGE
} = require('../../utils/constants');
const UserLeave = require('../../models/leaves/UserLeavesModel');
const AppError = require('../../utils/appError');
const User = require('../../models/users/userModel');
const Leave = require('../../models/leaves/leaveModel');

exports.getLeaveQuarter = factory.getOne(LeaveQuarter);
exports.getAllLeaveQuarters = factory.getAll(LeaveQuarter);
exports.createLeaveQuarters = asyncError(async (req, res, next) => {
  const reqBody = { ...req.body, createdBy: req.user.id };

  const doc = await LeaveQuarter.create(reqBody);

  // Only for Staging and testing
  // const doc1 = await UserLeave.deleteMany();
  // const doc2 = await Leave.deleteMany();
  // console.log(doc1);

  ActivityLogs.create({
    status: 'created',
    module: 'Leave Quarter',
    activity: CREATE_ACTIVITY_LOG_MESSAGE['Leave Quarter'](
      req.user.name,
      'Leave Quarter',
      doc.name || doc.title
    ),
    user: {
      name: req.user.name,
      photo: req.user.photoURL
    }
  });
  req.isQuarterCreated = true;
  req.quarters = doc;
  next();
});
exports.updateLeaveQuarters = asyncError(async (req, res, next) => {
  const reqBody = { ...req.body, updatedBy: req.user.id };
  const quarters = await LeaveQuarter.find()
    .sort({
      createdAt: -1
    })
    .limit(1);
  const doc = await LeaveQuarter.findByIdAndUpdate(req.params.id, reqBody, {
    new: true,
    runValidators: true
  });

  if (!doc) {
    return next(new AppError('No document found with that ID', 404));
  }

  // New Quarter is added then add new quarter to each user's user leave also
  if (req.body.quarters.length > quarters[0].quarters.length)
    UserLeave.updateMany(
      { active: true },
      {
        $push: {
          leaves: {
            approvedLeaves: {
              sickLeaves: 0,
              casualLeaves: 0
            },
            allocatedLeaves: 0,
            remainingLeaves: 0,
            carriedOverLeaves: 0,
            leaveDeductionBalance: 0,
            quarter: {
              ...req.body.quarters[req.body.quarters.length - 1],
              _id: doc.quarters[doc.quarters.length - 1]._id
            }
          }
        }
      },
      function (err, result) {
        if (err) {
          console.error('Error updating documents:', err);
        } else {
          console.log(
            `${result.modifiedCount} documents updated successfully.`
          );
        }
      }
    );

  // New Quarter is removed then remove from each user's user Leave quarter also
  if (req.body.quarters.length < quarters[0].quarters.length) {
    const deletedQuarters = quarters[0].quarters.filter(
      (quarter, index) =>
        !quarter._id.equals(
          req.body.quarters[index] && req.body.quarters[index]._id
        )
    );
    UserLeave.updateMany(
      { active: true },
      {
        $pull: {
          leaves: {
            $elemMatch: {
              $and: deletedQuarters
            }
          }
        }
      },
      function (err, result) {
        if (err) {
          console.error('Error updating documents:', err);
        } else {
          console.log(
            `${result.modifiedCount} documents updated successfully.`
          );
        }
      }
    );
  }

  ActivityLogs.create({
    status: 'updated',
    module: 'Leave Quarter',
    activity: UPDATE_ACTIVITY_LOG_MESSAGE['Leave Quarter'](
      req.user.name,
      'Leave Quarter',
      doc.name || doc.title
    ),
    user: {
      name: req.user.name,
      photo: req.user.photoURL
    }
  });

  res.status(200).json({
    status: 'success',
    data: {
      data: doc
    }
  });
});
// factory.updateOne(
//   LeaveQuarter,
//   ActivityLogs,
//   'Leave Quarter'
// );
exports.deleteLeaveQuarters = factory.deleteOne(
  LeaveQuarter,
  ActivityLogs,
  'Leave Quarter'
);
