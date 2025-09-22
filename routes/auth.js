// auth.js
const express = require('express');
const router = express.Router();
const User = require('./models/User'); // Adjust path if needed
const bcrypt = require('bcrypt');

// Signup route
router.post('/signup', async (req, res) => {
    try {
        const { email, password, role, selectedClasses, className, period } = req.body;

        if (!email || !password || !role) 
            return res.status(400).json({ success: false, message: 'Email, password, and role are required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) 
            return res.status(400).json({ success: false, message: 'User already exists' });

        const hashedPassword = await bcrypt.hash(password, 10);

        let userData = { email, password: hashedPassword, role };

        if (role === 'teacher') {
            if (!className || !period) 
                return res.status(400).json({ success: false, message: 'Teacher must provide class name and period' });
            userData.className = className;
            userData.period = period;
        }

        if (role === 'student') {
            if (!selectedClasses || !Array.isArray(selectedClasses) || selectedClasses.length === 0) 
                return res.status(400).json({ success: false, message: 'Student must select at least one class' });

            // Store as array of objects
            userData.selectedClasses = selectedClasses.map(c => JSON.parse(c));
        }

        const newUser = new User(userData);
        await newUser.save();

        res.status(201).json({ success: true, message: 'User created successfully', role: newUser.role });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login route
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) 
            return res.status(400).json({ success: false, message: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        const match = await bcrypt.compare(password, user.password);
        if (!match) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        // Example: send user info for frontend routing
        res.json({ success: true, role: user.role, userId: user._id, email: user.email });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Optional: Middleware for routes that require login
function requireLogin(req, res, next) {
    if (!req.user) return res.status(401).json({ success: false, message: 'Unauthorized' });
    next();
}

module.exports = router;
