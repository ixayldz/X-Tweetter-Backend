const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const upload = require('../middlewares/upload'); // Middleware for handling media uploads
const {
  createTweet,
  getTweet,
  deleteTweet,
  likeTweet,
  retweet,
} = require('../controllers/tweetController');

const router = express.Router();

// Route to create a new tweet, with support for media uploads and replies (threading)
router.post('/', protect, upload.array('media', 4), createTweet); // Supports up to 4 media files

// Route to get a specific tweet by ID
router.get('/:id', getTweet);

// Route to like a tweet
router.patch('/:id/like', protect, likeTweet);

// Route to retweet
router.patch('/:id/retweet', protect, retweet);

// Route to delete a tweet
router.delete('/:id', protect, deleteTweet);

module.exports = router;
