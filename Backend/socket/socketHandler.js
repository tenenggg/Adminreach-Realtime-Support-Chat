const jwt = require('jsonwebtoken');                          // module to handle JSON Web Tokens for security
const { handleSupportMessage, handleAdminReply } = require('./socketController'); // imports socket business logic


// Socket authentication middleware
// Runs before any socket connection is established
const socketAuthMiddleware = (socket, next) => {
  const token = socket.handshake.auth.token;                  // extracts the JWT token from the handshake

  if (!token) {                                               // checks if token is missing
    return next(new Error('Authentication error: No token provided')); // rejects connection if no token
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => { // verifies the JWT token
    if (err) return next(new Error('Authentication error: Invalid token')); // rejects if verification fails
    socket.user = decoded;                                    // stores decoded user info in the socket object
    next();                                                   // allows the connection to proceed
  });
};


// Registers all socket events for a single connected client
const registerSocketEvents = (socket, io, onlineUsers) => {
  console.log(`User connected: ${socket.user.username} (${socket.user.id})`); // logs the connection info
  onlineUsers.set(socket.user.id, socket.id);                 // adds the user to the online tracking map

  if (socket.user.role === 'admin') {                         // checks if the connected user is an admin
    socket.join('admins');                                    // adds admin users to a special 'admins' room
  }

  socket.on('support_message', (data) =>                      // listens for messages sent by regular users
    handleSupportMessage(socket, io, data)
  );

  socket.on('admin_reply', (data) =>                          // listens for replies sent by admins
    handleAdminReply(socket, io, onlineUsers, data)
  );

  socket.on('disconnect', () => {                             // triggered when a client closes the connection
    console.log(`User disconnected: ${socket.user.username}`); // logs who disconnected
    onlineUsers.delete(socket.user.id);                       // removes them from the online tracker
  });
};


// Initializes socket.io: applies auth middleware and registers events on each connection
const initSocket = (io, onlineUsers) => {
  io.use(socketAuthMiddleware);                               // applies auth check before every connection
  io.on('connection', (socket) =>                            // triggered when a new client connects
    registerSocketEvents(socket, io, onlineUsers)
  );
};


module.exports = { initSocket };