const express = require('express');
const morgan = require('morgan');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const mongoSanitize = require('express-mongo-sanitize');
const xss = require('xss-clean');
const cookieParser = require('cookie-parser');
const compression = require('compression');

const AppError = require('./utils/appError');
const globalErrorHandler = require('./controllers/errorController');

const userRouter = require('./routes/users/userRoutes');
const userRoleRouter = require('./routes/users/userRoleRoutes');
const userPositionRouter = require('./routes/users/userPositionRoutes');
const userPositionTypeRouter = require('./routes/users/userPositionTypeRoutes');

const projectTypeRouter = require('./routes/projects/projectTypeRoutes');
const projectStatusRouter = require('./routes/projects/projectStatusRoutes');
const projectTagRouter = require('./routes/projects/projectTagRoutes');
const clientRouter = require('./routes/projects/clientRoutes');
const projectRouter = require('./routes/projects/projectRoutes');

const timeLogTypeRouter = require('./routes/timelogs/timeLogTypeRoutes');
const timeLogRouter = require('./routes/timelogs/timeLogRoutes');

const leaveTypeRouter = require('./routes/leaves/leaveTypeRoutes');
const leaveQuarterRouter = require('./routes/leaves/leaveQuarterRoutes');

const leaveRouter = require('./routes/leaves/leaveRoutes');

const blogCategoryRouter = require('./routes/blogs/blogCategoryRoutes');
const blogRouter = require('./routes/blogs/blogRoutes');

const noticeTypeRouter = require('./routes/notices/noticeTypeRoutes');
const noticeRouter = require('./routes/notices/noticeRoutes');

const attendanceRouter = require('./routes/attendances/attendanceRoutes');

const faqRouter = require('./routes/resources/faqRoutes');
const policyRouter = require('./routes/resources/policyRoutes');

const holidayRouter = require('./routes/resources/holidayRoutes');

const emailSettingsRouter = require('./routes/emails/emailSettingRoute');
const userLeavesRouter = require('./routes/leaves/userLeavesRoute');

const activityLogsRouter = require('./routes/activityLogs/activityLogsRoute');
const notificationsRouter = require('./routes/notifications/notificationsRoutes');
const configurationsRoutes = require('./routes/configurations/configurationsRoutes');

const authMiddleware = require('./middlewares/authMiddleware');

const { checkTeamAccess } = require('./middlewares/authMiddleware');
const { checkMaintenanceMode } = require('./middlewares/checkMaintenanceMode');
const authController = require('./controllers/users/authController');
const User = require('./models/users/userModel');
const { LeaveQuarter } = require('./models/leaves/leaveQuarter');
const { POSITIONS, LEAVETYPES } = require('./utils/constants');
const UserLeave = require('./models/leaves/UserLeavesModel');
const LeaveType = require('./models/leaves/leaveTypeModel');
const Leave = require('./models/leaves/leaveModel');
const { default: mongoose } = require('mongoose');
const Project = require('./models/projects/projectModel');

// Initialized and start express application
const app = express();

// app.enable('trust proxy');

// Implement CORS
app.use(cors());
// app.options('*', cors());

// Set security HTTP headers
// app.use(helmet());

// Limit requests from same API
const limiter = rateLimit({
  max: 1000000,
  windowMs: 15 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Development logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Body parser, reading data from body into req.body
app.use(
  express.json({
    limit: '20kb'
  })
);
app.use(express.urlencoded({ extended: true, limit: '20kb' }));
app.use(cookieParser());

// Data sanitization against NoSQL query injection
// app.use(mongoSanitize());

// Data sanitization against XSS
// app.use(xss());

// Compression
app.use(compression());

// check Team access Middleware (only for development purpose...)
app.get('/about', (req, res) => {
  res.json({ messge: 'successfully connected to vercel' });
});

app.get('/test', (req, res) => {
  res.json({ messge: 'successfully connected to vercel' });
});

app.use(checkTeamAccess);

app.post('/api/v1/users/login', authController.login);
app.use('/api/v1/configurations', configurationsRoutes);

// check if maintenance mode is on
app.use(checkMaintenanceMode);

// Routes
app.use('/api/v1/activitylogs', activityLogsRouter);
app.use('/api/v1/notifications', notificationsRouter);

app.use('/api/v1/users/roles', userRoleRouter);
app.use('/api/v1/users/positions', userPositionRouter);
app.use('/api/v1/users/positionTypes', userPositionTypeRouter);
app.use('/api/v1/users', userRouter);

app.use('/api/v1/projects/types', projectTypeRouter);
app.use('/api/v1/projects/status', projectStatusRouter);
app.use('/api/v1/projects/tags', projectTagRouter);
app.use('/api/v1/projects/clients', clientRouter);
app.use('/api/v1/projects', projectRouter);

app.use(authMiddleware.protect);

app.use('/api/v1/timelogs/types', timeLogTypeRouter);
app.use('/api/v1/timelogs', timeLogRouter);

app.use('/api/v1/leaves/userLeaves', userLeavesRouter);
app.use('/api/v1/leaves/types', leaveTypeRouter);
app.use('/api/v1/leaves/quarters', leaveQuarterRouter);

app.use('/api/v1/leaves', leaveRouter);

app.use('/api/v1/blogs/categories', blogCategoryRouter);
app.use('/api/v1/blogs', blogRouter);

app.use('/api/v1/notices/types', noticeTypeRouter);
app.use('/api/v1/notices', noticeRouter);

app.use('/api/v1/attendances', attendanceRouter);

app.use('/api/v1/resources/faqs', faqRouter);
app.use('/api/v1/resources/policies', policyRouter);
app.use('/api/v1/resources/holidays', holidayRouter);

app.use('/api/v1/emails', emailSettingsRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;
