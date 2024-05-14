const Leave = require('../../models/leaves/leaveModel');
const common = require('../../utils/common');

const getPendingLeaveCount = async () => {
  const pendingLeaveCount = await Leave.find({
    leaveStatus: { $eq: 'pending' }
  });
  const activeUserLeavePending = pendingLeaveCount.filter(
    (leave) => leave.user.active
  );
  return activeUserLeavePending.length;
};

const registerLeaveHandlers = (io, socket) => {
  socket.on('dashboard-pending', async () => {
    const pendingLeaveCount = await getPendingLeaveCount();
    io.sockets.emit('pending-leave-count', pendingLeaveCount);
  });

  socket.on('dashboard-leave', async () => {
    const todayDate = common.todayDate();

    let leaves = await Leave.aggregate([
      {
        $match: {
          leaveStatus: 'approved',
          leaveDates: todayDate
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'user',
          foreignField: '_id',
          as: 'userdata'
        }
      },
      {
        $match: {
          'userdata.active': true
        }
      },
      {
        $group: {
          _id: '$user'
        }
      },
      {
        $count: 'count'
      }
    ]);

    if (leaves.length === 0) {
      leaves = 0;
    } else {
      leaves = leaves[0].count;
    }

    const pendingLeaveCount = await getPendingLeaveCount();
    io.sockets.emit('today-leave-count', leaves, pendingLeaveCount);
  });
};

module.exports = { registerLeaveHandlers };
