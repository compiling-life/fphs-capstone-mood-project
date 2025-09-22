const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  class: String,
  moodLevel: Number,
  notes: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Mood', moodSchema);
