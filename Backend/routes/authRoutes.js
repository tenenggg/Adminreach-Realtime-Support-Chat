const express = require('express');                         // web framework for Node.js
const router = express.Router();                            // creates a new router object to handle sub-paths
const authController = require('../controllers/authController'); // imports the auth logic (login/register)


// Endpoint for user login
router.post('/login', authController.login);                // maps POST /api/auth/login to authController.login


// Endpoint for user registration
router.post('/register', authController.register);          // maps POST /api/auth/register to authController.register


module.exports = router;                                    // exports the router to be used in server.js

