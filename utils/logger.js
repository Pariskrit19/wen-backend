const winston = require('winston');

const { combine, timestamp, json, colorize, align, printf, errors } =
  winston.format;

const isProductionEnv = process.env.NODE_ENV === 'production';

const logger = winston.createLogger({
  level: isProductionEnv ? 'error' : 'info',
  format: combine(
    colorize({ all: true }),
    timestamp({ format: 'YYYY-MM-DD hh:mm A' }),
    // align(),
    printf(
      (info) =>
        `[${info.timestamp}] ${info.level}: ${info.message} ${
          info.stack ? info.stack : ''
        }`
    ),
    errors({ stack: true })
    // json()
  ),
  transports: [new winston.transports.Console()]
});

module.exports = logger;
