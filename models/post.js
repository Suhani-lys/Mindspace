const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  message: String,
  predictedEmotion: String,
  distressLevel: String,
  createdAt: {
    type: Date,
    default: Date.now
  }
});

module.exports = mongoose.model('Post', postSchema);