document.addEventListener('DOMContentLoaded', () => {           // ensures the script runs only after the HTML is fully loaded
  const loginForm = document.getElementById('loginForm');     // selects the login form from the DOM
  const errorMsg = document.getElementById('errorMessage');   // selector for displaying feedback to the user


  // Automatic Redirect Logic
  // if the user is already logged in, send them to their dashboard immediately
  const user = getUser();                                     // checks localStorage for an existing session
  if (user) {                                                 // if a user is found
    window.location.href = user.role === 'admin' ? 'admin.html' : 'chat.html'; // redirects based on role
  }


  // Handling the Login Form Submission
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();                                       // prevents the page from refreshing on submit
    errorMsg.textContent = '';                                // clears any previous error messages
    
    const username = document.getElementById('username').value; // gets the entered username
    const password = document.getElementById('password').value; // gets the entered password


    try {
      // Sending request to the login endpoint
      const data = await apiFetch('/auth/login', {            // uses our global apiFetch wrapper
        method: 'POST',                                       // HTTP method
        body: JSON.stringify({ username, password })          // sends credentials as JSON string
      });


      // Saving the session info to browser storage
      localStorage.setItem('token', data.token);              // saves the JWT token for future API calls
      localStorage.setItem('user', JSON.stringify(data.user)); // saves basic user info (id, name, role)


      // Directing to the correct interface based on user role
      if (data.user.role === 'admin') {
        window.location.href = 'admin.html';                  // send to Admin dashboard
      } else {
        window.location.href = 'chat.html';                   // send to User chat interface
      }


    } catch (err) {
      errorMsg.textContent = err.message;                     // displays specific API error (e.g., "Invalid credentials")
    }
  });
});

