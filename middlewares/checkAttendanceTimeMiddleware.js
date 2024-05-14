const asyncError = require('../utils/asyncError');
const AppError = require('../utils/appError');
const Attendance = require('../models/attendances/attendanceModel');
const { default: mongoose } = require('mongoose');

/**
 * check attendace time middleware for user attendance
 */
exports.checkAttendaceTime = asyncError(async (req, res, next) => {
  const now = new Date();

  if (req.body.user) {
    next();
    return;
  }

  if (req.body.punchInTime) {
    const punchInTime = new Date(req.body.punchInTime);
    if (
      !(
        punchInTime > new Date(new Date(now.getTime() - 1000 * 60 * 2)) &&
        punchInTime < new Date(new Date().getTime() + 1000 * 60 * 2)
      )
    )
      return next(new AppError('Please Enter Current Time To Punch In', 403));
  }

  if (req.body.punchOutTime) {
    const punchOutTime = new Date(req.body.punchOutTime);
    if (
      !(
        punchOutTime > new Date(new Date(now.getTime() - 1000 * 60 * 2)) &&
        punchOutTime < new Date(new Date().getTime() + 1000 * 60 * 2)
      )
    )
      return next(new AppError('Please Enter Current Time To Punch Out', 403));
  }

  next();
});

exports.checkIfAlreadyPunchedInOrPunchedOut = asyncError(
  async (req, res, next) => {
    const isPunchedIn = req.body.hasOwnProperty('punchInTime');
    const userId = req.body.user ? req.body.user : req.user._id;
    let attendance = null;
    let showError = false;
    if (isPunchedIn) {
      attendance = await Attendance.find({
        attendanceDate: new Date(req.body.attendanceDate),
        user: userId
      });
      if (
        attendance.at(-1) &&
        !attendance.at(-1).punchOutTime &&
        attendance.length > 0
      )
        showError = true;
    } else {
      attendance = await Attendance.find({
        _id: mongoose.Types.ObjectId(req.params.id)
      });
      const alreadyPunchedOut =
        attendance && attendance[0] && attendance[0].punchOutTime;
      if (alreadyPunchedOut) showError = true;
    }

    if (showError) {
      return next(
        new AppError('You have already punched. Please refresh.', 400)
      );
    }

    next();
  }
);

exports.setIpForAttendance = asyncError(async (req, res, next) => {
  req.body.punchInIp =
    req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  next();
});
