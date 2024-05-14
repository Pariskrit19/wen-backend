const express = require('express');

const userPositionTypeController = require('../../controllers/users/userPositionTypeController');
const authMiddleware = require('../../middlewares/authMiddleware');
const User = require('../../models/users/userModel');

const router = express.Router();

router
  .route('/')
  .get(userPositionTypeController.getAllUserPositionTypes)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'manager', 'hr'),
    userPositionTypeController.createUserPositionType
  );

router
  .route('/:id')
  .get(userPositionTypeController.getUserPositionType)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'manager', 'hr'),
    userPositionTypeController.updateUserPositionType
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'manager', 'hr'),
    authMiddleware.checkIfValueToDeleteIsUsed(
      User,
      'positionType',
      'Position Type'
    ),

    userPositionTypeController.deleteUserPositionType
  );

module.exports = router;
