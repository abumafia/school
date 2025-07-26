const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const usersFile = path.join(__dirname, '../data/users.json');

// Barcha foydalanuvchilarni olish
router.get('/', (req, res) => {
  fs.readFile(usersFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Fayl o‘qishda xatolik' });
    res.json(JSON.parse(data));
  });
});

// Foydalanuvchini ID orqali tahrirlash
router.put('/:id', (req, res) => {
  const userId = req.params.id;
  const updatedData = req.body;

  fs.readFile(usersFile, 'utf8', (err, data) => {
    if (err) return res.status(500).json({ message: 'Fayl o‘qishda xatolik' });

    let users = JSON.parse(data);
    const index = users.findIndex(u => u.id === userId);
    if (index === -1) return res.status(404).json({ message: 'Foydalanuvchi topilmadi' });

    users[index] = { ...users[index], ...updatedData };

    fs.writeFile(usersFile, JSON.stringify(users, null, 2), (err) => {
      if (err) return res.status(500).json({ message: 'Saqlashda xatolik' });
      res.json({ message: 'Tahrirlandi', user: users[index] });
    });
  });
});

module.exports = router;
