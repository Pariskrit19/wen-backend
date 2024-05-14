const express = require('express');

const leaveController = require('../../controllers/leaves/leaveController');
const authMiddleware = require('../../middlewares/authMiddleware');
const fiscalYearMiddleware = require('../../middlewares/fiscalYearMiddleware');
const getWeekDateMiddleware = require('../../middlewares/getweekDateMiddleware');
const sickCasualLeaveTypeMiddleware = require('../../middlewares/sickCausalMiddleware');

const router = express.Router({ mergeParams: true });

router.get('/', leaveController.getAllLeaves);
router.get('/today', leaveController.getTodayLeaves);
router.get('/:id', leaveController.getLeave);
router.get(
  '/users/futureLeaves',
  getWeekDateMiddleware.getWeekDate,
  leaveController.getFutureLeaves
);
router.get('/users/today/count', leaveController.getUsersCountOnLeaveToday);

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router.get('/pending/count', leaveController.getPendingLeavesCount);

router.post(
  '/users/sendEmail',
  leaveController.sendLeaveApplyEmailNotifications
);

router.post(
  '/',
  authMiddleware.setUserIdForNestedRoutes,
  leaveController.createLeave
);
router.patch('/:id', leaveController.updateLeave);

router.get(
  '/users/fiscalYearLeaves',
  fiscalYearMiddleware.getFiscalYear,
  leaveController.getFiscalYearLeaves
);

router.get('/users/today', leaveController.getUsersOnLeaveToday);

router.patch(
  '/:leaveId/status/:status',
  fiscalYearMiddleware.getFiscalYear,
  leaveController.updateLeaveStatus
);
router.patch('/:leaveId/:leaveDate', leaveController.deleteSelectedLeaveDate);

router.get(
  '/:userId/leavedays',
  authMiddleware.setUserIdForNestedRoutes,
  fiscalYearMiddleware.getFiscalYear,
  leaveController.calculateLeaveDays
);

router.post(
  '/filter',
  authMiddleware.restrictTo('admin'),
  leaveController.filterExportLeaves
);
router.delete(
  '/:id',
  authMiddleware.restrictTo('admin'),
  leaveController.deleteLeave
);

module.exports = router;
