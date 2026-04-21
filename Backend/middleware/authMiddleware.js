const jwt = require('jsonwebtoken');                     // module for verifying JWT tokens


// Middleware to authenticate the JWT token provided in the Authorization header
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];        // retrieves the 'Authorization' header from the request
  // Token is expected in the format: "Bearer <token>"
  const token = authHeader && authHeader.split(' ')[1];   // splits "Bearer" from the actual token string


  if (token == null) {                                    // checks if the token is completely missing
    return res.status(401).json({ message: 'Token missing' }); // sends Unauthorized error if no token
  }


  jwt.verify(token, process.env.JWT_SECRET, (err, user) => { // verifies the token using the secret key
    if (err) {                                            // if verification fails (expired or tampered)
      return res.status(403).json({ message: 'Invalid token' }); // sends Forbidden error
    }
    
    req.user = user;                                      // saves the decoded user info into the request object
    next();                                               // moves to the next middleware or route handler
  });
};





// Middleware to restrict access based on user roles (e.g., 'admin', 'user')
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {    // checks if the user's role is in the allowed list
      return res.status(403).json({ message: 'Forbidden' }); // blocks access if role is not authorized
    }
    
    next();                                               // allows the request to proceed if role matches
  };
};


module.exports = { 
  authenticateToken, 
  authorizeRoles 
};

