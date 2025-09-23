import express from 'express';
import Mood from '../models/Mood.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// 🔥 ADD THIS PUBLIC ENDPOINT - students need to see available classes before signing up
router.get('/', async (req, res) => {
    try {
        console.log('🔍 Fetching teachers for class selection...');
        
        const teachers = await User.find({ role: 'teacher' })
            .select('email className period')
            .lean();

        console.log(`📊 Found ${teachers.length} teachers`);

        const teacherData = teachers.map(teacher => ({
            teacherEmail: teacher.email,
            className: teacher.className || 'Unnamed Class',
            period: teacher.period || 'No Period',
            email: teacher.email
        }));

        console.log('✅ Sending public teacher data:', teacherData);
        res.json(teacherData);

    } catch (error) {
        console.error('❌ Error fetching teachers:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Error fetching teachers',
            error: error.message 
        });
    }
});

// 🔥 PROTECTED ROUTES BELOW (require authentication)
router.use(authMiddleware);

// Get all moods for the logged-in teacher
router.get('/moods', async (req, res) => {
    try {
        const teacher = req.user;
        
        if (teacher.role !== 'teacher') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const moods = await Mood.find({ teacherEmail: teacher.email })
            .populate('userId', 'email role')
            .sort({ date: -1 });

        // Anonymize the data
        const anonymousMoods = moods.map(mood => ({
            _id: mood._id,
            className: mood.className,
            moodLevel: mood.moodLevel,
            notes: mood.notes,
            date: mood.date,
            anonymousId: mood.anonymousId
        }));

        res.json({ success: true, moods: anonymousMoods });
    } catch (err) {
        console.error("Error fetching teacher moods:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Get teacher's students
router.get('/students', async (req, res) => {
    try {
        const teacher = req.user;
        
        if (teacher.role !== 'teacher') {
            return res.status(403).json({ success: false, message: 'Not authorized' });
        }

        const students = await User.find({
            role: 'student',
            'selectedClasses.teacherEmail': teacher.email
        }).select('email selectedClasses');

        // Anonymize student data
        const crypto = require('crypto');
        const anonymousStudents = students.map(student => {
            const anonymousId = crypto.createHash('md5').update(student._id.toString()).digest('hex').substring(0, 8);
            
            return {
                anonymousId,
                selectedClasses: student.selectedClasses.filter(cls => cls.teacherEmail === teacher.email)
            };
        });

        res.json({ success: true, students: anonymousStudents });
    } catch (err) {
        console.error("Error fetching teacher's students:", err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

export default router;