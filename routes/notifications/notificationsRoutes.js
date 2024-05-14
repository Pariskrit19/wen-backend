const express = require('express');

const notificationsController = require('../../controllers/notifications/notificationController');

const router = express.Router();

router
  .route('/')
  .get(notificationsController.getAllNotifications)
  .delete(notificationsController.deleteNotification)
  .patch(notificationsController.updateNotification)
  .post(notificationsController.createNotification);

router
  .route('/apply-leave-notification')
  .get(notificationsController.notifyToApplyLeave);

//soft-delete single notification
router
  .route('/delete-notification')
  .delete(notificationsController.deleteSingleNotification);

// get all not-deleted Notification
router
  .route('/get-available-notifications')
  .get(notificationsController.getNotDeletedNotifications);

module.exports = router;
