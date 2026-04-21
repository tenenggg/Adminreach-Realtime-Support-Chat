const API_BASE = '/api';                             // base URL for all API requests


// Helper to get authorization headers with JWT from localStorage
function getAuthHeaders() {
  const token = localStorage.getItem('token');        // retrieves the saved JWT token
  return {
    'Content-Type': 'application/json',               // specifies that we send/receive JSON
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}) // includes token if it exists
  };
}





// Global wrapper for the fetch API with automatic token handling and logout on expiry
async function apiFetch(endpoint, options = {}) {
  const response = await fetch(`${API_BASE}${endpoint}`, { // executes the actual network request
    ...options,                                       // includes user-provided options (method, body, etc)
    headers: {
      ...getAuthHeaders(),                            // automatically adds security headers
      ...options.headers                              // merges with any custom headers
    }
  });


  const data = await response.json();                 // parses the backend response as JSON
  
  if (!response.ok) {                                 // checks if the request failed (4xx or 5xx)
    if (response.status === 401 || response.status === 403) { // if the session has expired
      localStorage.removeItem('token');               // clears local auth data
      localStorage.removeItem('user');
      window.location.href = 'login.html';            // kicks the user back to the login screen
    }
    throw new Error(data.message || 'API Error');     // bubbles up the error message
  }
  
  return data;                                        // returns the successful response data
}





// Simple getter for current user info from localStorage
function getUser() {
  const user = localStorage.getItem('user');          // reads the user string
  return user ? JSON.parse(user) : null;              // parses and returns user object, or null
}





// Helper to log out the user and clear the session
function logout() {
  localStorage.removeItem('token');                   // removes secure token
  localStorage.removeItem('user');                    // removes identity info
  window.location.href = 'login.html';                // reloads the page to the login
}





// Communicates with the backend to permanently delete a message
async function deleteMessage(messageId) {
  return await apiFetch(`/chat/message/${messageId}`, {
    method: 'DELETE'                                  // uses the HTTP DELETE method
  });
}





// Formats database timestamps into human-readable strings for the chat UI
function formatTimestamp(dateStr) {
  const messageDate = new Date(dateStr);              // converts ISO string to Date object
  if (isNaN(messageDate.getTime())) return '';        // returns empty if date is invalid


  const now = new Date();                             // current time for comparison
  const isToday = messageDate.toDateString() === now.toDateString(); // checks if message was sent today


  if (isToday) {                                      // if sent today, show time only
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else {                                            // if sent on a previous day
    // Show "Month Day, Time" for older messages
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' }) + ', ' + 
           messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
}

