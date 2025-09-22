const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood'); 
const User = require('../models/User'); // Assuming you have a User model

// Submit a mood (student)
router.post('/submit', async (req, res) => {
    try {
        const { userId, className, moodLevel, notes } = req.body;
        if (!userId || !className || !moodLevel) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const mood = new Mood({ userId, className, moodLevel, notes: notes || '' });
        await mood.save();
        res.status(201).json({ message: 'Mood submitted successfully', mood });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get moods for a specific student
router.get('/student/:userId', async (req, res) => {
    try {
        const moods = await Mood.find({ userId: req.params.userId }).sort({ timestamp: -1 });
        res.json({ moods });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get moods for all students under a teacher
router.get('/teacher/:teacherId', async (req, res) => {
    try {
        const teacherId = req.params.teacherId;

        // Get all students for this teacher
        const students = await User.find({
            role: 'student',
            'selectedClasses.teacherId': teacherId
        }).select('_id email selectedClasses');

        const studentIds = students.map(s => s._id);

        // Get moods for these students
        const moods = await Mood.find({ userId: { $in: studentIds } })
            .sort({ timestamp: -1 })
            .populate('userId', 'email');

        res.json(moods); // send as array
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});


module.exports = router;
