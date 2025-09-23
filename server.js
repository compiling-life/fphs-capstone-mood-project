// server.js
import express from "express";
import bodyParser from "body-parser";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import mongoose from "mongoose";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edumood', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  ssl: true,
  tlsAllowInvalidCertificates: true, // For development
  // Or better: tlsCAFile: './ca-certificate.crt' // For production
});

mongoose.connection.on('connected', () => {
    console.log('Connected to MongoDB');
});

mongoose.connection.on('error', (err) => {
    console.error('MongoDB connection error:', err);
});

// Import models
import User from './models/User.js';
import Mood from './models/Mood.js';

// Import routes
import authRoutes from './routes/auth.js';
import moodRoutes from './routes/moods.js';
import teacherRoutes from './routes/teachers.js';

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/teachers', teacherRoutes);

// --- CRITICAL: Add these missing endpoints that your frontend needs ---

// Get all teachers (for student class selection)
app.get("/api/teachers", async (req, res) => {
    try {
        const teachers = await User.find({ role: 'teacher' })
            .select('email className period')
            .lean();
        
        const teacherData = teachers.map(teacher => ({
            teacherEmail: teacher.email,
            className: teacher.className,
            period: teacher.period
        }));
        
        res.json(teacherData);
    } catch (error) {
        console.error("Error fetching teachers:", error);
        res.status(500).json({ success: false, message: "Error fetching teachers" });
    }
});

// Get current user info
app.get("/api/auth/me", async (req, res) => {
    try {
        // This should use JWT auth, but for now return simple response
        const token = req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ message: "Not authenticated" });
        }
        
        // In a real app, you'd verify the JWT token here
        // For now, return a simple response
        res.json({ message: "Auth check endpoint - implement JWT verification" });
    } catch (error) {
        console.error("Auth check error:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
});

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "OK", 
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

// Test data endpoint (for development)
app.post("/api/test/setup", async (req, res) => {
    try {
        // Clear existing data
        await User.deleteMany({});
        await Mood.deleteMany({});

        // Create a test teacher
        const teacher = new User({
            email: "teacher@school.com",
            password: "password123",
            role: "teacher",
            className: "Biology",
            period: "1st Period"
        });
        await teacher.save();

        // Create a test student
        const student = new User({
            email: "student@school.com",
            password: "password123",
            role: "student",
            selectedClasses: [
                { className: "Biology", period: "1st Period", teacherEmail: "teacher@school.com" }
            ]
        });
        await student.save();

        res.json({ 
            success: true, 
            message: "Test data created",
            teacher: { email: teacher.email, password: "password123" },
            student: { email: student.email, password: "password123" }
        });
    } catch (error) {
        console.error("Test setup error:", error);
        res.status(500).json({ success: false, message: "Error setting up test data" });
    }
});

// Serve frontend SPA (must be last)
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error("Unhandled error:", error);
    res.status(500).json({ 
        success: false, 
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Using local database'}`);
});
