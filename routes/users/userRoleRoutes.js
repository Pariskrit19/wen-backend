const express = require('express');

const userRoleController = require('../../controllers/users/userRoleController');
const authMiddleware = require('../../middlewares/authMiddleware');
const User = require('../../models/users/userModel');

const router = express.Router();

router
  .route('/')
  .get(userRoleController.getAllUserRoles)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'manager', 'hr'),
    userRoleController.createUserRole
  );

router
  .route('/:id')
  .get(userRoleController.getUserRole)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'manager', 'hr'),
    userRoleController.updateUserRole
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'manager', 'hr'),
    authMiddleware.checkIfValueToDeleteIsUsed(User, 'role', 'Role'),

    userRoleController.deleteUserRole
  );

module.exports = router;
