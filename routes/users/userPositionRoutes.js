const express = require('express');

const userPositionController = require('../../controllers/users/userPositionController');
const authMiddleware = require('../../middlewares/authMiddleware');
const User = require('../../models/users/userModel');

const router = express.Router();

router
  .route('/')
  .get(userPositionController.getAllUserPositions)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'manager', 'hr'),
    userPositionController.createUserPosition
  );

router
  .route('/:id')
  .get(userPositionController.getUserPosition)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'manager', 'hr'),
    userPositionController.updateUserPosition
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'manager', 'hr'),
    authMiddleware.checkIfValueToDeleteIsUsed(User, 'position', 'Position'),
    userPositionController.deleteUserPosition
  );

module.exports = router;
