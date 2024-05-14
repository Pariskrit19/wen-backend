const asyncError = require('../utils/asyncError');
const common = require('../utils/common');

/**
 * Get current fiscal Year start and end date
 */
exports.getWeekDate = asyncError(async (req, res, next) => {
  const today = common.todayDate();
  const afterOneWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
  const afterTwoWeek = new Date(today.getTime() + 14 * 24 * 60 * 60 * 1000);

  req.todayDate = today;
  req.afterOneWeekDate = afterOneWeek;
  req.afterTwoWeek = afterTwoWeek;

  next();
});
