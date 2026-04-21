const chatModels = require('../models/chatmodels');      // imports chat-related database queries


// Handles incoming support messages sent by regular users
const handleSupportMessage = async (socket, io, { content }) => {
  console.log(`📩 [Support Message] From User ID: ${socket.user.id}, Content: ${content}`);

  try {
    const senderId = Number(socket.user.id);               // converts user id to a number
    const adminDummyId = 1;                                // standard ID for the admin receiver

    const savedMessage = await chatModels.saveMessage(senderId, adminDummyId, content); // saves message to DB
    console.log(`✅ [Support Message] Saved to DB with ID: ${savedMessage.id}`);

    const createdMessage = {                               // constructs the message object for broadcasting
      id: savedMessage.id,
      sender_id: senderId,
      receiver_id: adminDummyId,
      content,
      created_at: savedMessage.created_at,
      sender_name: socket.user.username
    };

    io.to('admins').emit('receive_message', createdMessage); // broadcasts message to all connected admins
    socket.emit('message_sent', createdMessage);           // confirms back to the sender that it was sent

  } catch (err) {
    console.error('❌ [Support Message] Error saving message:', err); // logs error if DB save fails
    socket.emit('message_error', { error: 'Could not send message' }); // sends error status back to user
  }
};


// Handles admin replies to specific users
const handleAdminReply = async (socket, io, onlineUsers, { receiverId, content }) => {
  console.log(`📩 [Admin Reply] From Admin ID: ${socket.user.id} to User ID: ${receiverId}`);

  try {
    const senderId = Number(socket.user.id);               // current admin's ID
    const targetId = Number(receiverId);                   // the specific user being replied to

    const savedMessage = await chatModels.saveMessage(senderId, targetId, content); // saves reply to DB
    console.log(`✅ [Admin Reply] Saved to DB with ID: ${savedMessage.id}`);

    const createdMessage = {                               // constructs the reply message object
      id: savedMessage.id,
      sender_id: senderId,
      receiver_id: targetId,
      content,
      created_at: savedMessage.created_at,
      sender_name: socket.user.username
    };

    const receiverSocketId = onlineUsers.get(targetId);    // look up the receiver's socket ID
    if (receiverSocketId) {                                // checks if the user is currently online
      io.to(receiverSocketId).emit('receive_message', createdMessage); // sends message directly to user
    }

    socket.to('admins').emit('receive_message', createdMessage); // syncs the reply across other admin windows
    socket.emit('message_sent', createdMessage);           // confirms back to the admin that it was sent

  } catch (err) {
    console.error('❌ [Admin Reply] Error saving message:', err); // logs error if DB save fails
    socket.emit('message_error', { error: 'Could not send message' }); // sends error status back to admin
  }
};


module.exports = {
  handleSupportMessage,
  handleAdminReply,
};