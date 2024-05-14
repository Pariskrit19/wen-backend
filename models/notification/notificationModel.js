const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    remarks: { type: String },
    module: {
      type: String
    },
    showTo: {
      type: [String]
    },
    viewedBy: {
      type: [String],
      default: []
    },
    deletedFor: [
      {
        _id: false,
        userId: String,
        deletedAt: {
          type: Date,
          default: null
        }
      }
    ],
    extraInfo: String
  },
  {
    timestamps: true
  }
);

const Notifications = mongoose.model('Notifications', notificationSchema);
module.exports = Notifications;
