const { recommendSimilarTweets } = require('./contentFilteringService');
const { recommendTweets } = require('./collaborativeFilteringService');
const { generatePersonalizedFeed } = require('./feedService');

exports.generateHybridFeed = async (userId, cursor = null, limit = 10) => {
  const personalizedFeed = await generatePersonalizedFeed(userId, cursor, limit);

  const contentRecommendations = await recommendSimilarTweets(userId);
  const collaborativeRecommendations = await recommendTweets(userId);

  // Combine and rank the results
  const combinedRecommendations = [
    ...personalizedFeed,
    ...contentRecommendations,
    ...collaborativeRecommendations,
  ];

  // Return the top-ranked recommendations
  return combinedRecommendations.slice(0, limit);
};
