const express = require('express');

const attendanceController = require('../../controllers/attendances/attendanceController');
const authMiddleware = require('../../middlewares/authMiddleware');
const checkAttendaceTimeMiddleware = require('../../middlewares/checkAttendanceTimeMiddleware');

const router = express.Router({ mergeParams: true });

router.patch(
  '/:id/punchout',
  authMiddleware.protect,
  checkAttendaceTimeMiddleware.checkAttendaceTime,
  checkAttendaceTimeMiddleware.checkIfAlreadyPunchedInOrPunchedOut,
  attendanceController.updatePunchOutTime
);

router.get(
  '/search',
  authMiddleware.protect,
  attendanceController.searchAttendances
);

router.get(
  '/totalofficehour',
  authMiddleware.protect,
  attendanceController.calculateTotalUserOfficeHour
);

router.get(
  '/today/count',
  authMiddleware.protect,
  attendanceController.getPunchInCountToday
);

router.get(
  '/lateArrival',
  authMiddleware.protect,
  attendanceController.getLateArrivalAttendances
);

router.post(
  '/updateLateAttendace',
  authMiddleware.protect,
  attendanceController.leaveCutForLateAttendace
);

router
  .route('/')
  .get(attendanceController.getAllAttendances)
  .post(
    authMiddleware.protect,
    checkAttendaceTimeMiddleware.checkAttendaceTime,
    authMiddleware.setUserIdForNestedRoutes,
    checkAttendaceTimeMiddleware.checkIfAlreadyPunchedInOrPunchedOut,
    attendanceController.createAttendance
  );

router
  .route('/:id')
  .get(attendanceController.getAttendance)
  .patch(authMiddleware.protect, attendanceController.updateAttendance)
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'hr'),
    attendanceController.deleteAttendance
  );

module.exports = router;
