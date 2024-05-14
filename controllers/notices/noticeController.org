const Notice = require('../../models/notices/noticeModel');
const factory = require('../factoryController');
const asyncError = require('../../utils/asyncError');

exports.getNotice = factory.getOne(Notice);
exports.getAllNotices = factory.getAll(Notice);
exports.createNotice = factory.createOne(Notice);
exports.updateNotice = factory.updateOne(Notice);
exports.deleteNotice = factory.deleteOne(Notice);

exports.getWeekNotices = asyncError(async (req, res, next) => {
  const { todayDate, afterOneWeekDate } = req;

  const notices = await Notice.find({
    $and: [
      {
        startDate: { $gte: todayDate }
      },
      {
        startDate: { $lte: afterOneWeekDate }
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
