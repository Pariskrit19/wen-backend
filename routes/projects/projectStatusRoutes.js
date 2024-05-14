const express = require('express');

const projectStatusController = require('../../controllers/projects/projectStatusController');
const authMiddleware = require('../../middlewares/authMiddleware');
const Project = require('../../models/projects/projectModel');

const router = express.Router();

router
  .route('/')
  .get(projectStatusController.getAllProjectStatus)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    projectStatusController.createProjectStatus
  );

router
  .route('/:id')
  .get(projectStatusController.getProjectStatus)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    projectStatusController.updateProjectStatus
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    authMiddleware.checkIfValueToDeleteIsUsed(
      Project,
      'projectStatus',
      'Project Status'
    ),

    projectStatusController.deleteProjectStatus
  );

module.exports = router;
