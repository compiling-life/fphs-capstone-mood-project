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
// Get all teachers (for student class selection) - FIXED VERSION
// Get all teachers (for student class selection) - FIXED
app.get("/api/teachers", async (req, res) => {
  try {
      console.log('=== TEACHERS API CALLED ===');
      
      // Test database connection
      if (mongoose.connection.readyState !== 1) {
          console.error('Database not connected');
          return res.status(500).json({ error: 'Database not connected' });
      }

      // Find all teachers
      const teachers = await User.find({ role: 'teacher' });
      console.log(`Found ${teachers.length} teachers:`, teachers);

      // Format response
      const teacherData = teachers.map(teacher => {
          // Make sure we have the required fields
          const teacherObj = {
              teacherEmail: teacher.email,
              className: teacher.className || 'Unnamed Class',
              period: teacher.period || 'No Period',
              email: teacher.email
          };
          console.log('Teacher data:', teacherObj);
          return teacherObj;
      });

      console.log('Sending teacher data:', teacherData);
      res.json(teacherData);

  } catch (error) {
      console.error('❌ Teachers API error:', error);
      res.status(500).json({ 
          error: 'Failed to fetch teachers',
          message: error.message 
      });
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

// Debug endpoint to see all users
app.get("/api/debug/users", async (req, res) => {
  try {
      console.log('=== DEBUG: Fetching all users ===');
      const allUsers = await User.find({})
          .select('email role className period selectedClasses')
          .lean();
      
      console.log('All users in database:', allUsers);
      
      res.json({
          totalUsers: allUsers.length,
          teachers: allUsers.filter(u => u.role === 'teacher'),
          students: allUsers.filter(u => u.role === 'student'),
          allUsers: allUsers
      });
  } catch (error) {
      console.error('Debug error:', error);
      res.status(500).json({ error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`MongoDB: ${process.env.MONGODB_URI ? 'Connected' : 'Using local database'}`);
});
