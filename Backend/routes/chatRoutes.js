const express = require('express');                         // web framework for Node.js
const router = express.Router();                            // router for handling chat-related API paths
const chatController = require('../controllers/chatController'); // imports the chat logic handlers
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware'); // imports security middleware


// Fetches the list of all users (restricted to Admins only)
router.get('/users', authenticateToken, authorizeRoles('admin'), chatController.getUsers); 


// Marks messages from a specific user as read (restricted to Admins only)
router.post('/read/:userId', authenticateToken, authorizeRoles('admin'), chatController.markAsRead);


// Fetches message history for a specific conversation (Requires valid login)
router.get('/messages/:userId', authenticateToken, chatController.getMessages);


// Deletes a specific message (Only allowed for the message sender)
router.delete('/message/:messageId', authenticateToken, chatController.deleteMessage);


module.exports = router;                                    // exports the router for use in server.js


