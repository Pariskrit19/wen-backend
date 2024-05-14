const express = require('express');

const authMiddleware = require('../../middlewares/authMiddleware');
const holidayController = require('../../controllers/resources/holidaysController');

const router = express.Router();

router.delete(
  '/remove/:id/:holidayId',
  authMiddleware.protect,
  holidayController.removeSingleHolidayOfYear
);

router
  .route('/:id')
  .get(authMiddleware.protect, holidayController.getHoliday)
  .patch(authMiddleware.protect, holidayController.updateHoliday)
  .delete(authMiddleware.protect, holidayController.deleteHoliday);

router
  .route('/')
  .get(authMiddleware.protect, holidayController.getAllHolidays)
  .post(authMiddleware.protect, holidayController.createHoliday);

module.exports = router;
