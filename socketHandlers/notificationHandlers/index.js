const Notifications = require('../../models/notification/notificationModel');
const Leave = require('../../models/leaves/leaveModel');
const NoticeType = require('../../models/notices/noticeTypeModel');
const { LEAVE_PENDING } = require('../../utils/constants');

const registerNotificationHandlers = (io, socket) => {
  // gets total count of not viewed notification of individual user
  socket.on('get-notification-count', async ({ _id, key, joinDate }) => {
    const notViewNotification = await Notifications.find({
      showTo: {
        $in: [_id, key]
      },
      viewedBy: {
        $nin: [_id]
      },
      createdAt: { $gte: joinDate }
    }).count();

    socket.emit('send-notViewed-notification-count', notViewNotification);
  });

  // updates viewed notifications of individual user
  socket.on('viewed-notification', async ({ _id, key }) => {
    await Notifications.updateMany(
      {
        showTo: {
          $in: [_id, key]
        },
        viewedBy: {
          $nin: [_id]
        }
      },
      { $push: { viewedBy: _id } }
    );
  });

  socket.on('invite-user', async (response) => {
    const bellNotification = await Notifications.create(response);
    io.sockets.emit('bell-notification', bellNotification);
  });

  socket.on('disable-user', async (response) => {
    const bellNotification = await Notifications.create(response);
    io.sockets.emit('bell-notification', bellNotification);
  });

  socket.on('signup-user', async (response) => {
    const bellNotification = await Notifications.create(response);
    io.sockets.emit('bell-notification', bellNotification);
  });

  socket.on('late-attendance', async (response) => {
    const bellNotification = await Notifications.create(response);
    io.sockets.emit('bell-notification-for-user', bellNotification);
  });

  socket.on('approve-leave', async (response) => {
    const bellNotification = await Notifications.create(response);
    io.sockets.emit('bell-notification-for-user', bellNotification);
  });

  socket.on('cancel-leave', async (response) => {
    const bellNotification = await Notifications.create(response);
    if (bellNotification.showTo.includes('admin'))
      io.sockets.emit('bell-notification', bellNotification);
    else io.sockets.emit('bell-notification-for-user', bellNotification);
  });

  socket.on('apply-leave', async (response) => {
    let bellNotification = null;
    const bellNotificationUser = await Notifications.create(response);

    const pendingLeaves = await Leave.find({
      leaveStatus: { $eq: 'pending' }
    });
    const activeUserPendingleaves = pendingLeaves.filter(
      (leave) => leave.user.active
    );

    const hrPendingLeaves = activeUserPendingleaves.filter(
      (leave) => leave.user.role.key === 'hr'
    );
    const hasHrPendingLeaves = hrPendingLeaves.length > 0;
    const showToIncludesHr = response.showTo.includes('hr');

    if (activeUserPendingleaves.length > 0) {
      //  If hr pending leaves present then deduct the hr pending leaves and show the remaining leaves count to HR
      if (hasHrPendingLeaves && showToIncludesHr) {
        const pendingLeavesCount =
          activeUserPendingleaves.length - hrPendingLeaves.length;
        const bellNotificationForHr = await Notifications.create({
          showTo: ['hr'],
          remarks: `You have ${pendingLeavesCount} pending leave request. Please review.`,
          module: 'Leave',
          extraInfo: JSON.stringify({
            status: LEAVE_PENDING
          })
        });
        io.sockets.emit('bell-notification', bellNotificationForHr);
      }
      const showTo =
        showToIncludesHr && !hasHrPendingLeaves ? ['hr', 'admin'] : ['admin'];
      bellNotification = await Notifications.create({
        showTo,
        remarks: `You have ${activeUserPendingleaves.length} pending leave request. Please review.`,
        module: 'Leave',
        extraInfo: JSON.stringify({
          status: LEAVE_PENDING
        })
      });
      io.sockets.emit('bell-notification', bellNotification);
    }
    io.sockets.emit('bell-notification', bellNotificationUser);
  });

  socket.on('add-blog', async (response) => {
    const bellNotification = await Notifications.create(response);
    io.sockets.emit('bell-notification', bellNotification);
  });

  socket.on('add-notice', async (response) => {
    const noticeType = await NoticeType.findOne({ _id: response.noticeTypeId });

    const bellNotification = await Notifications.create({
      showTo: response.showTo,
      module: response.module,
      remarks: `You have new ${noticeType.name}.`
    });

    io.sockets.emit('bell-notification', bellNotification);
  });

  socket.on('ot-log', async (response) => {
    const bellNotification = await Notifications.create(response);
    io.sockets.emit('bell-notification', bellNotification);
  });

  socket.on('resolve-ot-log', async (response) => {
    const bellNotification = await Notifications.create(response);
    io.sockets.emit('bell-notification-for-user', bellNotification);
  });

  socket.on('setting-attendance', async (response) => {
    const bellNotification = await Notifications.create(response);
    io.sockets.emit('bell-notification', bellNotification);
  });
  socket.on('maintenance-toggle', (response) => {
    io.sockets.emit('maitenance-toggle-mobile', response);
  });
};

module.exports = { registerNotificationHandlers };
