const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // renamed to match other code
  className: { type: String, required: true }, // consistent with frontend class naming
  moodLevel: { type: Number, required: true },
  notes: { type: String, default: '' },
  date: { type: Date, default: Date.now } // timestamp of submission
});

// Optional: index for faster queries by user or class
moodSchema.index({ userId: 1 });
moodSchema.index({ className: 1 });

module.exports = mongoose.model('Mood', moodSchema);
