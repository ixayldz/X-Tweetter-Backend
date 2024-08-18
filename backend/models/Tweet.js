const mongoose = require('mongoose');

const tweetSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 280,
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  media: [{
    type: String, // URLs of images or videos
  }],
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  retweets: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  replies: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet',
  }],
  parentTweet: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Tweet',
    default: null, // Only set for reply tweets
  },
}, { timestamps: true });

module.exports = mongoose.model('Tweet', tweetSchema);
