const express = require('express');

const timeLogTypeController = require('../../controllers/timelogs/timeLogTypeController');
const authMiddleware = require('../../middlewares/authMiddleware');
const TimeLog = require('../../models/timelogs/timeLogModel');

const router = express.Router();

router
  .route('/')
  .get(timeLogTypeController.getAllTimeLogTypes)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    timeLogTypeController.createTimeLogType
  );

router
  .route('/:id')
  .get(timeLogTypeController.getTimeLogType)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    timeLogTypeController.updateTimeLogType
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    authMiddleware.checkIfValueToDeleteIsUsed(TimeLog, 'logType', 'Log Type'),

    timeLogTypeController.deleteTimeLogType
  );

module.exports = router;
