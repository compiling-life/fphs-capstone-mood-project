const express = require('express');
const router = express.Router();
const Mood = require('../models/Mood');
const User = require('../models/User');
const authMiddleware = require('../middleware/auth');

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
        const anonymousStudents = students.map(student => {
            const crypto = require('crypto');
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

module.exports = router;
