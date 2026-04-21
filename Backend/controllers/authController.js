const bcrypt = require('bcryptjs');                       // pure-JS bcrypt (pkg-compatible drop-in for bcrypt)
const jwt = require('jsonwebtoken');                     // module for creating and verifying JWT tokens
const authModel = require('../models/authmodels');        // imports authentication related database queries


// POST /api/auth/register
const register = async (req, res) => {
  try {
    const { username, password } = req.body;              // destructures username and password from the request body

    if (!username || !password) {                         // checks if both fields are provided
      return res.status(400).json({ message: 'Username and password are required' }); // sends error if missing
    }


    const existingUser = await authModel.findByUsername(username); // checks if the username is already taken
    if (existingUser) {                                   // if user exists
      return res.status(409).json({ message: 'Username already exists' }); // sends conflict error
    }


    const saltRounds = 10;                                // sets the complexity of the hash
    const passwordHash = await bcrypt.hash(password, saltRounds); // hashes the password for secure storage


    const newUser = await authModel.createUser(username, passwordHash); // creates the new user in the database


    res.status(201).json({                                // sends success response back to frontend
      message: 'User registered successfully',            // message indicator
      user: { id: newUser.id, username: newUser.username, role: newUser.role } // returns public user info
    });


  } catch (error) {
    console.error('Registration error:', error);          // logs any unexpected errors to the console
    res.status(500).json({ message: 'Internal server error' }); // sends a generic error back to frontend
  }
};





// POST /api/auth/login
const login = async (req, res) => {
  try {
    const { username, password } = req.body;              // extracts login credentials from request body

    if (!username || !password) {                         // checks for missing input
      return res.status(400).json({ message: 'Username and password are required' });
    }


    const user = await authModel.findByUsername(username); // fetches user data from the DB by username
    if (!user) {                                          // if no user is found
      return res.status(401).json({ message: 'Invalid credentials' }); // sends unauthorized error
    }


    const passwordMatch = await bcrypt.compare(password, user.password_hash); // compares provided password with hash
    if (!passwordMatch) {                                 // if the password doesn't match
      return res.status(401).json({ message: 'Invalid credentials' }); // sends unauthorized error
    }


    const tokenPayload = {                                // defines the data to embed in the JWT token
      id: user.id,
      username: user.username,
      role: user.role
    };


    const token = jwt.sign(tokenPayload, process.env.JWT_SECRET, { expiresIn: '24h' }); // signs a new token valid for 24h


    res.json({                                            // sends the token and user info back to the frontend
      message: 'Login successful',
      token,                                              // the generated JWT
      user: tokenPayload                                  // basic user data for the frontend state
    });


  } catch (error) {
    console.error('Login error:', error);                 // logs unexpected errors
    res.status(500).json({ message: 'Internal server error' }); // sends generic error response
  }
};


module.exports = {
  register,
  login,
};