const CryptoJS = require('crypto-js');

function encrypt(data, key) {
  return data;
  if (process.env.NODE_ENV === 'development') {
    return data;
  }

  // Encrypt
  const ciphertext = CryptoJS.AES.encrypt(JSON.stringify(data), key).toString();

  return ciphertext;
}

const LATE_ARRIVAL_KEY = 'latearrivalkey123456789';
const USERS_KEY = 'userkey123456789';
const CONFIGURATION_KEY = 'configurationkey123456789';
const SALARY_REVIEW_KEY = 'salaryreviewkey123456789';
const ACTIVITY_LOGS_KEY = 'activitylogskey123456789';

const USER_POSITION_KEY = 'userpositionkey123456789';
const USER_POSITION_TYPE_KEY = 'userpositiontypekey123456789';
const USER_ROLE_KEY = 'userrolekey123456789';
const USER_INVITE_KEY = 'userinvitekey123456789';

const PROJECT_KEY = 'projectkey123456789';
const CLIENT_KEY = 'clientkey123456789';
const PROJECT_STATUS_KEY = 'projectstatuskey123456789';
const PROJECCT_TAG_KEY = 'projecttagkey123456789';
const PROJECT_TYPE_KEY = 'projecttypekey123456789';

const LOG_TYPE_KEY = 'logtypekey123456789';
const LOG_KEY = 'logkey123456789';

const NOTICE_TYPE_KEY = 'noticetypekey123456789';
const BLOG_CATEGORY_KEY = 'blogcategorykey123456789';
const EMAIL_KEY = 'emailkey123456789';

const WEEKLY_REPORT_KEY = 'weeklyreportkey123456789';
const WORK_LOG_REPORT_KEY = 'worklogreportkey123456789';

const ATTENDANCE_KEY = 'attendancekey123456789';

module.exports = {
  encrypt,
  LATE_ARRIVAL_KEY,
  USERS_KEY,
  CONFIGURATION_KEY,
  SALARY_REVIEW_KEY,
  ACTIVITY_LOGS_KEY,
  PROJECT_KEY,
  CLIENT_KEY,
  USER_INVITE_KEY,
  PROJECCT_TAG_KEY,
  PROJECT_STATUS_KEY,
  PROJECT_TYPE_KEY,
  USER_POSITION_KEY,
  USER_POSITION_TYPE_KEY,
  USER_ROLE_KEY,
  LOG_KEY,
  LOG_TYPE_KEY,
  NOTICE_TYPE_KEY,
  BLOG_CATEGORY_KEY,
  EMAIL_KEY,
  WEEKLY_REPORT_KEY,
  WORK_LOG_REPORT_KEY,
  ATTENDANCE_KEY
};
