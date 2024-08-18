const Tweet = require('../models/Tweet');
const natural = require('natural'); // Install this package for text analysis

// Function to recommend similar tweets based on content
exports.recommendSimilarTweets = async (tweetId) => {
  const targetTweet = await Tweet.findById(tweetId);
  const allTweets = await Tweet.find({ _id: { $ne: tweetId } });

  const tokenizer = new natural.WordTokenizer();
  const targetTokens = tokenizer.tokenize(targetTweet.content);

  const recommendations = allTweets
    .map(tweet => {
      const tweetTokens = tokenizer.tokenize(tweet.content);
      const similarity = natural.JaroWinklerDistance(
        targetTokens.join(' '),
        tweetTokens.join(' ')
      );
      return { tweet, similarity };
    })
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 10); // Get top 10 similar tweets

  return recommendations.map(rec => rec.tweet);
};
