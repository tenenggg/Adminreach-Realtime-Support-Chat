const chatModel = require('../models/chatmodels');        // imports chat-related database queries


// GET /api/chat/users
const getUsers = async (req, res) => {
  try {
    const adminId = req.user.id;                          // takes the admin's ID from the authenticated request
    const users = await chatModel.getAllUsers(adminId);   // fetches all users to display in the admin sidebar
    res.json(users);                                      // sends the users list to the frontend
  } catch (err) {
    console.error('Error fetching users:', err);          // logs the error details
    res.status(500).json({ message: 'Server error' });    // sends a generic error back to frontend
  }
};





// POST /api/chat/read/:userId
const markAsRead = async (req, res) => {
  try {
    const userId = req.params.userId;                     // the ID of the user whose messages are being read
    const adminId = req.user.id;                          // current admin's ID
    
    await chatModel.markMessagesAsRead(userId, adminId);  // updates the DB to set messages as "read"
    res.json({ message: 'Messages marked as read' });     // sends success confirmation
  } catch (err) {
    console.error('Error marking as read:', err);         // logs error if DB update fails
    res.status(500).json({ message: 'Server error' });
  }
};





// GET /api/chat/messages/:userId
const getMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;                    // your own ID from the JWT
    const targetUserId = req.params.userId;               // the person you are chatting with

    // Security check: ensure regular users can only see their own messages, admins can see any
    if (req.user.role !== 'admin' && Number(currentUserId) !== Number(targetUserId)) { 
      return res.status(403).json({ message: 'Forbidden' }); // blocks unauthorized access
    }


    const messages = await chatModel.getConversationForUser(targetUserId); // fetches message history from DB
    res.json(messages);                                   // sends the history back to frontend


  } catch (err) {
    console.error('Error fetching messages:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// DELETE /api/chat/message/:messageId
const deleteMessage = async (req, res) => {
  try {
    const messageId = req.params.messageId;               // ID of the message to delete
    const currentUserId = req.user.id;                    // requester's ID from JWT payload


    // Fetch message from DB to verify existence and ownership
    const message = await chatModel.getMessageById(messageId);


    if (!message) {
      return res.status(404).json({ message: 'Message not found' });
    }


    // Security Check: Only the sender can delete their own message
    if (Number(message.sender_id) !== Number(currentUserId)) {
      return res.status(403).json({ message: 'Forbidden: You can only delete your own messages' });
    }


    // Perform the deletion in the database
    await chatModel.deleteMessage(messageId);


    // Notify the other party in real-time via Socket.io
    const io = req.app.get('io');                          // retrieves the global io instance from app settings
    if (io) {
      const targetRoom = Number(message.receiver_id) === 1 ? 'admins' : null; // if sent to admin, notify admin room
      
      if (targetRoom) {
        io.to(targetRoom).emit('message_deleted', { messageId }); // broadcasts to all admins
      } else {
        // Find if the target user is online and notify them specifically
        // In this architecture, we can just broadcast or rely on the sender room
        io.emit('message_deleted', { messageId });         // global broadcast for simplicity in this demo
      }
    }


    res.json({ message: 'Message deleted successfully' }); // success response


  } catch (err) {
    console.error('Error deleting message:', err);
    res.status(500).json({ message: 'Server error' });
  }
};





module.exports = {
  getUsers,
  markAsRead,
  getMessages,
  deleteMessage,                                          // exports new handler
};