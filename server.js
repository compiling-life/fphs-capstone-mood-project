// server.js
import express from "express";
import bodyParser from "body-parser";
import session from "express-session";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import axios from "axios";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret-key",
    resave: false,
    saveUninitialized: true,
  })
);

// Gemini AI helper
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

async function getAIInsight(entry) {
  try {
    const response = await axios.post(
      "https://generativelanguage.googleapis.com/v1beta2/models/gemini-2.5-flash:generateText",
      {
        prompt: `Provide a short insight for a teacher based on this mood submission: ${JSON.stringify(entry)}`,
        maxOutputTokens: 200,
      },
      {
        headers: {
          "Authorization": `Bearer ${GEMINI_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );
    return response.data?.candidates?.[0]?.content || "Could not generate insight.";
  } catch (err) {
    console.error("Gemini API error:", err.response?.data || err.message);
    return "Could not generate insight.";
  }
}

// In-memory storage
let users = [];
let moods = [];

// --- Auth Routes ---
app.post("/api/auth/signup", (req, res) => {
  const { email, password, role, className, period, selectedClasses } = req.body;

  if (!email || !password || !role) return res.status(400).send("Missing fields");
  if (users.find(u => u.email === email)) return res.status(400).send("User exists");

  const userData = { email, password, role };

  if (role === "teacher") {
    if (!className || !period) return res.status(400).send("Teacher must provide className and period");
    userData.className = className;
    userData.period = period;
  } else if (role === "student") {
    if (!selectedClasses || !Array.isArray(selectedClasses) || selectedClasses.length === 0)
      return res.status(400).send("Student must select at least one class");
    if (selectedClasses.length > 7) return res.status(400).send("Cannot select more than 7 classes");
    userData.selectedClasses = selectedClasses;
  }

  users.push(userData);
  req.session.user = { email, role, selectedClasses: userData.selectedClasses || [] };
  res.send({ success: true, role });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).send("Invalid credentials");

  req.session.user = {
    email: user.email,
    role: user.role,
    selectedClasses: user.selectedClasses || [],
  };
  res.send({ success: true, role: user.role, selectedClasses: user.selectedClasses || [] });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.send({ success: true });
});

app.get("/api/auth/me", (req, res) => {
  if (!req.session.user) return res.status(401).json({ message: "Not logged in" });
  res.json(req.session.user);
});

app.post("/api/moods", async (req, res) => {
  const { className, moodLevel, notes } = req.body;
  if (!req.session.user) return res.status(401).send("Not logged in");

  // Find the teacher for the selected class
  const selectedClass = req.session.user.selectedClasses.find(c => c.className === className);
  const teacherEmail = selectedClass ? selectedClass.teacherEmail : null;

  const entry = {
    email: req.session.user.email,
    className,
    moodLevel,
    notes,
    date: new Date(),
    teacherEmail
  };

  moods.push(entry);

  const aiInsight = await getAIInsight(entry);
  res.send({ success: true, aiInsight });
});



app.get("/api/moods", (req, res) => {
    if (!req.session.user) return res.status(401).send("Not logged in");
  
    const { className } = req.query; // read class from query param
  
    if (req.session.user.role === "teacher") {
      const teacherMoods = moods.filter(m => {
        const student = users.find(u => u.email === m.email);
        return student?.selectedClasses?.some(c => c.teacherEmail === req.session.user.email);
      });
      res.send(teacherMoods);
    } else {
      let studentMoods = moods.filter(m => m.email === req.session.user.email);
      if (className) {
        studentMoods = studentMoods.filter(m => m.className === className);
      }
      res.send(studentMoods);
    }
  });
  

app.get("/api/student/me", (req, res) => {
  if (!req.session.user) return res.status(401).send("Not logged in");

  const user = users.find(u => u.email === req.session.user.email);
  if (!user) return res.status(404).send("User not found");

  res.send({
    email: user.email,
    role: user.role,
    selectedClasses: user.selectedClasses || []
  });
});

// --- Teachers Routes ---
app.get("/api/teachers/students", (req, res) => {
  if (!req.session.user || req.session.user.role !== "teacher") return res.status(401).send("Not authorized");
  const students = users.filter(u => u.selectedClasses?.some(c => c.teacherEmail === req.session.user.email));
  res.send(students);
});

app.get("/api/teachers/moods", (req, res) => {
  if (!req.session.user || req.session.user.role !== "teacher") 
    return res.status(401).send("Not authorized");

  const teacherMoods = moods.filter(m => m.teacherEmail === req.session.user.email);
  res.send(teacherMoods);
});


app.get("/api/teachers", (req, res) => {
  const teachers = users
    .filter(u => u.role === "teacher")
    .map(t => ({
      teacherEmail: t.email,
      className: t.className,
      period: t.period
    }));
  res.send(teachers);
});

// Serve frontend SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
