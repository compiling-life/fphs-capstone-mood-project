const jwt = require('jsonwebtoken');
const User = require('../models/User');

// This middleware will check if the user has a valid token
const authMiddleware = async (req, res, next) => {
    try {
        // Get the token from the Authorization header
        // Format: "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        // If no token, send error
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No authentication token, access denied' 
            });
        }

        // Verify the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key-here');
        
        // Find the user by ID from the token
        const user = await User.findById(decoded.userId).select('-password');
        
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token is not valid - user not found' 
            });
        }

        // Add the user to the request object so routes can use it
        req.user = user;
        next(); // Move to the next middleware/route handler
        
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Token is not valid' 
        });
    }
};

module.exports = authMiddleware;
