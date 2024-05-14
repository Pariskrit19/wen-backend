const asyncError = require('../utils/asyncError');
const AppError = require('../utils/appError');
const APIFeatures = require('../utils/apiFeatures');
const {
  DELETE_ACTIVITY_LOG_MESSAGE,
  UPDATE_ACTIVITY_LOG_MESSAGE,
  CREATE_ACTIVITY_LOG_MESSAGE,
  LEAVETYPES,
  POSITIONS,
  LEAVE_PENDING
} = require('../utils/constants');
const User = require('../models/users/userModel');
const UserLeave = require('../models/leaves/UserLeavesModel');
const LeaveTypes = require('../models/leaves/leaveTypeModel');
const Leave = require('../models/leaves/leaveModel');
const { LeaveQuarter } = require('../models/leaves/leaveQuarter');
const {
  todayDate,
  getNumberOfMonthsInAQuarter,
  sendPushNotification
} = require('../utils/common');
const { encrypt } = require('../utils/crypto');
const { default: mongoose } = require('mongoose');

exports.getOne = (Model, popOptions, secretKey) =>
  asyncError(async (req, res, next) => {
    let query = Model.findById(req.params.id);
    if (popOptions) query = query.populate(popOptions);

    const features = new APIFeatures(query, req.query)
      .filter()
      .sort()
      .limitFields();

    const doc = await features.query;

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    res.status(200).json({
      status: 'success',
      data: secretKey
        ? encrypt(
            {
              data: doc
            },
            secretKey
          )
        : {
            data: doc
          }
    });
  });

exports.getAll = (Model, secretKey) =>
  asyncError(async (req, res, next) => {
    const features = new APIFeatures(Model.find({}), req.query)
      .filter()
      .sort()
      .limitFields()
      .paginate()
      .search();

    const [doc, count] = await Promise.all([
      features.query,
      Model.countDocuments(features.formattedQuery)
    ]);

    res.status(200).json({
      status: 'success',
      results: doc.length,
      data: secretKey
        ? encrypt(
            {
              data: doc,
              count
            },
            secretKey
          )
        : {
            data: doc,
            count
          }
    });
  });

exports.createOne = (Model, LogModel, ModelToLog) =>
  asyncError(async (req, res, next) => {
    const reqBody = { ...req.body, createdBy: req.user.id };

    const doc = await Model.create(reqBody);

    let newDoc = null;
    if (ModelToLog === 'Leave' || ModelToLog === 'Attendance') {
      newDoc = await User.findOne({ _id: doc.user });
    }
    if (LogModel) {
      if (ModelToLog === 'Attendance') {
        if (req.user.name !== newDoc.name) {
          LogModel.create({
            status: 'created',
            module: ModelToLog,
            activity: CREATE_ACTIVITY_LOG_MESSAGE[ModelToLog](
              req.user.name,
              ModelToLog,
              newDoc.name || newDoc.title,
              reqBody.punchOutTime
            ),
            user: {
              name: req.user.name,
              photo: req.user.photoURL
            }
          });
        }
      } else {
        LogModel.create({
          status: 'created',
          module: ModelToLog,
          activity: CREATE_ACTIVITY_LOG_MESSAGE[ModelToLog](
            req.user.name,
            ModelToLog,
            newDoc ? newDoc.name || newDoc.title : doc.name || doc.title
          ),
          user: {
            name: req.user.name,
            photo: req.user.photoURL
          }
        });
      }
    }

    if (ModelToLog === 'Notice') {
      const users = await User.find({ active: true });
      const expoTokensOfUsersToSend = users
        .map((user) => user.pushToken)
        .filter((token) => token);
      await sendPushNotification({
        to: expoTokensOfUsersToSend,
        sound: 'default',
        title: 'Notice',
        body: req.body.title,
        data: { type: 'notice' }
      });
    }

    res.status(201).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.updateOne = (Model, LogModel, ModelToLog) =>
  asyncError(async (req, res, next) => {
    let prevDoc = null;

    if (ModelToLog === 'User') {
      prevDoc = await Model.findById(req.params.id);
    }
    const reqBody = { ...req.body, updatedBy: req.user.id };
    if (ModelToLog === 'Leave') {
      const previousState = await Model.findById(req.params.id);
      if (previousState.leaveStatus !== LEAVE_PENDING) {
        return next(
          new AppError('Leave record has been modified. Please refresh')
        );
      }
    }
    const doc = await Model.findByIdAndUpdate(req.params.id, reqBody, {
      new: true,
      runValidators: true
    });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }
    let newDoc = null;

    if (ModelToLog === 'User') {
      // const joinedDate = doc.joinDate;
      // const currentQuarter = req.fiscalYear.currentQuarter;

      const quarters = await LeaveQuarter.find()
        .sort({
          createdAt: -1
        })
        .limit(1);

      const currentFiscalYearQuarters = quarters[0].quarters;
      // JOINED DATE UPDATED OF USER
      // if (
      //   new Date(prevDoc.joinDate).valueOf() !== new Date(joinedDate).valueOf()
      // ) {
      //   const joinedQuarter = currentFiscalYearQuarters.find(
      //     (quarter) =>
      //       quarter.fromDate <= new Date(joinedDate) &&
      //       quarter.toDate >= new Date(joinedDate)
      //   );
      //   const userLeaveDoc = await UserLeave.findOne({ user: doc._id });
      //   userLeaveDoc.leaves = currentFiscalYearQuarters.map(
      //     (quarter, index) => ({
      //       ...userLeaveDoc.leaves[index],
      //       approvedLeaves: {
      //         sickLeaves: 0,
      //         casualLeaves: 0
      //       },
      //       allocatedLeaves:
      //         joinedQuarter._id.toString() === quarter._id.toString()
      //           ? getNumberOfMonthsInAQuarter(
      //               quarter.toDate,
      //               new Date(joinedDate)
      //             )
      //           : getNumberOfMonthsInAQuarter(
      //               currentQuarter.toDate,
      //               currentQuarter.fromDate
      //             ),
      //       remainingLeaves:
      //         joinedQuarter._id.toString() === quarter._id.toString()
      //           ? getNumberOfMonthsInAQuarter(
      //               quarter.toDate,
      //               new Date(joinedDate)
      //             )
      //           : getNumberOfMonthsInAQuarter(
      //               currentQuarter.toDate,
      //               currentQuarter.fromDate
      //             )
      //     })
      //   );

      //   await userLeaveDoc.save();
      // }

      if (req.body.status === 'Permanent') {
        if (prevDoc.status === 'Probation' && doc.status === 'Permanent') {
          // update status change Date of user
          await Model.findByIdAndUpdate(
            req.params.id,
            { statusChangeDate: todayDate() },
            {
              new: true,
              runValidators: true
            }
          );

          const userLeaveDoc = await UserLeave.findOne({
            user: doc._id,
            fiscalYear: req.fiscalYear.fiscalYear
          });
          const userJoinedDate = doc.joinDate;

          const currentQuarter = currentFiscalYearQuarters.find(
            (quarter) =>
              new Date(quarter.fromDate) <= new Date(todayDate()) &&
              new Date(todayDate()) <= new Date(quarter.toDate)
          );
          const userJoinDateInCurrentQuarter =
            new Date(currentQuarter.fromDate) <= new Date(userJoinedDate) &&
            new Date(userJoinedDate) <= new Date(currentQuarter.toDate);
          const currentQuarterAllocatedLeaves =
            currentQuarter.leaves -
            getNumberOfMonthsInAQuarter(todayDate(), currentQuarter.fromDate);

          const casualSickLeaves = await Leave.aggregate([
            { $unwind: '$leaveDates' },

            {
              $match: {
                user: mongoose.Types.ObjectId(req.params.id),
                leaveStatus: { $in: ['approved', 'user cancelled'] },
                leaveDates: { $gte: todayDate() }
              }
            },
            {
              $lookup: {
                from: 'leave_types',
                localField: 'leaveType',
                foreignField: '_id',
                as: 'leaveType',
                pipeline: [
                  {
                    $project: {
                      _id: 0,
                      name: 1
                    }
                  }
                ]
              }
            },
            {
              $match: {
                'leaveType.name': {
                  $in: [LEAVETYPES.casualLeave, LEAVETYPES.sickLeave]
                }
              }
            },

            {
              $group: {
                _id: {
                  leaveType: '$leaveType.name'
                },
                leavesTaken: {
                  $sum: {
                    $cond: [{ $eq: ['$halfDay', ''] }, 1, 0.5]
                  }
                }
              }
            }
          ]);
          const leaveDatas = await Leave.find({
            user: { _id: req.params.id },
            leaveStatus: { $in: ['approved', 'user cancelled'] }
          });
          const currentQuarterCasualSickLeavesCount = leaveDatas.reduce(
            (prev, curr) => {
              const actualLeave = { ...prev };
              curr.leaveDates.map((date) => {
                if (
                  new Date(date) >= todayDate() &&
                  new Date(date) <= new Date(`${currentQuarter.toDate}`)
                ) {
                  if (curr.leaveType.name === LEAVETYPES.sickLeave) {
                    actualLeave.sick += curr.halfDay ? 0.5 : 1;
                  }
                  if (curr.leaveType.name === LEAVETYPES.casualLeave) {
                    actualLeave.casual += curr.halfDay ? 0.5 : 1;
                  }
                }
                if (new Date(date) < todayDate()) {
                  actualLeave.prevLeaves += curr.halfDay ? 0.5 : 1;
                }
                return date;
              });
              return actualLeave;
            },
            { sick: 0, casual: 0, prevLeaves: 0 }
          );

          const sickLeaves =
            casualSickLeaves &&
            casualSickLeaves.length > 0 &&
            casualSickLeaves.find(
              (leave) => leave._id.leaveType[0] === LEAVETYPES.sickLeave
            );
          const casualLeaves =
            casualSickLeaves &&
            casualSickLeaves.length > 0 &&
            casualSickLeaves.find(
              (leave) => leave._id.leaveType[0] === LEAVETYPES.casualLeave
            );

          const sickLeavesCount = sickLeaves ? sickLeaves.leavesTaken : 0;
          const casualLeavesCount = casualLeaves ? casualLeaves.leavesTaken : 0;
          const leaveTypes = await LeaveTypes.find();
          const sickLeave = leaveTypes.find(
            (type) =>
              type.name.toString().toLowerCase() ===
              LEAVETYPES.sickLeave.toString().toLowerCase()
          );
          const causalLeave = leaveTypes.find(
            (type) =>
              type.name.toString().toLowerCase() ===
              LEAVETYPES.casualLeave.toString().toLowerCase()
          );
          const indexOfCurrentQuarter = currentFiscalYearQuarters.findIndex(
            (quarter) =>
              new Date(quarter.fromDate) <= new Date(todayDate()) &&
              new Date(todayDate()) <= new Date(quarter.toDate)
          );

          const futureQuartersLeaves = currentFiscalYearQuarters
            .slice(indexOfCurrentQuarter + 1)
            .reduce((acc, q) => (q.leaves ? acc + q.leaves : 0), 0);

          const updatedYearAllocatedLeave =
            futureQuartersLeaves + currentQuarterAllocatedLeaves;

          const totalSickCausalLeave =
            sickLeave.leaveDays + causalLeave.leaveDays;

          const leaveNotEntitled =
            totalSickCausalLeave - (updatedYearAllocatedLeave || 0);
          const isIntern =
            prevDoc.position && prevDoc.position.name === POSITIONS.intern;

          userLeaveDoc.leaves = userLeaveDoc.leaves.map((leave) => {
            if (
              leave.quarter._id.toString() === currentQuarter._id.toString()
            ) {
              // add back casual leaves taken
              const remainingLeaves =
                leave.remainingLeaves +
                // currentQuarterCasualSickLeavesCount.prevLeaves +
                currentQuarterCasualSickLeavesCount.sick +
                currentQuarterCasualSickLeavesCount.casual;
              const isRemainingLeavesNegativeOrZero =
                leave.remainingLeaves <= 0;
              const currentRemainingLeaves = isRemainingLeavesNegativeOrZero
                ? 0
                : leave.remainingLeaves;
              // const currentRemainingLeaves =
              //   leave.remainingLeaves +
              //   currentQuarterCasualSickLeavesCount.prevLeaves;

              const carriedOverProbationLeaves =
                isIntern || isRemainingLeavesNegativeOrZero
                  ? 0
                  : remainingLeaves -
                    leave.allocatedLeaves +
                    getNumberOfMonthsInAQuarter(
                      todayDate(),
                      userJoinDateInCurrentQuarter
                        ? userJoinedDate
                        : currentQuarter.fromDate
                    );

              const isCarriedOverProbationLeavesNegative =
                carriedOverProbationLeaves < 0;
              const actualCarriedOverLeaves =
                isCarriedOverProbationLeavesNegative
                  ? 0
                  : carriedOverProbationLeaves;
              userLeaveDoc.remainingCasualLeaves =
                leaveNotEntitled > sickLeave.leaveDays
                  ? causalLeave.leaveDays -
                    (leaveNotEntitled - sickLeave.leaveDays) +
                    actualCarriedOverLeaves -
                    casualLeavesCount
                  : causalLeave.leaveDays +
                    actualCarriedOverLeaves -
                    casualLeavesCount;

              // if leave not entitled is greater than sick leaves, no sick leave is allocated.
              userLeaveDoc.remainingSickLeaves =
                leaveNotEntitled > sickLeave.leaveDays
                  ? 0 - sickLeavesCount
                  : sickLeave.leaveDays - leaveNotEntitled - sickLeavesCount;
              return {
                ...leave,
                allocatedLeaves: currentQuarterAllocatedLeaves,
                remainingLeaves:
                  isIntern || isRemainingLeavesNegativeOrZero
                    ? currentQuarterAllocatedLeaves -
                      currentQuarterCasualSickLeavesCount.casual -
                      currentQuarterCasualSickLeavesCount.sick
                    : currentQuarterAllocatedLeaves +
                      (isCarriedOverProbationLeavesNegative
                        ? 0
                        : currentRemainingLeaves -
                          leave.allocatedLeaves +
                          getNumberOfMonthsInAQuarter(
                            todayDate(),
                            userJoinDateInCurrentQuarter
                              ? userJoinedDate
                              : currentQuarter.fromDate
                          )),

                approvedLeaves: {
                  sickLeaves: currentQuarterCasualSickLeavesCount.sick,
                  casualLeaves: currentQuarterCasualSickLeavesCount.casual
                },
                carriedOverLeaves:
                  isIntern ||
                  isRemainingLeavesNegativeOrZero ||
                  isCarriedOverProbationLeavesNegative
                    ? 0
                    : carriedOverProbationLeaves
              };
            }

            if (new Date(leave.quarter.fromDate) > new Date(todayDate())) {
              const singleQuarter = currentFiscalYearQuarters.find(
                (quarter) =>
                  quarter._id.toString() === leave.quarter._id.toString()
              );
              return {
                ...leave,
                allocatedLeaves: singleQuarter.leaves,
                remainingLeaves: singleQuarter.leaves
              };
            }

            return leave;
          });

          await userLeaveDoc.save();
        }
      }
    }

    if (ModelToLog === 'Attendance') {
      newDoc = await User.findOne({ _id: doc.user });
    }

    if (LogModel) {
      if (ModelToLog === 'Attendance') {
        LogModel.create({
          status: 'updated',
          module: ModelToLog,
          activity: UPDATE_ACTIVITY_LOG_MESSAGE[ModelToLog](
            req.user.name,
            ModelToLog,
            newDoc.name || newDoc.title,
            reqBody.punchOutTime ? 'Out' : 'In'
          ),
          user: {
            name: req.user.name,
            photo: req.user.photoURL
          }
        });
      } else if (ModelToLog === 'Leave') {
        LogModel.create({
          status: 'updated',
          module: ModelToLog,
          activity: UPDATE_ACTIVITY_LOG_MESSAGE[ModelToLog](
            req.user.name,
            ModelToLog,
            doc.user.name
          ),
          user: {
            name: req.user.name,
            photo: req.user.photoURL
          }
        });
      } else {
        LogModel.create({
          status: 'updated',
          module: ModelToLog,
          activity: UPDATE_ACTIVITY_LOG_MESSAGE[ModelToLog](
            req.user.name,
            ModelToLog,
            doc.name || doc.title
          ),
          user: {
            name: req.user.name,
            photo: req.user.photoURL
          }
        });
      }
    }

    res.status(200).json({
      status: 'success',
      data: {
        data: doc
      }
    });
  });

exports.deleteOne = (Model, LogModel, ModelToLog) =>
  asyncError(async (req, res, next) => {
    const doc = await Model.findOneAndDelete({ _id: req.params.id });

    if (!doc) {
      return next(new AppError('No document found with that ID', 404));
    }

    if (LogModel) {
      LogModel.create({
        status: 'deleted',
        module: ModelToLog,
        activity: DELETE_ACTIVITY_LOG_MESSAGE[ModelToLog](
          req.user.name,
          ModelToLog,
          ModelToLog === 'TimeLog'
            ? (doc.project && doc.project.name) || 'Other'
            : doc.name || doc.title
        ),
        user: {
          name: req.user.name,
          photo: req.user.photoURL
        }
      });
    }

    res.status(200).json({
      status: 'success',
      data: doc
    });
  });
