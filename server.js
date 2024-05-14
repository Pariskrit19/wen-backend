const mongoose = require('mongoose');
const dotenv = require('dotenv');
const { createServer } = require('http');
const { Server: SocketServer } = require('socket.io');

// Handle uncaught exception of application and exit application
process.on('uncaughtException', (err) => {
  console.log('UNCAUGHT EXCEPTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  process.exit(1);
});

// Load config variables
dotenv.config({ path: './config.env' });
const app = require('./app');
const {
  registerActivityLogHandlers
} = require('./socketHandlers/activityLogHandlers');
const {
  registerNotificationHandlers
} = require('./socketHandlers/notificationHandlers');
const { registerLeaveHandlers } = require('./socketHandlers/leaveHandlers');
const logger = require('./utils/logger');

// Replace db password stored in config file
const DB = process.env.DATABASE.replace(
  '<PASSWORD>',
  process.env.DATABASE_PASSWORD
);

// Connect mongo db using mongoose client
// mongoose
//   .connect('mongodb://wenappu:w3nN3pal@192.168.2.5:27017/wen-app-v2', {
//     useNewUrlParser: true
//   })
//   .then(() => console.log('DB connection successful!'));

// mongoose
//   .connect('mongodb://wenstagingu:st1g9ngUs3r@192.168.2.5:27017/wen-staging', {
//     useNewUrlParser: true
//   })
//   .then(() => console.log('DB connection successful!'));
mongoose
  .connect(DB, {
    useNewUrlParser: true
  })
  .then(() => console.log('DB connection successful!'));

const expressServer = createServer(app);
const io = new SocketServer(expressServer);

io.on('connection', (socket) => {
  console.log('successful connection of socket', socket.id);

  registerActivityLogHandlers(io, socket);
  registerNotificationHandlers(io, socket);
  registerLeaveHandlers(io, socket);

  socket.on('disconnect', () => {
    console.log('socket disconnected');
  });
});

// Start express node application
const port = process.env.PORT || 3000;
const server = expressServer.listen(port, () => {
  // console.log(`App running on port ${port}...`);
  logger.info(`App running on port ${port}...`);
});

// Handle unhandled promise of application and exit application
process.on('unhandledRejection', (err) => {
  logger.error(
    `UNHANDLED REJECTION! 💥 Shutting down...${err.name}-${err.message}`
  );
  // console.log('UNHANDLED REJECTION! 💥 Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
});

module.exports = expressServer;
