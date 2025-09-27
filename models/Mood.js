import mongoose from 'mongoose';

import crypto from 'crypto';

const moodSchema = new mongoose.Schema(
{
  userId: 
  {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  className: 
  {
    type: String,
    required: true
  },
  moodLevel: 
  {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  notes: 
  {
    type: String,
    default: ''
  },
  period: 
  {
    type: String,
    default: ''
  },
  teacherEmail: 
  {
    type: String,
    required: true
  },
  date: 
  {
    type: Date,
    default: Date.now
  },
  anonymousId: 
  {
    type: String
  }
});

moodSchema.pre('save', function(next) 
{
  if (!this.anonymousId) 
  {
    this.anonymousId = crypto.createHash('md5').update(this.userId.toString()).digest('hex').substring(0, 8);
  }
  next();
});

export default mongoose.model('Mood', moodSchema);
