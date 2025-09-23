const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const User = require('../models/User');

// Get all moods for the logged-in teacher
router.get('/moods', async (req, res) => {
  try {
      const teacher = req.user; // this assumes you're using auth middleware
      if (!teacher || teacher.role !== 'teacher') {
          return res.status(403).json({ success: false, message: 'Not authorized' });
      }

      // Find only moods where teacherEmail matches the logged-in teacher
      const moods = await Mood.find({ teacherEmail: teacher.email })
          .sort({ date: -1 })
          .populate('userId', 'email role');

      res.json({ success: true, moods });
  } catch (err) {
      console.error("Error fetching moods:", err);
      res.status(500).json({ success: false, message: 'Server error' });
  }
});

// ✅ Summary stats (for overview cards)
router.get('/summary', async (req, res) => {
    try {
        const teacher = await User.findById(req.session.userId);
        if (!teacher || teacher.role !== 'teacher') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const moods = await Mood.find()
            .populate('userId', 'email role selectedClasses');

        // Filter moods for this teacher
        const teacherMoods = moods.filter(mood =>
            mood.userId?.selectedClasses?.some(cls =>
                cls.className === mood.className &&
                cls.teacherEmail === teacher.email
            )
        );

        const totalSubmissions = teacherMoods.length;
        const totalMood = teacherMoods.reduce((sum, m) => sum + m.moodLevel, 0);
        const averageMood = totalSubmissions ? (totalMood / totalSubmissions).toFixed(2) : 0;

        // Count per class
        const classCounts = {};
        teacherMoods.forEach(m => {
            if (!classCounts[m.className]) classCounts[m.className] = [];
            classCounts[m.className].push(m.moodLevel);
        });

        // Most stressed class
        let mostStressedClass = '';
        let lowestAvg = Infinity;
        for (const [cls, scores] of Object.entries(classCounts)) {
            const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
            if (avg < lowestAvg) {
                lowestAvg = avg;
                mostStressedClass = cls;
            }
        }

        res.json({
            success: true,
            totalSubmissions,
            averageMood,
            mostStressedClass
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;
