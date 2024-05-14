const express = require('express');

const projectTagController = require('../../controllers/projects/projectTagController');
const authMiddleware = require('../../middlewares/authMiddleware');
const Project = require('../../models/projects/projectModel');

const router = express.Router();

router
  .route('/')
  .get(projectTagController.getAllProjectTags)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    projectTagController.createProjectTag
  );

router
  .route('/:id')
  .get(projectTagController.getProjectTag)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    projectTagController.updateProjectTag
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    authMiddleware.checkIfValueToDeleteIsUsed(
      Project,
      'projectTags',
      'Project Tags'
    ),

    projectTagController.deleteProjectTag
  );

module.exports = router;
