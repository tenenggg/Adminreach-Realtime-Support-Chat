document.addEventListener('DOMContentLoaded', () => {           // ensures the script runs after the DOM is fully loaded
  const registerForm = document.getElementById('registerForm'); // selects the registration form
  const errorMsg = document.getElementById('errorMessage');   // selector for error feedback
  const successMsg = document.getElementById('successMessage'); // selector for success feedback


  // Redirect Logic
  // if already logged in, skip the registration page
  const user = getUser();                                     // checks for existing session
  if (user) {                                                 // if user exists
    window.location.href = user.role === 'admin' ? 'admin.html' : 'chat.html'; // redirects based on role
  }


  // Handling the Registration Form Submit event
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();                                       // prevents the default form refresh behavior
    errorMsg.textContent = '';                                // clears any old error messages
    successMsg.textContent = '';                              // clears any old success messages
    
    const username = document.getElementById('username').value; // gets username input
    const password = document.getElementById('password').value; // gets password input
    const confirmPassword = document.getElementById('confirmPassword').value; // gets confirmation input


    // Frontend validation to ensure passwords match before sending to server
    if (password !== confirmPassword) {
      errorMsg.textContent = 'Passwords do not match';        // shows error if they differ
      return;                                                 // stops execution
    }


    try {
      // Sending registration data to the backend
      const data = await apiFetch('/auth/register', {         // uses global apiFetch utility
        method: 'POST',                                       // method
        body: JSON.stringify({ username, password })          // sends credentials as JSON
      });


      successMsg.textContent = 'Registration successful! Redirecting to login...'; // feedback to user
      
      registerForm.reset();                                   // clears the form fields


      // Redirecting to login page after a brief delay so the user can see the success message
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);                                               // waits 2 seconds


    } catch (err) {
      errorMsg.textContent = err.message;                     // shows server rejection message (e.g., "Username taken")
    }
  });
});

