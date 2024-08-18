const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema({
  likes: { type: Boolean, default: true },
  retweets: { type: Boolean, default: true },
  mentions: { type: Boolean, default: true },
  follows: { type: Boolean, default: true },
  quoteTweets: { type: Boolean, default: true },
});

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  profileImage: {
    type: String,
  },
  bio: {
    type: String,
  },
  followers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  following: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  notificationPreferences: {
    type: notificationPreferencesSchema,
    default: () => ({}), // Default preferences for new users
  },
}, { timestamps: true });

module.exports = mongoose.model('User', userSchema);
