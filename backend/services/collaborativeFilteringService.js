const User = require('../models/User');

// Function to recommend tweets based on collaborative filtering
exports.recommendTweets = async (userId) => {
  const user = await User.findById(userId).populate('interactions.tweetId');
  const similarUsers = await User.find({
    _id: { $ne: userId },
    interactions: { $in: user.interactions.map(interaction => interaction.tweetId) },
  });

  const recommendedTweets = [];

  similarUsers.forEach(similarUser => {
    similarUser.interactions.forEach(interaction => {
      if (!user.interactions.some(userInteraction => userInteraction.tweetId.equals(interaction.tweetId))) {
        recommendedTweets.push(interaction.tweetId);
      }
    });
  });

  // Return unique and most relevant recommendations
  return [...new Set(recommendedTweets)];
};
