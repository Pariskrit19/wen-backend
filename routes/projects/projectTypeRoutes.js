const express = require('express');

const projectTypeController = require('../../controllers/projects/projectTypeController');
const authMiddleware = require('../../middlewares/authMiddleware');
const Project = require('../../models/projects/projectModel');

const router = express.Router();

router
  .route('/')
  .get(projectTypeController.getAllProjectTypes)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    projectTypeController.createProjectType
  );

router
  .route('/:id')
  .get(projectTypeController.getProjectType)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    projectTypeController.updateProjectType
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    authMiddleware.checkIfValueToDeleteIsUsed(
      Project,
      'projectTypes',
      'Project Types'
    ),

    projectTypeController.deleteProjectType
  );

module.exports = router;
