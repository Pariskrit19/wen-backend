const express = require('express');

const policyController = require('../../controllers/resources/policyController');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(policyController.getAllPolicies)
  .post(authMiddleware.protect, policyController.createPolicy);

router
  .route('/:id')
  .get(policyController.getPolicy)
  .patch(authMiddleware.protect, policyController.updatePolicy)
  .delete(authMiddleware.protect, policyController.deletePolicy);

module.exports = router;
