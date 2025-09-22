const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const User = require('../models/User');

// Get all student moods for teacher dashboard
router.get('/moods', async (req, res) => {
  try {
    const moods = await Mood.find()
      .sort({ date: -1 }) // latest first
      .populate('userId', 'email role'); // get student's email

    res.json(moods); // send array of moods
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching moods' });
  }
});

module.exports = router;
