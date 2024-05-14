const express = require('express');

const configurationsController = require('../../controllers/configurations/configurationsController');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

router.get('/', configurationsController.getAllConfigurations);
router.patch('/update', configurationsController.updateConfiguration);
router.patch(
  '/update-latearrival-threshold',
  authMiddleware.protect,
  configurationsController.updateLateAttendanceThreshold
);

module.exports = router;
