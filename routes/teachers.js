const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const auth = require('../middleware/auth');

// Get all moods relevant to teacher
router.get('/moods', auth, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') return res.status(403).json({ message: 'Forbidden' });

    // All moods from students where teacherEmail matches
    const moods = await Mood.find()
      .populate('userId', 'email')
      .sort({ date: -1 });

    // Filter moods for this teacher
    const filtered = moods.filter(m => {
      const studentClasses = m.userId.selectedClasses || [];
      return studentClasses.some(c => c.teacherEmail === req.user.email && c.className === m.className);
    });

    res.json(filtered);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
