const asyncError = require('../utils/asyncError');
const Configurations = require('../models/configurations/configurationsModel');

/**
 * check if maintenance mode is on
 */
exports.checkMaintenanceMode = asyncError(async (req, res, next) => {
  const configs = await Configurations.find();
  if (configs[0] && configs[0].isMaintenanceEnabled) {
    return res.status(503).json({
      status: 'error',
      data: {
        isMaintenanceEnabled: true,
        message: 'service unavailable!  please try again later'
      }
    });
  }

  next();
});
