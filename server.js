// server.js
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const axios = require('axios');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static('public'));

// In-memory storage (replace with a real DB later)
const users = []; // { email, password, role, teacherEmail }
const moods = []; // { studentEmail, className, moodScore, notes, date }

// Helper function to get AI insights
async function getAIInsights(prompt) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return "No API key set for Gemini AI.";

    try {
        const response = await axios.post(
            'https://generativelanguage.googleapis.com/v1beta2/models/gemini-2.5-flash:generateText',
            {
                prompt,
                maxOutputTokens: 150
            },
            {
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                }
            }
        );
        return response.data?.candidates?.[0]?.output || "No insight generated.";
    } catch (err) {
        console.error(err.message);
        return "Failed to fetch AI insight.";
    }
}

// Routes

// Signup
app.post('/signup', (req, res) => {
    const { email, password, role, teacherEmail } = req.body;
    if (!email || !password || !role) return res.status(400).json({ error: 'Missing fields' });

    if (users.find(u => u.email === email)) return res.status(400).json({ error: 'User exists' });

    users.push({ email, password, role, teacherEmail: role === 'student' ? teacherEmail : null });
    res.json({ success: true });
});

// Login
app.post('/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    res.json({ success: true, role: user.role });
});

// Submit mood
app.post('/submit-mood', (req, res) => {
    const { studentEmail, className, moodScore, notes } = req.body;
    if (!studentEmail || !className || moodScore == null) return res.status(400).json({ error: 'Missing fields' });

    moods.push({ studentEmail, className, moodScore, notes: notes || '', date: new Date() });
    res.json({ success: true });
});

// Get student moods
app.get('/student-moods/:email', (req, res) => {
    const email = req.params.email;
    const studentMoods = moods.filter(m => m.studentEmail === email);
    res.json(studentMoods);
});

// Get teacher dashboard (all moods from students of this teacher)
app.get('/teacher-dashboard/:teacherEmail', async (req, res) => {
    const teacherEmail = req.params.teacherEmail;
    const studentEmails = users.filter(u => u.teacherEmail === teacherEmail).map(u => u.email);
    const teacherMoods = moods.filter(m => studentEmails.includes(m.studentEmail));

    // Generate AI insights (example)
    const prompt = `Analyze these classroom moods and suggest ways to reduce stress:\n${JSON.stringify(teacherMoods)}`;
    const aiInsight = await getAIInsights(prompt);

    res.json({ moods: teacherMoods, insight: aiInsight });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
