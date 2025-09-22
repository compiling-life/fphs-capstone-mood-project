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

// Axios helper for Gemini AI
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

// In-memory storage (replace with DB in production)
let users = [];
let moods = [];

// --- Auth Routes ---
app.post("/api/auth/signup", (req, res) => {
  const { email, password, role, teacherEmail, className, period, classes } = req.body;

  if (!email || !password || !role) return res.status(400).send({ success: false, message: "Missing fields" });
  if (users.find(u => u.email === email)) return res.status(400).send({ success: false, message: "User exists" });

  let newUser;
  if (role === "teacher") {
    if (!className || !period) return res.status(400).send({ success: false, message: "Teacher must provide class name and period" });
    newUser = { email, password, role, className, period };
  } else if (role === "student") {
    if (!classes || classes.length !== 7) return res.status(400).send({ success: false, message: "Student must provide 7 classes" });
    newUser = { email, password, role, classes }; // classes = array of objects: { teacherEmail, className, period }
  } else {
    return res.status(400).send({ success: false, message: "Invalid role" });
  }

  users.push(newUser);
  req.session.user = { email, role };
  res.send({ success: true, role });
});

app.post("/api/auth/login", (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  if (!user) return res.status(401).send({ success: false, message: "Invalid credentials" });

  req.session.user = { email: user.email, role: user.role };
  res.send({ success: true, role: user.role });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy();
  res.send({ success: true });
});

// Get all teachers for student signup dropdown
app.get("/api/teachers", (req, res) => {
  const teacherList = users
    .filter(u => u.role === "teacher")
    .map(t => ({ email: t.email, className: t.className, period: t.period }));
  res.send(teacherList);
});

// --- Moods Routes ---
app.post("/api/moods", async (req, res) => {
  const { className, moodLevel, notes } = req.body;
  if (!req.session.user) return res.status(401).send({ success: false, message: "Not logged in" });

  const entry = {
    email: req.session.user.email,
    className,
    moodLevel,
    notes,
    date: new Date(),
  };
  moods.push(entry);

  const aiInsight = await getAIInsight(entry);

  res.send({ success: true, aiInsight });
});

app.get("/api/moods", (req, res) => {
  if (!req.session.user) return res.status(401).send({ success: false, message: "Not logged in" });

  if (req.session.user.role === "teacher") {
    const teacherMoods = moods.filter(m => {
      const student = users.find(u => u.email === m.email);
      return student?.classes?.some(c => c.teacherEmail === req.session.user.email) || student?.teacherEmail === req.session.user.email;
    });
    res.send(teacherMoods);
  } else {
    const studentMoods = moods.filter(m => m.email === req.session.user.email);
    res.send(studentMoods);
  }
});

// --- Teachers Routes ---
app.get("/api/teachers/students", (req, res) => {
  if (!req.session.user || req.session.user.role !== "teacher") {
    return res.status(401).send({ success: false, message: "Not authorized" });
  }
  const students = users.filter(u => u.role === "student" && u.classes.some(c => c.teacherEmail === req.session.user.email));
  res.send(students);
});

app.get("/api/teachers/moods", (req, res) => {
  if (!req.session.user || req.session.user.role !== "teacher") {
    return res.status(401).send({ success: false, message: "Not authorized" });
  }
  const teacherMoods = moods.filter(m => {
    const student = users.find(u => u.email === m.email);
    return student?.classes?.some(c => c.teacherEmail === req.session.user.email);
  });
  res.send(teacherMoods);
});

// Serve frontend (SPA)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// Start server
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
