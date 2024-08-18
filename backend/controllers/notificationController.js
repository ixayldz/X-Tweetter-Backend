const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendToQueue } = require('../config/queue');



// Function to create and send a notification
exports.createNotification = async (type, senderId, receiverId, tweetId) => {
  const receiver = await User.findById(receiverId);

  // Check the user’s notification preferences
  if (!receiver.notificationPreferences[type]) return;

  // Queue the notification for processing
  await sendToQueue({ type, senderId, receiverId, tweetId });
};

// Worker to process notifications from the queue
exports.processNotifications = async () => {
  const { receiveFromQueue } = require('../config/queue');
  const io = require('../config/socket'); // Assuming socket is configured separately

  receiveFromQueue(async (notificationData) => {
    const { type, senderId, receiverId, tweetId } = notificationData;

    // Check again if the user still prefers this notification type
    const receiver = await User.findById(receiverId);
    if (!receiver.notificationPreferences[type]) return;

    // Group similar notifications (e.g., multiple likes)
    const existingNotification = await Notification.findOne({
      type,
      sender: senderId,
      receiver: receiverId,
      tweet: tweetId,
    });

    if (existingNotification) {
      // If a similar notification exists, increase the group count
      existingNotification.groupCount += 1;
      await existingNotification.save();
    } else {
      // Otherwise, create a new notification
      await Notification.create({
        type,
        sender: senderId,
        receiver: receiverId,
        tweet: tweetId,
      });
    }

    // Emit the notification via WebSocket in real-time
    const receiverSocket = global.activeUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('receive-notification', notificationData);
    }
  });
};

// Trigger the worker to start processing notifications from the queue
exports.startNotificationProcessor = () => {
  this.processNotifications();
};
