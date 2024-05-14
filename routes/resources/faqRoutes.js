const express = require('express');

const faqController = require('../../controllers/resources/faqController');
const authMiddleware = require('../../middlewares/authMiddleware');

const router = express.Router();

router
  .route('/')
  .get(faqController.getAllFAQs)
  .post(authMiddleware.protect, faqController.createFAQ);

router
  .route('/:id')
  .get(faqController.getFAQ)
  .patch(authMiddleware.protect, faqController.updateFAQ)
  .delete(authMiddleware.protect, faqController.deleteFAQ);

module.exports = router;
