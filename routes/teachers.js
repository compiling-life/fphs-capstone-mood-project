const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood'); // adjust path if needed
const User = require('../models/User'); // if you want teacher info

// Get all student moods (for dashboard)
router.get('/moods', async (req, res) => {
    try {
        const moods = await Mood.find()
            .sort({ timestamp: -1 })
            .populate('userId', 'email role'); // includes student email/role
        res.json({ moods });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

// Get summary stats (optional, for overview cards)
router.get('/summary', async (req, res) => {
    try {
        const totalSubmissions = await Mood.countDocuments();
        const moods = await Mood.find();

        let totalMood = 0;
        const classCounts = {};

        moods.forEach(m => {
            totalMood += m.moodLevel;
            if (!classCounts[m.className]) classCounts[m.className] = [];
            classCounts[m.className].push(m.moodLevel);
        });

        const averageMood = moods.length ? (totalMood / moods.length).toFixed(1) : 0;

        // Find most stressed class (lowest average mood)
        let mostStressedClass = '';
        let lowestAvg = Infinity;
        for (const [cls, scores] of Object.entries(classCounts)) {
            const avg = scores.reduce((a,b)=>a+b,0)/scores.length;
            if (avg < lowestAvg) {
                lowestAvg = avg;
                mostStressedClass = cls;
            }
        }

        res.json({
            totalSubmissions,
            averageMood,
            mostStressedClass,
            activeStudentsPercent: 87 // optional: calculate real if needed
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'Server error' });
    }
});

module.exports = router;
