const express = require('express');
const userLeavesController = require('../../controllers/leaves/userLeavesController');

const router = express.Router();

router
  .route('/')
  .get(userLeavesController.getUserLeave)
  .post(userLeavesController.createUserLeave);

router.route('/:id').patch(userLeavesController.updateUserLeave);

module.exports = router;
