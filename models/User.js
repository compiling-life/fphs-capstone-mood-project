import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['student', 'teacher'], required: true },
  
  // 🔥 ADD THESE FIELDS FOR TEACHERS
  className: { type: String }, // Teacher's class name
  period: { type: String },    // Teacher's class period
  
  selectedClasses: {
    type: [
      { 
        className: { type: String, required: true }, 
        period: { type: String }, 
        teacherEmail: { type: String } 
      }
    ],
    default: []
  },
  teacherEmail: { type: String, default: null },

  verificationCode: { type: String },
  isVerified: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

UserSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
  next();
});

UserSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

export default mongoose.model('User', UserSchema);
