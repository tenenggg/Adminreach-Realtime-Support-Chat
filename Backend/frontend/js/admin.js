const currentUser = getUser();                        // retrieves current admin info from localStorage
let activeUserId = null;                              // tracks which user is currently selected in the chat


// Security Check: Redirect to login if user is not an Admin
if (!currentUser || currentUser.role !== 'admin') {
  window.location.href = 'login.html';
}


// Mobile Sidebar Toggle Function
function toggleSidebar() {
  const sidebar = document.getElementById('sidebar');
  const overlay = document.getElementById('sidebarOverlay');
  
  if (sidebar) {
    sidebar.classList.toggle('active');
  }
  if (overlay) {
    overlay.classList.toggle('active');
  }
}




document.addEventListener('DOMContentLoaded', async () => { // initialization logic once DOM is ready
  socket = initializeSocket();                        // connects to the server via Socket.io


  // DOM Element Selectors
  const userList = document.getElementById('userList');
  const messagesList = document.getElementById('messagesList');
  const chatForm = document.getElementById('chatForm');
  const messageInput = document.getElementById('messageInput');
  const chatHeader = document.getElementById('chatHeader');
  const chatInputArea = document.getElementById('chatInputArea');
  const activeUserNameElement = document.getElementById('activeUserName');
  const userSearch = document.getElementById('userSearch');


  let allUsers = [];                                  // local cache of all users for filtering


  // Fetches the user list from the backend
  async function loadUsers() {
    try {
      allUsers = await apiFetch('/chat/users');       // API call to get users
      filterAndRenderUsers();                         // updates the UI list
    } catch (err) {
      console.error("Failed to load users", err);
    }
  }




  // Filters the user list based on the search input
  function filterAndRenderUsers() {
    const query = userSearch.value.toLowerCase();     // normalizes search query
    
    const filteredUsers = allUsers.filter(u => 
      u.username.toLowerCase().includes(query)        // checks if username contains the query
    );
    
    userList.innerHTML = '';                          // clears current list items
    
    if (filteredUsers.length === 0) {
      userList.innerHTML = '<div style="padding: 1.5rem; color: var(--text-secondary); text-align: center;">No users found</div>';
    } else {
      filteredUsers.forEach(renderUserItem);          // renders each filtered user
    }
  }


  userSearch.addEventListener('input', filterAndRenderUsers); // listens for typing in search box
  
  loadUsers();                                        // initial load of users on page start




  // --- Real-time Socket Event Listeners ---


  // Triggered when a new message arrives from any user or admin
  socket.on('receive_message', (message) => {
    loadUsers();                                      // refresh sidebar to update sorting and unread badges


    // If the message belongs to the conversation we are currently looking at
    if (activeUserId && (message.sender_id === activeUserId || message.receiver_id === activeUserId)) {
      appendMessage(message);                         // adds message bubble to the chat area
      scrollToBottom();                               // scrolls down to the latest message


      // If the incoming message is from the client, mark it as read immediately
      if (message.sender_id === activeUserId) {
        apiFetch(`/chat/read/${activeUserId}`, { method: 'POST' }).catch(console.error);
      }
    }
  });


  // Triggered after our own message is successfully processed by the server
  socket.on('message_sent', (message) => {
    loadUsers();                                      // refresh list to update the "last message time"
    appendMessage(message);                           // append out message to UI
    scrollToBottom();                                 // ensure it is visible
  });


  // Triggered when a message is deleted by either party
  socket.on('message_deleted', ({ messageId }) => {
    const msgElement = document.querySelector(`.message[data-id="${messageId}"]`);
    if (msgElement) {
      msgElement.remove();                            // removes the message from the UI
    }
  });




  // --- Form Handling ---



  // Handles sending a new reply to a user
  chatForm.addEventListener('submit', (e) => {
    e.preventDefault();                               // prevents page reload
    const content = messageInput.value.trim();        // gets message text
    
    if (!content || !activeUserId) return;            // stops if empty or no user selected


    socket.emit('admin_reply', {                      // emits event to server
      receiverId: activeUserId,
      content: content
    });


    messageInput.value = '';                          // clears input for next message
  });




  // --- UI Rendering Helpers ---


  // Creates a list item for a single user in the sidebar
  function renderUserItem(user) {
    const li = document.createElement('li');
    li.className = `user-item ${user.unread_count > 0 ? 'unread' : ''}`; // adds 'unread' class if there are new messages
    li.dataset.id = user.id;                          // stores ID in data attribute
    
    if (activeUserId === user.id) li.classList.add('active'); // highlights if currently selected


    const timeStr = user.last_message_time ? formatTimestamp(user.last_message_time) : ''; // formats time
    
    li.innerHTML = `
      <div class="user-avatar">${user.username.charAt(0)}</div>
      <div class="user-item-content">
        <div class="user-item-header">
           <span class="user-item-name">${user.username}</span>
           <span class="user-item-time">${timeStr}</span>
        </div>
        <div class="user-item-footer">
           ${user.unread_count > 0 ? `<span class="unread-badge">${user.unread_count}</span>` : ''}
        </div>
      </div>
    `;


    li.addEventListener('click', () => selectUser(user, li)); // sets up click handler
    userList.appendChild(li);                         // adds to the DOM
  }




  // Switches the active chat conversation to the selected user
  async function selectUser(user, element) {
    activeUserId = user.id;                           // sets global active ID
    
    // Close sidebar on mobile after user selection
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar && sidebar.classList.contains('active')) {
      sidebar.classList.remove('active');
    }
    if (overlay && overlay.classList.contains('active')) {
      overlay.classList.remove('active');
    }
    
    // Updates UI classes for sidebar items
    document.querySelectorAll('.user-item').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    
    // Marks messages as read in the DB if unread count > 0
    if (user.unread_count > 0) {
      try {
        await apiFetch(`/chat/read/${user.id}`, { method: 'POST' }); // API call to update status
        element.classList.remove('unread');           // removes visual indicator
        const badge = element.querySelector('.unread-badge');
        if (badge) badge.remove();                    // removes the badge number
        user.unread_count = 0;                        // update local object state
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }


    chatHeader.style.display = 'flex';                // shows chat header
    chatInputArea.style.display = 'block';            // shows message input area
    activeUserNameElement.textContent = `Chat with ${user.username}`; // updates name in header
    
    // Fetches Conversation History
    messagesList.innerHTML = '';                      // clears previous chat messages
    try {
      const history = await apiFetch(`/chat/messages/${user.id}`); // API call to get history
      
      if (history.length === 0) {
        messagesList.innerHTML = '<div class="empty-state">No messages yet. Start the conversation!</div>';
      } else {
        history.forEach(appendMessage);               // renders each historical message
        scrollToBottom();                             // scroll to end
      }
    } catch (err) {
        messagesList.innerHTML = '<div class="empty-state" style="color:red">Failed to load history</div>';
    }
  }




  // Appends a single message bubble to the messages list
  function appendMessage(msg) {
    const emptyState = messagesList.querySelector('.empty-state');
    if (emptyState) emptyState.remove();              // removes "no messages" text if it exists


    const isSent = msg.sender_id === currentUser.id;  // checks if the message was sent by current admin
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${isSent ? 'sent' : 'received'}`; // applies correct CSS class
    msgDiv.dataset.id = msg.id;                       // stores message ID for deletion targeting
    
    const timeStr = formatTimestamp(msg.created_at);  // formats time string


    msgDiv.innerHTML = `
      <div class="content">${escapeHTML(msg.content)}</div>
      <div class="meta">${isSent ? 'You' : msg.sender_name || 'User'} • ${timeStr}</div>
      ${isSent ? `<button class="delete-btn" title="Delete message">×</button>` : ''}
    `;


    // Add event listener to the delete button if it exists
    const deleteBtn = msgDiv.querySelector('.delete-btn');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to delete this message?')) {
          try {
            await deleteMessage(msg.id);              // calls API to delete from DB
            msgDiv.remove();                          // removes from own UI immediately
          } catch (err) {
            console.error('Failed to delete message:', err);
            alert('Could not delete message');
          }
        }
      });
    }
    
    messagesList.appendChild(msgDiv);                 // adds to DOM
  }





  // Utility functions


  function scrollToBottom() {                         // scrolls the message list to the very end
    messagesList.scrollTop = messagesList.scrollHeight;
  }


  function escapeHTML(str) {                          // prevents XSS by escaping HTML special characters
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

