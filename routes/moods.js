const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

// Apply auth middleware to all routes
router.use(authMiddleware);

// Submit a new mood
router.post('/', async (req, res) => {
    try {
        const user = req.user;
        const { className, moodLevel, notes } = req.body;
        
        if (!className || !moodLevel) {
            return res.status(400).json({ success: false, message: 'Class and mood level are required' });
        }

        // Find the teacher for this class
        let teacherEmail = '';
        if (user.role === 'student') {
            const selectedClass = user.selectedClasses.find(c => c.className === className);
            if (!selectedClass || !selectedClass.teacherEmail) {
                return res.status(400).json({ success: false, message: 'Invalid class selected' });
            }
            teacherEmail = selectedClass.teacherEmail;
        } else {
            teacherEmail = user.email; // Teacher is submitting for their own class
        }

        const mood = new Mood({
            userId: user._id,
            className,
            moodLevel: parseInt(moodLevel),
            notes: notes || '',
            teacherEmail
        });

        await mood.save();
        
        // Populate the saved mood for response
        await mood.populate('userId', 'email role');
        
        res.json({ 
            success: true, 
            mood: {
                _id: mood._id,
                className: mood.className,
                moodLevel: mood.moodLevel,
                notes: mood.notes,
                date: mood.date,
                anonymousId: mood.anonymousId
            }
        });
    } catch (err) {
        console.error('Error submitting mood:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get moods for current user
router.get('/', async (req, res) => {
    try {
        const user = req.user;
        let moods;

        if (user.role === 'teacher') {
            // Teacher sees all moods for their classes
            moods = await Mood.find({ teacherEmail: user.email })
                .populate('userId', 'email role')
                .sort({ date: -1 });
            
            // Anonymize for teacher view
            const anonymousMoods = moods.map(mood => ({
                _id: mood._id,
                className: mood.className,
                moodLevel: mood.moodLevel,
                notes: mood.notes,
                date: mood.date,
                anonymousId: mood.anonymousId
            }));
            
            res.json(anonymousMoods);
        } else {
            // Student sees only their own moods
            moods = await Mood.find({ userId: user._id })
                .sort({ date: -1 });
            res.json(moods);
        }
    } catch (err) {
        console.error('Error fetching moods:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
