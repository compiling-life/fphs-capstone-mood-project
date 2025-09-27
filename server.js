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

app.use(cors());

app.use(bodyParser.json());

app.use(bodyParser.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/edumood',
{
    useNewUrlParser: true,
    useUnifiedTopology: true,
}).then(() => 
{
    console.log('Connected to MongoDB');
}).catch((err) => 
{
    console.error('MongoDB connection error:', err);
});

import authRoutes from './routes/auth.js';

import moodRoutes from './routes/moods.js';

import teacherRoutes from './routes/teachers.js';

app.use('/api/auth', authRoutes);

app.use('/api/moods', moodRoutes);

app.use('/api/teachers', teacherRoutes);

app.get("/api/health", (req, res) => 
{
    res.json(
    { 
        status: "OK", 
        message: "Server is running",
        timestamp: new Date().toISOString()
    });
});

app.get("/api/debug/users", async (req, res) => 
{
    try 
    {
        const User = (await import('./models/User.js')).default;
        
        console.log('=== DEBUG: Fetching all users ===');

        const allUsers = await User.find({})
            .select('email role className period selectedClasses')
            .lean();
        
        console.log('All users in database:', allUsers);
        
        res.json(
        {
            totalUsers: allUsers.length,
            teachers: allUsers.filter(u => u.role === 'teacher'),
            students: allUsers.filter(u => u.role === 'student'),
            allUsers: allUsers
        });
    } 
    
    catch (error) 
    {
        console.error('Debug error:', error);

        res.status(500).json({ error: error.message });
    }
});

app.post('/api/fix-teachers-now', async (req, res) => 
{
  try 
  {
      const User = (await import('./models/User.js')).default;
      
      console.log('Fixing teachers with specific data...');
      
      await User.updateOne(
          { email: 'farisfarag452@yahoo.com' },
          { 
              $set: 
              {
                  className: 'Mathematics',
                  period: '1st Period'
              }
          }
      );
      
      await User.updateOne
      (
          { email: 'robloxluther@gmail.com' },
          { 
              $set: 
              {
                  className: 'Science', 
                  period: '2nd Period'
              }
          }
      );
      
      const teachers = await User.find({ role: 'teacher' });

      console.log('Updated teachers:', teachers);
      
      res.json(
      { 
          success: true, 
          message: 'Teachers fixed successfully',
          teachers: teachers.map(t => ({ email: t.email, className: t.className, period: t.period }))
      });
  } 
  
  catch (error) 
  {
      console.error('Error fixing teachers:', error);

      res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/update-teachers-schema', async (req, res) => 
{
  try 
  {
      const User = (await import('./models/User.js')).default;
      
      console.log('Updating teachers with new schema...');
      
      await User.updateMany
      (
          { role: 'teacher' },
          { 
              $set: 
              {
                  className: 'General Class',
                  period: '1st Period'
              }
          }
      );
      
      const teachers = await User.find({ role: 'teacher' });

      console.log('Updated teachers:', teachers);
      
      res.json(
      { 
          success: true, 
          message: 'Teachers updated with new schema fields',
          teachers: teachers.map(t => ({ 
              email: t.email, 
              className: t.className, 
              period: t.period,
              role: t.role 
          }))
      });
  } 
  
  catch (error) 
  {
      console.error('Error updating teachers:', error);

      res.status(500).json({ success: false, error: error.message });
  }
});

app.post("/api/test/setup", async (req, res) => 
{
    try 
    {
        const User = (await import('./models/User.js')).default;

        const Mood = (await import('./models/Mood.js')).default;
        
        await User.deleteMany({});

        await Mood.deleteMany({});

        const teacher = new User(
        {
            email: "teacher@school.com",
            password: "password123",
            role: "teacher",
            className: "Biology",
            period: "1st Period"
        });

        await teacher.save();

        const student = new User(
        {
            email: "student@school.com",
            password: "password123",
            role: "student",
            selectedClasses: 
            [
                { className: "Biology", period: "1st Period", teacherEmail: "teacher@school.com" }
            ]
        });

        await student.save();

        res.json(
        { 
            success: true, 
            message: "Test data created",
            teacher: { email: teacher.email, password: "password123" },
            student: { email: student.email, password: "password123" }
        });
    } 
    
    catch (error) 
    {
        console.error("Test setup error:", error);

        res.status(500).json({ success: false, message: "Error setting up test data" });
    }
});

app.get("*", (req, res) => 
{
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.use((error, req, res, next) => 
{
    console.error("Unhandled error:", error);

    res.status(500).json(
    { 
        success: false, 
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
});

app.listen(PORT, () => 
{
    console.log(`Server running on port ${PORT}`);
    
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
