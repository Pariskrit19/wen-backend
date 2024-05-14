const mongoose = require('mongoose');

const userPositionSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide user position name.'],
    unique: true,
    trim: true
  }
});

const UserPosition = mongoose.model('User_Position', userPositionSchema);

module.exports = UserPosition;
