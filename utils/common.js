const otpGenerator = require('otp-generator');

// Return start and end of week date as object
exports.dateInThisWeek = () => {
  const todayObj = new Date();
  const todayDate = todayObj.getDate();
  const todayDay = todayObj.getDay();

  // Get first date of week
  let firstDayOfWeek = new Date(todayObj.setDate(todayDate - todayDay));

  // Get the date part only
  firstDayOfWeek = firstDayOfWeek.toISOString().split('T')[0];

  // Get last date of week
  let lastDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek.setDate(lastDayOfWeek.getDate() + 6);

  // Get the date part only
  lastDayOfWeek = lastDayOfWeek.toISOString().split('T')[0];

  // Converting date to ISO format with resetting timezone for db data comparision
  firstDayOfWeek = new Date(firstDayOfWeek);
  lastDayOfWeek = new Date(lastDayOfWeek);

  return {
    firstDayOfWeek,
    lastDayOfWeek
  };
};

exports.transformDate = (date = '') => {
  const d = date ? new Date(date) : new Date();
  d.setDate(d.getDate() + 1);
  const finalDate = d.setUTCHours(0, 0, 0, 0);
  return finalDate;
};

exports.todayTomorrowDate = () => {
  let todayDate = new Date();
  todayDate = todayDate.toISOString().split('T')[0];

  let tomorrowDate = new Date(todayDate);
  tomorrowDate.setDate(tomorrowDate.getDate() + 1);
  tomorrowDate = tomorrowDate.toISOString().split('T')[0];

  todayDate = new Date(todayDate);
  tomorrowDate = new Date(tomorrowDate);

  return {
    todayDate,
    tomorrowDate
  };
};

exports.todayDate = () => {
  let todayDate = new Date(new Date().getTime() + 20700000);
  todayDate = todayDate.toISOString().split('T')[0];

  return new Date(todayDate);
};

exports.getStartDateOfTheYear = () =>
  new Date(`${new Date().getFullYear()}-01-01`);

exports.yesterdayDate = (date) => {
  const todayDate = new Date(date ?? new Date());

  todayDate.setDate(todayDate.getDate() - 1);
  const yesterdayDate = todayDate.toISOString().split('T')[0];
  return yesterdayDate;
};

exports.getNumberOfMonthsInAQuarter = (toDate, fromDate) =>
  new Date(toDate).getMonth() -
  new Date(fromDate).getMonth() +
  12 * (new Date(toDate).getFullYear() - new Date(fromDate).getFullYear());

exports.createActivityLogMessage = (user, ModelToLog, name) =>
  `${user} created ${ModelToLog} (${name || ''})`;

exports.updateActivityLogMessage = (user, ModelToLog, name) =>
  `${user} updated ${ModelToLog} (${name || ''})`;

exports.deleteActivityLogMessage = (user, ModelToLog, name) =>
  `${user} deleted ${ModelToLog} (${name || ''})`;

// To add minutes to the current time
exports.addMinutesToDate = (date, minutes) =>
  new Date(date.getTime() + minutes * 60000);

exports.generateOTP = () =>
  otpGenerator.generate(4, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false
  });

exports.sendPushNotification = async (message) => {
  // const message = {
  //   to: 'ExponentPushToken[__2ppcCQHCC5h5r-V-YvEb]',
  //   sound: 'default',
  //   title: 'Leave Approved',
  //   body: 'And here is the body!',
  //   data: { someData: 'goes here' }
  // };

  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Accept-encoding': 'gzip, deflate',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(message)
  });
};

//check if date are continuous or not
const MuiFormatDate = (d) => {
  const date = new Date(d);
  let dd = date.getDate();
  let mm = date.getMonth() + 1;
  const yyyy = date.getFullYear();
  if (dd < 10) {
    dd = `0${dd}`;
  }
  if (mm < 10) {
    mm = `0${mm}`;
  }
  return `${yyyy}-${mm}-${dd}`;
};

//get all date between two dates
const getDateRangeArray = function (s, e) {
  const a = [];
  for (const d = new Date(s); d <= new Date(e); d.setDate(d.getDate() + 1)) {
    a.push(`${MuiFormatDate(new Date(d))}`);
  }
  return a;
};

exports.getRangeDates = (dates, holidaysDate) => {
  const sortedDates = dates
    .sort((a, b) => new Date(a) - new Date(b))
    .map((date) => `${date.split('T')[0]}`);
  const rangeDates = getDateRangeArray(sortedDates[0], sortedDates.at(-1));
  const modifiedHolidayDates = holidaysDate.map(
    (holiday) => `${holiday.date.toISOString().split('T')[0]}`
  );

  const isRange = rangeDates.every((date) => {
    const isInSortedDates = sortedDates.includes(date);
    const isInModifiedHolidayDates = modifiedHolidayDates.includes(date);
    const isWeekend = [6, 0].includes(new Date(date).getDay());

    return isInSortedDates || isInModifiedHolidayDates || isWeekend;
  });

  const finalDates = isRange ? [sortedDates[0], sortedDates.at(-1)] : dates;

  return { isRange, dates: finalDates };
};
