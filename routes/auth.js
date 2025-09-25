import express from 'express';
import User from '../models/User.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import sgMail from '@sendgrid/mail';

const router = express.Router();

// Initialize SendGrid
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Generate random 6-digit code
function generateCode() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// --- Signup route ---
router.post('/signup', async (req, res) => {
    console.log('=== SIGNUP API ENDPOINT HIT ===');
    console.log('Request body:', req.body);

    const { email, password, role, selectedClasses, classes } = req.body;

    try {
        console.log('Extracted values:', { email, role, classes, selectedClasses });
        
        if (!email || !password || !role) {
            return res.status(400).json({ success: false, message: 'Email, password, and role are required' });
        }

        let user = await User.findOne({ email });

        if (user && user.isVerified) {
            return res.status(400).json({ success: false, message: 'User already exists' });
        }

        if (!user) {
            user = new User({ email, password, role });
        } else {
            user.password = password;
            user.role = role;
        }

        if (role === 'teacher') {
            if (!classes || !Array.isArray(classes) || classes.length === 0) {
                return res.status(400).json({ success: false, message: 'Teacher must provide at least one class' });
            }
            user.classes = classes;
            user.teacherEmail = email;
        }

        if (role === 'student') {
            if (!selectedClasses || !Array.isArray(selectedClasses) || selectedClasses.length === 0) {
                return res.status(400).json({ success: false, message: 'Student must select at least one class' });
            }
            user.selectedClasses = selectedClasses;
        }

        user.verificationCode = generateCode();
        user.isVerified = false;

        await user.save();

        // Send verification email
        try {
            const msg = {
                to: email,
                from: { email: 'fphs.edumood@gmail.com', name: 'EduMood' },
                subject: 'Your EduMood Verification Code',
                text: `Your verification code is: ${user.verificationCode}`,
                html: `<p>Your EduMood verification code is: <strong>${user.verificationCode}</strong></p>`
            };
            await sgMail.send(msg);

            res.status(201).json({ 
                success: true, 
                message: 'User created successfully. Verification code sent to email.',
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    selectedClasses: user.selectedClasses || [],
                    classes: user.classes || []
                }
            });
        } catch (emailError) {
            console.error('SendGrid email failed:', emailError);
            res.status(201).json({ 
                success: true, 
                message: 'User created but email failed. Your verification code: ' + user.verificationCode,
                user: {
                    id: user._id,
                    email: user.email,
                    role: user.role,
                    selectedClasses: user.selectedClasses || [],
                    classes: user.classes || []
                },
                verificationCode: user.verificationCode
            });
        }

    } catch (err) {
        console.error('SIGNUP ERROR:', err);
        res.status(500).json({ success: false, message: 'Server error: ' + err.message });
    }
});

// --- Login route ---
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) 
            return res.status(400).json({ success: false, message: 'Email and password required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        if (!user.isVerified) return res.status(403).json({ success: false, message: 'Please verify your email before logging in.' });

        const match = await user.comparePassword(password);
        if (!match) return res.status(400).json({ success: false, message: 'Invalid credentials' });

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role }, 
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            token,
            user: { 
                id: user._id, 
                email: user.email, 
                role: user.role,
                selectedClasses: user.selectedClasses || [],
                classes: user.classes || []
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- Verify code route ---
router.post('/verify', async (req, res) => {
    try {
        const { email, code } = req.body;
        if (!email || !code) return res.status(400).json({ success: false, message: 'Email and code required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ success: false, message: 'User already verified' });
        if (user.verificationCode !== code) return res.status(400).json({ success: false, message: 'Invalid verification code' });

        user.isVerified = true;
        user.verificationCode = null;
        await user.save();

        const token = jwt.sign(
            { userId: user._id, email: user.email, role: user.role },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '24h' }
        );

        res.json({ 
            success: true, 
            token, 
            user: { 
                id: user._id, 
                email: user.email, 
                role: user.role, 
                selectedClasses: user.selectedClasses || [], 
                classes: user.classes || [] 
            } 
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- Resend verification code ---
router.post('/send-verification', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

        const user = await User.findOne({ email });
        if (!user) return res.status(400).json({ success: false, message: 'User not found' });
        if (user.isVerified) return res.status(400).json({ success: false, message: 'User already verified' });

        user.verificationCode = generateCode();
        await user.save();

        try {
            const msg = {
                to: email,
                from: { email: 'noreply@edumood.com', name: 'EduMood' },
                subject: 'Your EduMood Verification Code',
                text: `Your verification code is: ${user.verificationCode}`
            };
            await sgMail.send(msg);
            res.json({ success: true, message: 'Verification code sent to email' });
        } catch (emailError) {
            console.error('Resend email failed:', emailError);
            res.json({ 
                success: true, 
                message: 'Verification code: ' + user.verificationCode,
                verificationCode: user.verificationCode
            });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
