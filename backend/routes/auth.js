const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const usersPath = path.join(__dirname, '../data/users.json');

function readUsers() {
  return fs.existsSync(usersPath) ? JSON.parse(fs.readFileSync(usersPath)) : [];
}

function saveUsers(data) {
  fs.writeFileSync(usersPath, JSON.stringify(data, null, 2));
}

router.post('/login', (req, res) => {
  const { email, password, role } = req.body;
  let users = readUsers();
  let user = users.find(u => u.email === email && u.role === role);

  if (!user) {
    const newUser = {
      id: Date.now().toString(),
      email,
      password,
      role,
      name: "",
      school: "",
      grade: "",
      bio: "",
      coin: 0
    };
    users.push(newUser);
    saveUsers(users);
    return res.json({ success: true, user: newUser });
  }

  if (user.password !== password) {
    return res.status(401).json({ success: false, message: 'Noto‘g‘ri parol' });
  }

  res.json({ success: true, user });
});

router.post('/register', (req, res) => {
  const { role, name, school, subject, experience, phone, email, password, bio } = req.body;

  let users = readUsers();
  let userExists = users.find(u => u.email === email && u.role === role);

  if (userExists) {
    return res.status(400).json({ success: false, message: 'Bu foydalanuvchi allaqachon mavjud' });
  }

  const newUser = {
    id: Date.now().toString(),
    role,
    name,
    school,
    subject: subject || "",       // Studentda bo'lmaydi
    experience: experience || "", // Studentda bo'lmaydi
    grade: "",                    // O'qituvchida bo'lmaydi
    phone,
    email,
    password,
    bio,
    coin: 0
  };

  users.push(newUser);
  saveUsers(users);
  res.json({ success: true, user: newUser });
});

module.exports = router;
