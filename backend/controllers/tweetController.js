const Tweet = require('../models/Tweet');
const User = require('../models/User');
const redisClient = require('../config/redis');
const { createNotification } = require('./notificationController');

// Utility function to cache tweets
const cacheTweet = async (tweetId, tweet) => {
  await redisClient.setex(`tweet:${tweetId}`, 3600, JSON.stringify(tweet)); // Cache for 1 hour
};

// Utility function to remove cached tweets
const removeCachedTweet = async (tweetId) => {
  await redisClient.del(`tweet:${tweetId}`);
};

// Create a new tweet
exports.createTweet = async (req, res) => {
  try {
    const media = req.files ? req.files.map(file => file.location) : [];
    const tweet = await Tweet.create({
      content: req.body.content,
      author: req.user._id,
      media,
      parentTweet: req.body.parentTweet || null, // For nested replies
    });

    // Handle mentions in the tweet content
    const mentionRegex = /@(\w+)/g;
    const mentionedUsernames = [];
    let match;
    while ((match = mentionRegex.exec(req.body.content)) !== null) {
      mentionedUsernames.push(match[1]);
    }

    if (mentionedUsernames.length > 0) {
      const mentionedUsers = await User.find({ username: { $in: mentionedUsernames } });
      mentionedUsers.forEach(user => {
        createNotification('mention', req.user._id, user._id, tweet._id);
      });
    }

    // If it's a reply, update the parent tweet's replies
    if (req.body.parentTweet) {
      const parentTweet = await Tweet.findById(req.body.parentTweet);
      if (!parentTweet) {
        return res.status(404).json({ message: 'Parent tweet not found' });
      }

      parentTweet.replies.push(tweet._id);
      await parentTweet.save();

      // Notify the author of the parent tweet
      if (parentTweet.author.toString() !== req.user._id.toString()) {
        createNotification('reply', req.user._id, parentTweet.author, parentTweet._id);
      }
    }

    // Cache the newly created tweet
    await cacheTweet(tweet._id, tweet);

    // Send notifications to followers about the new tweet
    const user = await User.findById(req.user._id).populate('followers');
    user.followers.forEach(follower => {
      createNotification('new-tweet', req.user._id, follower._id, tweet._id);
    });

    res.status(201).json(tweet);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Get a tweet by ID
exports.getTweet = async (req, res) => {
  try {
    // Check if tweet is cached
    const cachedTweet = await redisClient.get(`tweet:${req.params.id}`);
    if (cachedTweet) {
      return res.status(200).json(JSON.parse(cachedTweet));
    }

    const tweet = await Tweet.findById(req.params.id)
      .populate('author', 'username profileImage')
      .populate('replies')
      .populate('retweets');

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    // Cache the tweet
    await cacheTweet(req.params.id, tweet);

    res.status(200).json(tweet);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Like a tweet
exports.likeTweet = async (req, res) => {
  try {
    const tweet = await Tweet.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { likes: req.user._id } }, // Add user to likes if not already liked
      { new: true }
    );

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    // Cache the updated tweet
    await cacheTweet(tweet._id, tweet);

    // Notify the tweet's author
    if (tweet.author.toString() !== req.user._id.toString()) {
      createNotification('like', req.user._id, tweet.author, tweet._id);
    }

    res.status(200).json(tweet);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Retweet a tweet
exports.retweet = async (req, res) => {
  try {
    const tweet = await Tweet.findByIdAndUpdate(
      req.params.id,
      { $addToSet: { retweets: req.user._id } }, // Add user to retweets if not already retweeted
      { new: true }
    );

    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    // Cache the updated tweet
    await cacheTweet(tweet._id, tweet);

    // Notify the tweet's author
    if (tweet.author.toString() !== req.user._id.toString()) {
      createNotification('retweet', req.user._id, tweet.author, tweet._id);
    }

    res.status(200).json(tweet);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

// Delete a tweet
exports.deleteTweet = async (req, res) => {
  try {
    const tweet = await Tweet.findById(req.params.id);
    if (!tweet) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    if (tweet.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Unauthorized' });
    }

    await tweet.remove();

    // Remove the cached tweet
    await removeCachedTweet(req.params.id);

    res.json({ message: 'Tweet deleted' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


exports.quoteTweet = async (req, res) => {
  try {
    const tweetToQuote = await Tweet.findById(req.params.id);
    if (!tweetToQuote) {
      return res.status(404).json({ message: 'Tweet not found' });
    }

    const media = req.files ? req.files.map(file => file.location) : [];
    const quoteTweet = await Tweet.create({
      content: req.body.content,
      author: req.user._id,
      media,
      quotedTweet: tweetToQuote._id, // Link the original tweet being quoted
    });

    // Notify the original tweet's author
    if (tweetToQuote.author.toString() !== req.user._id.toString()) {
      createNotification('quote-tweet', req.user._id, tweetToQuote.author, tweetToQuote._id);
    }

    res.status(201).json(quoteTweet);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};


// Log a user interaction (like, retweet, etc.)
exports.logInteraction = async (req, res) => {
  try {
    const { tweetId, interactionType } = req.body;
    const userId = req.user._id;

    await User.findByIdAndUpdate(userId, {
      $addToSet: {
        interactions: { tweetId, interactionType, timestamp: new Date() },
      },
    });

    res.status(200).json({ message: 'Interaction logged successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};