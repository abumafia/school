const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const usersPath = path.join(__dirname, '../data/users.json');
const lessonsPath = path.join(__dirname, '../data/lessons.json');

// Helper funksiyalar
function readJSON(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

// 📊 Statistikani olish
router.get('/stats', (req, res) => {
  const users = readJSON(usersPath);
  const lessons = readJSON(lessonsPath);

  const totalUsers = users.length;
  const totalTeachers = users.filter(u => u.role === 'teacher').length;
  const totalLessons = lessons.length;

  res.json({ totalUsers, totalTeachers, totalLessons });
});

// 📚 Barcha darslarni olish
router.get('/lessons', (req, res) => {
  const lessons = readJSON(lessonsPath);
  res.json(lessons);
});

// 👤 Barcha foydalanuvchilarni olish
router.get('/users', (req, res) => {
  const users = readJSON(usersPath);
  res.json(users);
});

// ❌ Foydalanuvchini o‘chirish
router.delete('/delete-user/:id', (req, res) => {
  const users = readJSON(usersPath);
  const filtered = users.filter(user => user.id !== req.params.id);
  writeJSON(usersPath, filtered);
  res.json({ success: true });
});

// ❌ Darsni o‘chirish
router.delete('/delete-lesson/:id', (req, res) => {
  const lessons = readJSON(lessonsPath);
  const filtered = lessons.filter(lesson => lesson.id !== req.params.id);
  writeJSON(lessonsPath, filtered);
  res.json({ success: true });
});

// Admin tomonidan tasdiqlash
router.post('/approve', (req, res) => {
  const { userId } = req.body;

  const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
  const requests = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'));

  const requestIndex = requests.findIndex(r => r.userId === userId && r.status === "pending");
  if (requestIndex === -1) return res.status(404).json({ error: "Request not found" });

  const { amount } = requests[requestIndex];
  const user = users.find(u => u.id === userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  user.coin = (user.coin || 0) + amount;
  requests[requestIndex].status = "approved";

  fs.writeFileSync(usersPath, JSON.stringify(users, null, 2));
  fs.writeFileSync(requestsPath, JSON.stringify(requests, null, 2));

  res.json({ success: true });
});

// So‘rovlar tarixini olish
router.get("/history/:id", (req, res) => {
  const userId = req.params.id;
  const requests = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'));
  const history = requests.filter(r => r.userId === userId);
  res.json(history);
});

// Barcha coin so'rovlarini olish (admin panel uchun)
router.get('/requests', (req, res) => {
  const requests = JSON.parse(fs.readFileSync('./data/coinRequests.json', 'utf-8'));
  res.json(requests);
});

module.exports = router;
