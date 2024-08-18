const Tweet = require('../models/Tweet');
const User = require('../models/User');
const { recommendSimilarTweets } = require('./contentFilteringService');
const { recommendTweets } = require('./collaborativeFilteringService');

// Function to generate a personalized feed based on engagement and recency
exports.generatePersonalizedFeed = async (userId, cursor = null, limit = 10) => {
  const followedUsers = await User.findById(userId).select('following');
  const followedUserIds = followedUsers.following.map(follow => follow._id);

  const query = { author: { $in: followedUserIds } };
  if (cursor) {
    query._id = { $lt: cursor }; // For pagination
  }

  // Generate feed based on engagement and recency
  const feed = await Tweet.find(query)
    .sort({
      likes: -1, // Prioritize tweets with more likes
      retweets: -1, // Then consider retweets
      createdAt: -1, // Finally, prioritize recent tweets
    })
    .limit(limit)
    .populate('author', 'username profileImage');

  return feed;
};

// Function to generate a hybrid feed combining personalized feed, content-based recommendations, and collaborative filtering
exports.generateHybridFeed = async (userId, cursor = null, limit = 10) => {
  // Generate the basic personalized feed
  const personalizedFeed = await this.generatePersonalizedFeed(userId, cursor, limit);

  // Generate content-based recommendations
  const contentRecommendations = await recommendSimilarTweets(userId);

  // Generate collaborative filtering recommendations
  const collaborativeRecommendations = await recommendTweets(userId);

  // Combine all recommendations and sort by engagement and recency
  const combinedRecommendations = [
    ...personalizedFeed,
    ...contentRecommendations,
    ...collaborativeRecommendations,
  ];

  // Remove duplicates (tweets that might appear in multiple recommendations)
  const uniqueRecommendations = Array.from(new Set(combinedRecommendations.map(tweet => tweet._id)))
    .map(id => combinedRecommendations.find(tweet => tweet._id.equals(id)));

  // Return the top-ranked recommendations based on limit
  return uniqueRecommendations.slice(0, limit);
};
