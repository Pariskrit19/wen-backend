const express = require('express');

const emailSettingController = require('../../controllers/email/emailSettingController');

const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(emailSettingController.getAllEmails)
  .post(authMiddleware.protect, emailSettingController.createEmail);

router
  .route('/:id')
  .get(emailSettingController.getEmail)
  .patch(authMiddleware.protect, emailSettingController.updateEmail)
  .delete(authMiddleware.protect, emailSettingController.deleteEmail);

module.exports = router;
