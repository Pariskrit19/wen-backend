const asyncError = require('../utils/asyncError');
const { LeaveQuarter } = require('../models/leaves/leaveQuarter');
const { todayDate } = require('../utils/common');

/**
 * Get current fiscal Year start and end date
 */
exports.getFiscalYear = asyncError(async (req, res, next) => {
  const latestYearQuarter = await LeaveQuarter.findOne().sort({
    createdAt: -1
  });

  const currentQuarter = latestYearQuarter.quarters.find(
    (quarter) =>
      new Date(quarter.fromDate) <= new Date(todayDate()) &&
      new Date(todayDate()) <= new Date(quarter.toDate)
  );

  req.fiscalYear = {
    currentFiscalYearStartDate: new Date(
      latestYearQuarter.quarters[0].fromDate
    ),
    currentFiscalYearEndDate: new Date(
      latestYearQuarter.quarters[latestYearQuarter.quarters.length - 1].toDate
    ),
    fiscalYear: latestYearQuarter.fiscalYear,
    currentQuarter,
    quarters: latestYearQuarter.quarters
  };

  next();
});
