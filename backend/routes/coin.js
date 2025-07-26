const express = require('express');
const fs = require('fs');
const router = express.Router();

const usersPath = './data/users.json';
const requestsPath = './data/coinRequests.json';

// Coin so‘rov yuborish
router.post('/request', (req, res) => {
  const { userId, amount } = req.body;
  if (!userId || !amount) return res.status(400).json({ error: "Missing fields" });

  const requests = JSON.parse(fs.readFileSync(requestsPath, 'utf-8'));
  requests.push({ userId, amount, status: "pending" });
  fs.writeFileSync(requestsPath, JSON.stringify(requests, null, 2));
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

const users = JSON.parse(fs.readFileSync('./data/users.json'));

users.forEach(user => {
  if (user.coin === undefined) {
    user.coin = 500;
  }
});

fs.writeFileSync('./data/users.json', JSON.stringify(users, null, 2));
console.log("Barcha foydalanuvchilarga coin qo‘shildi.");

module.exports = router;
