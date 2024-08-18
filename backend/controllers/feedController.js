const { generateFeed } = require('../services/feedService');

exports.getFeed = async (req, res) => {
  try {
    const userId = req.user._id;
    const cursor = req.query.cursor || null; // Optional cursor for pagination
    const limit = parseInt(req.query.limit) || 10; // Optional limit, default is 10

    const feed = await generateFeed(userId, cursor, limit);

    // Set the next cursor for pagination (if there are more tweets)
    const nextCursor = feed.length === limit ? feed[feed.length - 1]._id : null;

    res.json({ feed, nextCursor });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
