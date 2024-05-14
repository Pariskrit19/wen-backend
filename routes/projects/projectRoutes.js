const express = require('express');

const projectController = require('../../controllers/projects/projectController');
const timeLogRouter = require('../timelogs/timeLogRoutes');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();
router.get('/maintenance', projectController.projectMaintenanceReminder);

router.use('/:projectId/timelogs', timeLogRouter);

router.get('/search/:term', projectController.searchProject);
router.get('/:projectId/totaltime', projectController.getTotalTimeSpent);
router.get('/:projectId/weeklytime', projectController.getWeeklyTimeSpent);

router
  .route('/')
  .get(projectController.getAllProjects)
  .post(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    projectController.createProject
  );

router
  .route('/:id')
  .get(projectController.getProject)
  .patch(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager', 'editor'),
    projectController.updateProject
  )
  .delete(
    authMiddleware.protect,
    authMiddleware.restrictTo('admin', 'lead', 'manager'),
    projectController.deleteProject
  );

module.exports = router;
