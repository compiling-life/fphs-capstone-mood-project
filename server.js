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
}).then(() => {
    console.log('Connected to MongoDB');
}).catch((err) => {
    console.error('MongoDB connection error:', err);
});

// Import routes
import authRoutes from './routes/auth.js';
import moodRoutes from './routes/moods.js';
import teacherRoutes from './routes/teachers.js';

// Use routes
app.use('/api/auth', authRoutes);
app.use('/api/moods', moodRoutes);
app.use('/api/teachers', teacherRoutes);

// Health check endpoint
app.get("/api/health", (req, res) => {
    res.json({ 
        status: "OK", 
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

// Debug endpoint to see all users
app.get("/api/debug/users", async (req, res) => {
    try {
        // Import User model dynamically to avoid circular dependencies
        const User = (await import('./models/User.js')).default;
        
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

// Fix existing teachers - add this to server.js
// Fix existing teachers - add this to server.js
app.post('/api/fix-teachers', async (req, res) => {
  try {
      const User = (await import('./models/User.js')).default;
      
      console.log('Fixing existing teachers...');
      
      // Update first teacher
      const teacher1 = await User.findOneAndUpdate(
          { email: 'farisfarag452@yahoo.com' },
          { 
              className: 'Mathematics',
              period: '1st Period'
          },
          { new: true } // Return updated document
      );
      
      // Update second teacher  
      const teacher2 = await User.findOneAndUpdate(
          { email: 'robloxluther@gmail.com' },
          { 
              className: 'Science',
              period: '2nd Period'
          },
          { new: true }
      );
      
      console.log('Updated teachers:', teacher1, teacher2);
      
      res.json({ 
          success: true, 
          message: 'Teachers updated with class names',
          teachers: [teacher1, teacher2]
      });
  } catch (error) {
      console.error('Error fixing teachers:', error);
      res.status(500).json({ success: false, error: error.message });
  }
});

// Test data endpoint (for development)
app.post("/api/test/setup", async (req, res) => {
    try {
        // Import models dynamically
        const User = (await import('./models/User.js')).default;
        const Mood = (await import('./models/Mood.js')).default;
        
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
});
