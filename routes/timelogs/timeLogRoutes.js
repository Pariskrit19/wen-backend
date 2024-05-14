const express = require('express');

const projectController = require('../../controllers/projects/projectController');
const timeLogController = require('../../controllers/timelogs/timeLogController');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware.protect);

router.get('/users/weeklytime', timeLogController.getUserWeeklyTimeSpent);
router.get(
  '/users/weeklytimeproject/',
  timeLogController.getWeeklyTimeSpentProject
);
router.get('/users/todaytime', timeLogController.getUserTodayTimeSpent);
router.get('/users/weeklyLogs', timeLogController.getWeeklyLogsOfUser);

router.get('/other/todaytime', timeLogController.getTodayOtherTimeLog);
router.get('/other/weeklytime', timeLogController.getWeeklyOtherTimeLog);
router.get('/other/totalhour', timeLogController.CalculateOtherTotalHour);

router.post('/weeklyreport', timeLogController.getWeeklyReport);
router.post('/chart', timeLogController.getTimelogForChart);
router.post('/worklogs', timeLogController.getWorklogReport);
router.get('/authors', timeLogController.getTimelogAuthors);
router.post('/totalhours', timeLogController.getTotalLogHoursOfAProject);

router.route('/').get(timeLogController.getAllTimeLogs).post(
  projectController.setProjectUserIds,
  // projectController.checkProjectOfUser,
  timeLogController.checkTimeLogDays,
  timeLogController.checkLogTimeHours,
  timeLogController.createTimeLog
);

router
  .route('/:id')
  .get(timeLogController.getTimeLog)
  .patch(
    // projectController.checkProjectOfUser,
    timeLogController.checkTimeLogDays,
    timeLogController.checkLogTimeHours,
    timeLogController.updateTimeLog
  )
  .delete(
    authMiddleware.restrictTo('admin', 'manager', 'lead'),
    timeLogController.deleteTimeLog
  );

module.exports = router;
