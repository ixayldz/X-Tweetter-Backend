const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const dotenv = require('dotenv');
const connectDB = require('./config/db');
const logger = require('./config/logger'); // Logging with winston
const { notFound, errorHandler } = require('./middlewares/errorMiddleware'); // Error handling middleware
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

// Load environment variables from .env file
dotenv.config();

// Connect to MongoDB
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Middleware for security and JSON parsing
app.use(helmet()); // Adds security headers
app.use(express.json()); // Parses incoming JSON requests
app.use(cors()); // Enables CORS for all origins, configure for specific domains if needed

// Rate limiting middleware
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again after 15 minutes',
});
app.use('/api/', limiter); // Apply rate limiting to all API routes

// Logging middleware for HTTP requests
app.use((req, res, next) => {
  logger.info(`${req.method} ${req.url}`);
  next();
});

// Import routes
const userRoutes = require('./routes/auth');
const tweetRoutes = require('./routes/tweets');
const feedRoutes = require('./routes/feed');

// Use routes
app.use('/api/users', userRoutes);
app.use('/api/tweets', tweetRoutes);
app.use('/api/feed', feedRoutes);

// User sessions and connected users
let activeUsers = new Map();

io.on('connection', (socket) => {
  // User joins
  socket.on('user-join', (userId) => {
    activeUsers.set(userId, socket.id);
    io.emit('active-users', [...activeUsers.keys()]);
  });

  // Sending direct messages
  socket.on('send-message', (data) => {
    const { senderId, receiverId, message } = data;
    const receiverSocket = activeUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('receive-message', { senderId, message });
    }
  });

  // Notifications
  socket.on('send-notification', (data) => {
    const { senderId, receiverId, notification } = data;
    const receiverSocket = activeUsers.get(receiverId);
    if (receiverSocket) {
      io.to(receiverSocket).emit('receive-notification', { senderId, notification });
    }
  });

  // User disconnects
  socket.on('disconnect', () => {
    activeUsers.forEach((value, key) => {
      if (value === socket.id) {
        activeUsers.delete(key);
      }
    });
    io.emit('active-users', [...activeUsers.keys()]);
  });
});

// Error handling for undefined routes
app.use(notFound);

// Global error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  logger.info(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
});

module.exports = app;
