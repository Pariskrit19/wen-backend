const NoticeType = require('../../models/notices/noticeTypeModel');
const { NOTICE_TYPE_KEY } = require('../../utils/crypto');
const factory = require('../factoryController');

exports.getNoticeType = factory.getOne(NoticeType);
exports.getAllNoticeTypes = factory.getAll(NoticeType, NOTICE_TYPE_KEY);
exports.createNoticeType = factory.createOne(NoticeType);
exports.updateNoticeType = factory.updateOne(NoticeType);
exports.deleteNoticeType = factory.deleteOne(NoticeType);
