const { createNotification } = require('./notificationController');
const User = require('../models/User');

exports.followUser = async (req, res) => {
  try {
    const userToFollow = await User.findById(req.params.id);
    if (!userToFollow) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent users from following themselves
    if (userToFollow._id.toString() === req.user._id.toString()) {
      return res.status(400).json({ message: "You can't follow yourself" });
    }

    // Add the follower
    await User.findByIdAndUpdate(req.user._id, {
      $addToSet: { following: userToFollow._id }
    });
    await User.findByIdAndUpdate(userToFollow._id, {
      $addToSet: { followers: req.user._id }
    });

    // Create a follow notification
    createNotification('follow', req.user._id, userToFollow._id);

    res.status(200).json({ message: `You are now following ${userToFollow.username}` });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
