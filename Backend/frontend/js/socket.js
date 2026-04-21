// Global variable to hold the socket instance once initialized
let socket = null;


/**
 * Initializes the Socket.io connection using the saved JWT token.
 * This is called by dashboard-specific scripts like admin.js or chat.js
 */
function initializeSocket() {
  const token = localStorage.getItem('token');        // retrieves the authentication token
  if (!token) return null;                            // aborts if the user is not logged in


  // Creates the socket connection to the server
  // Passes the token in the 'auth' object for the server-side middleware to verify
  socket = io({
    auth: { token }
  });


  // Listener for connection errors (e.g., invalid token, server down)
  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message); // logs the specific error message
  });


  return socket;                                      // returns the active socket instance
}

