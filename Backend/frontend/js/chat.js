const currentUser = getUser();                        // retrieves the current logged-in user from storage


// Security Check: If no user session is found, force redirect to login
if (!currentUser) {
  window.location.href = 'login.html';
}





document.addEventListener('DOMContentLoaded', async () => { // initialization when the page loads
  socket = initializeSocket();                        // connects to the backend socket server


  // DOM Selectors
  const messagesList = document.getElementById('messagesList');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');


  // Loading initial Conversation History
  try {
    const history = await apiFetch(`/chat/messages/${currentUser.id}`); // API call to get my messages
    history.forEach(appendMessage);                   // renders each message in the list
    scrollToBottom();                                 // scrolls to the latest message
  } catch (err) {
    console.error("Failed to load history", err);
  }




  // --- Real-time Socket Handlers ---


  // Listen for incoming messages from the Admin
  socket.on('receive_message', (message) => {
    appendMessage(message);                           // adds the admin's reply bubble to UI
    scrollToBottom();                                 // scrolls to bottom
  });


  // Listen for confirmation that our own message was sent successfully
  socket.on('message_sent', (message) => {
    appendMessage(message);                           // adds our message bubble to UI
    scrollToBottom();                                 // scroll down
  });


  // Listen for real-time deletion events from the other side
  socket.on('message_deleted', ({ messageId }) => {
    const msgElement = document.querySelector(`.message[data-id="${messageId}"]`);
    if (msgElement) {
      msgElement.remove();                            // removes visually from the chat area
    }
  });




  // --- Input Handling ---



  // Handles sending a support message from the user
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();                               // prevents page refresh
    const content = messageInput.value.trim();        // gets the message text
    
    if (!content) return;                             // stops if the input is empty


    socket.emit('support_message', {                  // emits the event to the server
      content: content
    });


    messageInput.value = '';                          // clears the text box for next use
  });




  // --- Rendering Helpers ---


  // Appends a new message bubble to the chat container
  function appendMessage(msg) {
    const isSent = msg.sender_id === currentUser.id;  // determines if current user is the sender
    const msgDiv = document.createElement('div');
    msgDiv.classList.add('message', isSent ? 'sent' : 'received'); // sets CSS class for bubble alignment
    msgDiv.dataset.id = msg.id;                       // stores message ID for deletion targeting
    
    const timeStr = formatTimestamp(msg.created_at);  // formats the timestamp from DB


    msgDiv.innerHTML = `
      <div class="content">${escapeHTML(msg.content)}</div>
      <div class="meta">${isSent ? 'You' : 'Admin'} • ${timeStr}</div>
      ${isSent ? `<button class="delete-btn" title="Delete message">×</button>` : ''}
    `;


    // Add event listener to the delete button if it belongs to the current user
    const deleteBtn = msgDiv.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this message?')) {
          try {
            await deleteMessage(msg.id);              // calls the API to delete from server
            msgDiv.remove();                          // removes from own UI immediately
          } catch (err) {
            console.error('Failed to delete message:', err);
            alert('Could not delete message');
          }
        }
      });
    }
    
    messagesList.appendChild(msgDiv);                 // adds the element to the page
  }





  // Utility functions


  function scrollToBottom() {                         // scroll the messages area to the very end
    messagesList.scrollTop = messagesList.scrollHeight;
  }


  function escapeHTML(str) {                          // protects against XSS by escaping HTML tags
    return str.replace(/[&<>'"]/g, 
      tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag])
    );
  }
});

