const mongoose = require('mongoose');

const positionTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide user position type name.'],
    unique: true,
    trim: true
  }
});

const UserPositionType = mongoose.model(
  'User_Position_Type',
  positionTypeSchema
);

module.exports = UserPositionType;
