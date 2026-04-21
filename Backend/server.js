const path = require('path');                         // built-in module to handle file paths
const express = require('express');                   // web framework for Node.js
const http = require('http');                         // built-in HTTP module to create the server
const { Server } = require('socket.io');             // Socket.io for real-time communication
const cors = require('cors');                        // middleware to allow cross-origin requests
const jwt = require('jsonwebtoken');                 // module to handle JSON Web Tokens for security


// Environment Configuration
// When running as an EXE, it look for .env NEXT TO the .exe file
const envPath = process.pkg                           // checks if the app is bundled as an executable
  ? path.join(path.dirname(process.execPath), '.env') // joins the exe path with .env
  : path.join(__dirname, '.env');                    // otherwise joins current dir with .env

require('dotenv').config({ path: envPath });          // loads environment variables from the .env file


// Model and Route imports
const chatModels = require('./models/chatmodels');    // imports chat-related database queries
const authRoutes = require('./routes/authRoutes');    // imports authentication API endpoints
const chatRoutes = require('./routes/chatRoutes');    // imports chat-related API endpoints


// App and Server initialization
const app = express();                                // initializes the express application
const server = http.createServer(app);                // creates an HTTP server using the express app


// Directory setup
const baseDir = process.pkg ? path.dirname(process.execPath) : process.cwd(); // gets the root directory of the app
const frontendDir = path.join(baseDir, 'frontend');    // joins the base directory with the frontend folder


// Global Middleware
app.use(cors());                                      // enables CORS for all routes
app.use(express.static(frontendDir));                 // serves static files (HTML, CSS, JS) from frontend folder
app.use(express.json());                              // parses incoming JSON requests
app.use(express.urlencoded({ extended: true }));      // parses URL-encoded form data


// API Routes
app.use('/api/auth', authRoutes);                     // attaches authentication routes to /api/auth
app.use('/api/chat', chatRoutes);                     // attaches chat routes to /api/chat


// Catch-all route to serve the frontend
app.get('*', (req, res) => {                          // handles any route that doesn't match above APIs
  res.sendFile(path.join(frontendDir, 'index.html')); // sends index.html to enable Client-Side Routing
});


// Socket.io Setup
const io = new Server(server, {                       // initializes Socket.io on the created server
  cors: {
    origin: "*",                                      // allows all origins to connect (adjust for production)
    methods: ["GET", "POST"]                          // allowed HTTP methods for handshake
  }
});
app.set('io', io);                                    // makes the io instance accessible in request handlers



// Socket Authentication middleware
io.use((socket, next) => {                            // runs before any socket connection is established
  const token = socket.handshake.auth.token;          // extracts the JWT token from the handshake
  
  if (!token) {                                       // checks if token is missing
    return next(new Error("Authentication error: No token provided")); // rejects connection if no token
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => { // verifies the JWT token
    if (err) return next(new Error("Authentication error: Invalid token")); // rejects if verification fails
    socket.user = decoded;                            // stores decoded user info in the socket object
    next();                                           // allows the connection to proceed
  });
});


const onlineUsers = new Map();                        // creating a map to track userId -> socketId mapping


// Main Socket Connection Logic
io.on('connection', (socket) => {                      // triggered when a new client connects
  console.log(`User connected: ${socket.user.username} (${socket.user.id})`); // logs the connection info
  onlineUsers.set(socket.user.id, socket.id);         // adds the user to the online tracking map

  if (socket.user.role === 'admin') {                 // checks if the connected user is an admin
    socket.join('admins');                            // adds admin users to a special 'admins' room
  }


  // Handling incoming support messages from users
  socket.on('support_message', async ({ content }) => { // listens for messages sent by regular users
    console.log(`📩 [Support Message] From User ID: ${socket.user.id}, Content: ${content}`);
    
    try {
      const senderId = Number(socket.user.id);         // converts user id to a number
      const adminDummyId = 1;                         // standard ID for the admin receiver
      
      const savedMessage = await chatModels.saveMessage(senderId, adminDummyId, content); // saves message to DB
      console.log(`✅ [Support Message] Saved to DB with ID: ${savedMessage.id}`);

      const createdMessage = {                         // constructs the message object for broadcasting
        id: savedMessage.id,
        sender_id: senderId,
        receiver_id: adminDummyId,
        content,
        created_at: savedMessage.created_at,
        sender_name: socket.user.username
      };

      io.to('admins').emit('receive_message', createdMessage); // broadcasts message to all connected admins
      socket.emit('message_sent', createdMessage);    // confirms back to the sender that it was sent
      
    } catch (err) {
      console.error("❌ [Support Message] Error saving message:", err); // logs error if DB save fails
      socket.emit('message_error', { error: 'Could not send message' }); // sends error status back to user
    }
  });


  // Handling admin replies to users
  socket.on('admin_reply', async ({ receiverId, content }) => { // listens for replies sent by admins
    console.log(`📩 [Admin Reply] From Admin ID: ${socket.user.id} to User ID: ${receiverId}`);
    
    try {
      const senderId = Number(socket.user.id);         // current admin's ID
      const targetId = Number(receiverId);             // the specific user being replied to
      
      const savedMessage = await chatModels.saveMessage(senderId, targetId, content); // saves reply to DB
      console.log(`✅ [Admin Reply] Saved to DB with ID: ${savedMessage.id}`);

      const createdMessage = {                         // constructs the reply message object
        id: savedMessage.id,
        sender_id: senderId,
        receiver_id: targetId,
        content,
        created_at: savedMessage.created_at,
        sender_name: socket.user.username
      };

      const receiverSocketId = onlineUsers.get(targetId); // look up the receiver's socket ID
      if (receiverSocketId) {                             // checks if the user is currently online
        io.to(receiverSocketId).emit('receive_message', createdMessage); // sends message directly to user
      }

      socket.to('admins').emit('receive_message', createdMessage); // syncs the reply across other admin windows
      socket.emit('message_sent', createdMessage);       // confirms back to the admin that it was sent
      
    } catch (err) {
      console.error("❌ [Admin Reply] Error saving message:", err); // logs error if DB save fails
      socket.emit('message_error', { error: 'Could not send message' }); // sends error status back to admin
    }
  });


  // Handling socket disconnection
  socket.on('disconnect', () => {                      // triggered when a client closes the connection
    console.log(`User disconnected: ${socket.user.username}`); // logs who disconnected
    onlineUsers.delete(socket.user.id);                // removes them from the online tracker
  });
});


// Server Start Configuration
const PORT = process.env.PORT || 5000;                // uses PORT from .env or defaults to 5000
const ip_address = process.env.IP_ADDRESS;            // gets specific IP to bind to from .env


// Starting the server
server.listen(PORT, ip_address, () => {
  console.log(`🚀 Server running on all interfaces. Access it via http://${ip_address || 'localhost'}:${PORT}`);
}).on('error', (err) => {                              // handles errors during server startup
  if (err.code === 'EADDRINUSE') {                     // specifically handle "Port already in use"
    console.error(`❌ Error: Port ${PORT} is already in use. Please stop other Node processes.`);
  } else {
    console.error(`❌ Server error:`, err);
  }
  process.exit(1);                                     // shuts down the app on fatal startup errors
});

