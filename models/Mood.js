const mongoose = require('mongoose');

const moodSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  className: { type: String, required: true },
  moodLevel: { type: Number, required: true },
  notes: { type: String, default: '' },
  date: { type: Date, default: Date.now }
});

moodSchema.index({ userId: 1 });
moodSchema.index({ className: 1 });

module.exports = mongoose.model('Mood', moodSchema);
