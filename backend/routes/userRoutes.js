// backend/routes/userRoutes.js (yoki server.js ichida)
const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();

const usersFile = path.join(__dirname, '../data/users.json');

function readUsers() {
  return JSON.parse(fs.readFileSync(usersFile, 'utf-8'));
}

function writeUsers(users) {
  fs.writeFileSync(usersFile, JSON.stringify(users, null, 2));
}

// PUT /api/users/:id
router.put('/:id', (req, res) => {
  const users = readUsers();
  const userId = req.params.id;
  const index = users.findIndex(u => u.id == userId);

  if (index === -1) {
    return res.status(404).json({ success: false, message: 'Foydalanuvchi topilmadi' });
  }

  // Yangilash
  users[index] = { ...users[index], ...req.body };
  writeUsers(users);

  return res.json({ success: true, user: users[index] });
});

module.exports = router;
