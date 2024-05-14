const ActivityLogs = require('../../models/activityLogs/activityLogsModel');
const { todayDate } = require('../../utils/common');

const registerActivityLogHandlers = (io, socket) => {
  socket.on('CUD', async () => {
    const todayNotViewedActivity = await ActivityLogs.find({
      createdAt: { $gte: todayDate() },
      isViewed: false
    }).count();
    io.sockets.emit('countActivity', todayNotViewedActivity);
  });

  socket.on('notification-visible', async () => {
    await ActivityLogs.updateMany(
      { createdAt: { $gte: todayDate() } },
      { isViewed: true }
    );
  });
};

module.exports = { registerActivityLogHandlers };
