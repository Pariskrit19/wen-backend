const express = require('express');

const authController = require('../../controllers/users/authController');
const userController = require('../../controllers/users/userController');
const authMiddleware = require('../../middlewares/authMiddleware');
const leaveRouter = require('../leaves/leaveRoutes');
const attendanceRouter = require('../attendances/attendanceRoutes');
const { getFiscalYear } = require('../../middlewares/fiscalYearMiddleware');

const router = express.Router();

router
  .route('/invite')
  .get(authController.getAllInvitedUsers)
  .post(authMiddleware.protect, authController.inviteUser);
router.post('/signup/:token', authController.signup);
router.post('/loginWithBiometric', authController.loginWithBiometric);
router.post('/storePushToken', authController.storePushToken);

router.post('/forgotPassword', authController.forgotPassword);
router.patch('/resetPassword/:token', authController.resetPassword);
router.post('/verifyOtp', authController.verifyOTP);
router.post('/createOtp', authController.createOTP);
router.patch('/updateMobilePassword', authController.updatePasswordInMobile);

// Protect all routes after this middleware
router.use(authMiddleware.protect);

router.get('/logout', authController.logout);

router.get('/', userController.getAllUsers);

router.get('/count', userController.getActiveUser);

// Assigning nested routes to create user leaves and attendance by admin using a single POST request
router.use('/:userId/leaves', leaveRouter);
router.use('/:userId/attendances', attendanceRouter);

router.patch('/updateMyPassword', authController.updatePassword);
router.get('/me', userController.getMe, userController.getUser);
router.patch('/updateMe', userController.updateMe);
router.delete('/deleteMe', userController.deleteMe);
router.get('/birthday', userController.getBirthMonthUser);
router.get('/salaryReview', userController.getSalarayReviewUsers);

// Restrict routes to admin only after this middleware
router.use(authMiddleware.restrictTo('admin', 'hr'));

router.post('/import', userController.importUsers);
router.patch('/resetAllocatedLeaves', userController.resetAllocatedLeaves);

router
  .route('/:id')
  .get(userController.getUser)
  .patch(getFiscalYear, userController.updateUser)
  .delete(userController.deleteUser);

router.post('/:id/disable', userController.disableUser);

module.exports = router;
