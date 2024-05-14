const {
  createActivityLogMessage,
  deleteActivityLogMessage,
  updateActivityLogMessage
} = require('./common');

exports.LEAVETYPES = {
  casualLeave: 'Casual Leave',
  sickLeave: 'Sick Leave'
};

exports.POSITIONS = {
  intern: 'Intern',
  probation: 'Probation'
};

exports.INFOWENEMAIL = 'info@webexpertsnepal.com';
exports.HRWENEMAIL = 'hr@webexpertsnepal.com';

exports.STATUS_TYPES = [
  { id: 'approved', value: 'Approved' },
  { id: 'pending', value: 'Pending' },
  { id: 'cancelled', value: 'Cancelled' }
];

exports.LEAVE_CANCELLED = 'cancelled';
exports.LEAVE_PENDING = 'pending';
exports.LEAVE_APPROVED = 'approved';
exports.LEAVE_REJECTED = 'rejected';
exports.USER_CANCELLED = 'user cancelled';

exports.MONTHS = {
  January: 0,
  February: 1,
  March: 2,
  April: 3,
  May: 4,
  June: 5,
  July: 6,
  August: 7,
  September: 8,
  October: 9,
  November: 10,
  December: 11
};

exports.CREATE_ACTIVITY_LOG_MESSAGE = {
  Attendance: (user, ModelToLog, name, punch) =>
    user === name
      ? `${user} created ${ModelToLog} Punch ${
          punch ? 'In and Punch Out' : 'In'
        }`
      : `${user} added Punch ${punch ? 'In and Punch Out' : 'In'} of ${name}`,
  Blog: createActivityLogMessage,
  'Blog Category': createActivityLogMessage,
  'Email Setting': createActivityLogMessage,
  'Leave Type': createActivityLogMessage,
  'Leave Quarter': (user, ModelToLog) => `${user} created ${ModelToLog}`,
  Leave: (user, ModelToLog, name) =>
    user === name
      ? `${user} applied ${ModelToLog}`
      : `${user} applied ${ModelToLog} of ${name}`,
  Notice: createActivityLogMessage,
  'Notice Type': createActivityLogMessage,
  Client: createActivityLogMessage,
  Project: createActivityLogMessage,
  'Project Status': createActivityLogMessage,
  'Project Tag': createActivityLogMessage,
  'Project Type': createActivityLogMessage,
  FAQ: createActivityLogMessage,
  Holiday: createActivityLogMessage,
  Policy: createActivityLogMessage,
  TimeLog: (user, ModelToLog) => `${user} created ${ModelToLog}`,
  'Log Type': createActivityLogMessage,
  User: createActivityLogMessage,
  'User Position': createActivityLogMessage,
  'User Position Type': createActivityLogMessage,
  'User Role': createActivityLogMessage
};

exports.UPDATE_ACTIVITY_LOG_MESSAGE = {
  Attendance: (user, ModelToLog, name, punch) =>
    user === name
      ? `${user} updated ${ModelToLog} Punch ${punch}`
      : `${user} updated Punch ${punch} of ${name}`,
  Blog: updateActivityLogMessage,
  'Blog Category': updateActivityLogMessage,
  'Email Setting': updateActivityLogMessage,
  'Leave Type': updateActivityLogMessage,
  'Leave Quarter': (user, ModelToLog) => `${user} updated ${ModelToLog}`,
  Leave: (user, ModelToLog, name) =>
    `${user} updated ${ModelToLog} of ${name || ''}`,
  Notice: updateActivityLogMessage,
  'Notice Type': updateActivityLogMessage,
  Client: updateActivityLogMessage,
  Project: updateActivityLogMessage,
  'Project Status': updateActivityLogMessage,
  'Project Tag': updateActivityLogMessage,
  'Project Type': updateActivityLogMessage,
  FAQ: updateActivityLogMessage,
  Holiday: updateActivityLogMessage,
  Policy: updateActivityLogMessage,
  TimeLog: (user, ModelToLog) => `${user} updated ${ModelToLog}`,
  'Log Type': updateActivityLogMessage,
  User: updateActivityLogMessage,
  'User Position': updateActivityLogMessage,
  'User Position Type': updateActivityLogMessage,
  'User Role': updateActivityLogMessage
};

exports.DELETE_ACTIVITY_LOG_MESSAGE = {
  Attendance: (user, ModelToLog) => `${user} deleted ${ModelToLog} Punch`,
  Blog: deleteActivityLogMessage,
  'Blog Category': deleteActivityLogMessage,
  'Email Setting': deleteActivityLogMessage,
  'Leave Type': deleteActivityLogMessage,
  'Leave Quarter': (user, ModelToLog) => `${user} deleted ${ModelToLog}`,
  Leave: deleteActivityLogMessage,
  Notice: deleteActivityLogMessage,
  'Notice Type': deleteActivityLogMessage,
  Client: deleteActivityLogMessage,
  Project: deleteActivityLogMessage,
  'Project Status': deleteActivityLogMessage,
  'Project Tag': deleteActivityLogMessage,
  'Project Type': deleteActivityLogMessage,
  FAQ: deleteActivityLogMessage,
  Holiday: deleteActivityLogMessage,
  Policy: deleteActivityLogMessage,
  TimeLog: (user, ModelToLog, projectName) =>
    `${user} deleted ${ModelToLog} of Project ${projectName}`,
  'Log Type': deleteActivityLogMessage,
  User: deleteActivityLogMessage,
  'User Position': deleteActivityLogMessage,
  'User Position Type': deleteActivityLogMessage,
  'User Role': deleteActivityLogMessage
};
