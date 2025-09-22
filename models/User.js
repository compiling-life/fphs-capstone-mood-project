const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // hashed
  role: { type: String, enum: ['student','teacher'], required: true },
  teacherId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' } // for students
});

module.exports = mongoose.model('User', userSchema);
