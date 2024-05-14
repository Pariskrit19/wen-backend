const mongoose = require('mongoose');
const crypto = require('crypto');

const inviteSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      unique: true
    },
    inviteToken: String,
    inviteTokenExpires: Date,
    inviteTokenUsed: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true
  }
);

// Create token to send for user signup and store in db
inviteSchema.methods.createInviteToken = function () {
  const token = crypto.randomBytes(32).toString('hex');

  this.inviteToken = crypto.createHash('sha256').update(token).digest('hex');

  this.inviteTokenExpires = Date.now() + 24 * 60 * 60 * 1000;

  return token;
};

const Invite = mongoose.model('invite', inviteSchema);

module.exports = Invite;
