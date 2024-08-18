const express = require('express');
const { protect } = require('../middlewares/authMiddleware');
const { getFeed } = require('../controllers/feedController');

const router = express.Router();

// Route to fetch the feed with optional pagination (cursor and limit)
router.get('/', protect, getFeed);

module.exports = router;
