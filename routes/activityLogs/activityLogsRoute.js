const express = require('express');

const activityLogsController = require('../../controllers/activityLogs/activityLogsController');

const router = express.Router();

router
  .route('/')
  .get(activityLogsController.getAllActivityLogs)
  .post(activityLogsController.createActivityLog)
  .delete(activityLogsController.deleteActivityLog)
  .patch(activityLogsController.updateActivityLog);

module.exports = router;
