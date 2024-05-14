const Notice = require('../../models/notices/noticeModel');
const factory = require('../factoryController');
const asyncError = require('../../utils/asyncError');
const ActivityLogs = require('../../models/activityLogs/activityLogsModel');

exports.getNotice = factory.getOne(Notice);
exports.getAllNotices = factory.getAll(Notice);
exports.createNotice = factory.createOne(Notice, ActivityLogs, 'Notice');
exports.updateNotice = factory.updateOne(Notice, ActivityLogs, 'Notice');
exports.deleteNotice = factory.deleteOne(Notice, ActivityLogs, 'Notice');

exports.getWeekNotices = asyncError(async (req, res, next) => {
  const { todayDate, afterTwoWeek } = req;

  const notices = await Notice.find({
    $or: [
      {
        $and: [
          {
            startDate: { $gte: todayDate }
          },
          {
            startDate: { $lte: afterTwoWeek }
          }
        ]
      },
      {
        $and: [
          { endDate: { $gte: todayDate } },
          { startDate: { $lte: todayDate } }
        ]
      }
    ]
  });

  res.status(200).json({
    status: 'success',
    data: {
      notices: notices
    }
  });
});
