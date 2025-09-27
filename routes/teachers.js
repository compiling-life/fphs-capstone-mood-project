import express from 'express';

import Mood from '../models/Mood.js';

import User from '../models/User.js';

import authMiddleware from '../middleware/auth.js';

const router = express.Router();

router.get('/', async (req, res) => 
{
  try 
  {
    const teachers = await User.find({ role: 'teacher' })
          .select('email className period teacherEmail')
          .lean();

    const teacherData = teachers.map(teacher => (
    {
        teacherEmail: teacher.email,
        className: teacher.className,
        period: teacher.period || 'No Period',
        email: teacher.email
    }));

    console.log('Sending teachers with periods:', teacherData);

    res.json(teacherData);

  } 
  
  catch (error) 
  {
      console.error('Error fetching teachers:', error);

      res.status(500).json(
      { 
        success: false, 
        message: 'Error fetching teachers'
      });
  }
});

router.use(authMiddleware);

router.get('/moods', async (req, res) => 
{
    try 
    {
        const teacher = req.user;
        
        if (teacher.role !== 'teacher') 
        {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const moods = await Mood.find({ teacherEmail: teacher.email })
            .populate('userId', 'email role')
            .sort({ date: -1 });

        const anonymousMoods = moods.map(mood => (
        {
            _id: mood._id,
            className: mood.className,
            moodLevel: mood.moodLevel,
            notes: mood.notes,
            date: mood.date,
            anonymousId: mood.anonymousId
        }));

        res.json({ success: true, moods: anonymousMoods });
    } 
    
    catch (err) 
    {
        console.error("Error fetching teacher moods:", err);

        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.get('/students', async (req, res) => 
{
    try 
    {
        const teacher = req.user;
        
        if (teacher.role !== 'teacher') 
        {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const students = await User.find(
        {
            role: 'student',
            'selectedClasses.teacherEmail': teacher.email
        }).select('email selectedClasses');

        const crypto = require('crypto');

        const anonymousStudents = students.map(student => 
        {
            const anonymousId = crypto.createHash('md5').update(student._id.toString()).digest('hex').substring(0, 8);
            
            return {
                anonymousId,
                selectedClasses: student.selectedClasses.filter(cls => cls.teacherEmail === teacher.email)
            };
        });

        res.json({ success: true, students: anonymousStudents });
    } 
    
    catch (err) 
    {
        console.error("Error fetching teacher's students:", err);

        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;
