import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Signup route
router.post('/signup', async (req, res) => {
    try {
        const { email, password, role, selectedClasses, className, period } = req.body;

        if (!email || !password || !role) 
            return res.status(400).json({ success: false, message: 'Email, password, and role are required' });

        const existingUser = await User.findOne({ email });
        if (existingUser) 
            return res.status(400).json({ success: false, message: 'User already exists' });

        const user = new User({ 
            email, 
            password, 
            role 
        });

        // In the signup route, make sure teacher data is saved:
// In the signup route, fix the teacher data saving:
// In the signup route, fix the teacher data saving:
if (role === 'teacher') {
    if (!className || !period) {
        return res.status(400).json({ success: false, message: 'Teacher must provide class name and period' });
    }
    
    // Make sure these fields are properly set
    user.className = className;
    user.period = period;
    user.teacherEmail = email; // Set teacherEmail to their own email
}

        if (role === 'student') {
            if (!selectedClasses || !Array.isArray(selectedClasses) || selectedClasses.length === 0) 
                return res.status(400).json({ success: false, message: 'Student must select at least one class' });

            user.selectedClasses = selectedClasses;
        }

        await user.save();

        // Create JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role }, 
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.status(201).json({ 
            success: true, 
            message: 'User created successfully', 
            token,
            user: { 
                id: user._id, 
                email: user.email, 
                role: user.role, 
                selectedClasses: user.selectedClasses 
            }
        });
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

        const match = await user.comparePassword(password);
        if (!match) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        // Create JWT token
        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role }, 
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        // In the login route, make sure you return:
res.json({ 
    success: true, 
    token,
    user: { 
        id: user._id, 
        email: user.email, 
        role: user.role,
        selectedClasses: user.selectedClasses 
    }
});
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
