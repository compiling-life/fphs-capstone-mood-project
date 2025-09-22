const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const User = require('../models/User');

// Get all student moods (for dashboard)
router.get('/moods', async (req, res) => {
    try {
        const moods = await Mood.find()
            .sort({ timestamp: -1 })
            .populate('userId', 'email role'); // includes student email/role

        res.json({ success: true, moods });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get summary stats (for overview cards)
router.get('/summary', async (req, res) => {
    try {
        const moods = await Mood.find();
        const totalSubmissions = moods.length;

        let totalMood = 0;
        const classCounts = {};

        moods.forEach(m => {
            totalMood += m.moodLevel;
            if (!classCounts[m.className]) classCounts[m.className] = [];
            classCounts[m.className].push(m.moodLevel);
        });

        const averageMood = moods.length ? (totalMood / moods.length).toFixed(2) : 0;

        // Find most stressed class (lowest average mood)
        let mostStressedClass = '';
        let lowestAvg = Infinity;
        for (const [cls, scores] of Object.entries(classCounts)) {
            const avg = scores.reduce((a,b) => a+b, 0) / scores.length;
            if (avg < lowestAvg) {
                lowestAvg = avg;
                mostStressedClass = cls;
            }
        }

        // Optional: calculate active students percentage
        const uniqueStudents = new Set(moods.map(m => m.userId.toString()));
        const activeStudentsPercent = moods.length ? ((uniqueStudents.size / moods.length) * 100).toFixed(2) : 0;

        res.json({
            success: true,
            totalSubmissions,
            averageMood,
            mostStressedClass,
            activeStudentsPercent
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
