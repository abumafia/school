const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');

const app = express(); // <-- BUNI BIRINCHI QO‘YING
const server = http.createServer(app); // <-- keyin server yaratiladi
const io = new Server(server, {
  cors: { origin: '*' }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ROUTELAR
const authRoutes = require('./routes/auth');
const lessonRoutes = require('./routes/lesson');
const adminRoutes = require('./routes/admin');
const usersRouter = require('./routes/users');
const chatRoutes = require('./routes/chat');

app.use('/api/auth', authRoutes);
app.use('/api/lessons', lessonRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/users', usersRouter);
app.use('/api/users', require('./routes/userRoutes'));
app.use('/api/chat', chatRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Test route
app.get('/', (req, res) => {
  res.send('School Website API working ✅');
});

// PUT user update route
const { readJSON, writeJSON } = require('./utils/file'); // Fayl o‘quv yozuv funksiya kerak bo‘lsa
app.put("/api/users/:id", (req, res) => {
  const userId = req.params.id;
  const updatedData = req.body;

  const users = readJSON("data/users.json");
  const userIndex = users.findIndex(u => u.id == userId);

  if (userIndex === -1) {
    return res.json({ success: false, message: "User not found" });
  }

  users[userIndex] = {
    ...users[userIndex],
    ...updatedData
  };

  writeJSON("data/users.json", users);

  res.json({ success: true, user: users[userIndex] });
});

// SOCKET.IO — SHAXSIY CHAT QISMI
let onlineUsers = {};

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    onlineUsers[userId] = socket.id;
  });

  socket.on('privateMessage', (data) => {
    const { to, from, content, type } = data;
    const toSocket = onlineUsers[to];
    if (toSocket) {
      io.to(toSocket).emit('message', { from, content, type, time: new Date() });
    }
  });

  socket.on('disconnect', () => {
    Object.keys(onlineUsers).forEach((key) => {
      if (onlineUsers[key] === socket.id) delete onlineUsers[key];
    });
  });
});

// Yangi xabar saqlash funksiyasi
function saveMessage(message) {
  const messages = readJSON('data/messages.json');
  messages.push(message);
  writeJSON('data/messages.json', messages);
}

io.on('connection', (socket) => {
  socket.on('register', (userId) => {
    onlineUsers[userId] = socket.id;
  });

  socket.on('privateMessage', (data) => {
    const { to, from, content, type } = data;
    const newMessage = {
      from,
      to,
      content,
      type, // 'text', 'image', 'video', 'file', 'audio'
      time: new Date().toISOString()
    };

    saveMessage(newMessage); // JSON faylga saqlash

    const toSocket = onlineUsers[to];
    if (toSocket) {
      io.to(toSocket).emit('message', newMessage);
    }
  });

  socket.on('disconnect', () => {
    for (let id in onlineUsers) {
      if (onlineUsers[id] === socket.id) {
        delete onlineUsers[id];
        break;
      }
    }
  });
});

app.use('/videos', express.static('videos')); // video fayllar
app.use('/img', express.static('img'));       // avatar fayllar

// API: videolarni o'qish
app.get("/api/videos", (req, res) => {
  const data = fs.readFileSync("./data/videos.json", "utf-8");
  res.json(JSON.parse(data));
});

app.get('/api/videos', (req, res) => {
  fs.readFile(path.join(__dirname, 'data/videos.json'), 'utf8', (err, data) => {
    if (err) {
      return res.status(500).json({ error: 'Cannot read videos' });
    }
    res.json(JSON.parse(data));
  });
});

// API: videoga comment qo‘shish
app.post("/api/videos/:id/comments", (req, res) => {
  const { id } = req.params;
  const { user, text } = req.body;
  const videos = JSON.parse(fs.readFileSync("./data/videos.json", "utf-8"));

  const video = videos.find(v => v.id == id);
  if (!video) return res.status(404).json({ error: "Video topilmadi" });

  video.comments.push({ user, text });
  fs.writeFileSync("./data/videos.json", JSON.stringify(videos, null, 2));
  res.json({ success: true });
});

// API: video like
app.post("/api/videos/:id/like", (req, res) => {
  const { id } = req.params;
  const videos = JSON.parse(fs.readFileSync("./data/videos.json", "utf-8"));
  const video = videos.find(v => v.id == id);
  if (!video) return res.status(404).json({ error: "Video topilmadi" });

  video.likes += 1;
  fs.writeFileSync("./data/videos.json", JSON.stringify(videos, null, 2));
  res.json({ success: true, likes: video.likes });
});

app.use('/videos', express.static(path.join(__dirname, 'uploads')));

// VIDEO DB
const videoFilePath = path.join(__dirname, 'data', 'videos.json');
function readVideos() {
  if (!fs.existsSync(videoFilePath)) return [];
  return JSON.parse(fs.readFileSync(videoFilePath));
}
function saveVideos(videos) {
  fs.writeFileSync(videoFilePath, JSON.stringify(videos, null, 2));
}

// Multer settings (video upload)
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});

const upload = multer({ storage });

// Routes
app.get('/api/videos', (req, res) => {
  const videos = readVideos();
  res.json(videos);
});

app.post('/api/upload', upload.single('video'), (req, res) => {
  const videos = readVideos();
  const newVideo = {
    id: Date.now(),
    src: `/videos/${req.file.filename}`,
    title: req.body.title,
    desc: req.body.desc,
    user: req.body.user || "Noma'lum",
    avatar: "/img/default-avatar.png",
    comments: [],
    likes: 0
  };
  videos.push(newVideo);
  saveVideos(videos);
  res.json({ success: true, video: newVideo });
});

app.post('/api/videos/:id/like', (req, res) => {
  const id = Number(req.params.id);
  const videos = readVideos();
  const video = videos.find(v => v.id === id);
  if (video) {
    video.likes += 1;
    saveVideos(videos);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Video topilmadi" });
  }
});

app.post('/api/videos/:id/comment', (req, res) => {
  const id = Number(req.params.id);
  const { text, user } = req.body;
  const videos = readVideos();
  const video = videos.find(v => v.id === id);
  if (video && text) {
    video.comments.push({ user, text });
    saveVideos(videos);
    res.json({ success: true });
  } else {
    res.status(404).json({ error: "Xatolik yuz berdi" });
  }
});

// JSON parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static fayllar
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/backend/data', express.static(path.join(__dirname, 'data')));

// Video yuklash endpoint
app.post('/api/upload', upload.single('video'), (req, res) => {
  const { title, desc, user, avatar } = req.body;
  const file = req.file;

  if (!file) return res.status(400).json({ error: 'Video file not found.' });

  const newVideo = {
    id: Date.now(),
    title,
    desc,
    user,
    avatar: avatar || '',
    src: `/uploads/${file.filename}`
  };

  const filePath = path.join(__dirname, 'data', 'videos.json');
  const existing = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  existing.push(newVideo);
  fs.writeFileSync(filePath, JSON.stringify(existing, null, 2));

  res.status(201).json({ message: 'Video joylandi', video: newVideo });
});

// Express + multer bilan
app.post("/api/chat/upload", upload.single("file"), (req, res) => {
  const fileUrl = `http://localhost:3000/uploads/${req.file.filename}`;
  res.json({ url: fileUrl });
});

app.use('/api/videos', require('./routes/videos'));

const coinRoutes = require('./routes/coin');
app.use('/api/coin', coinRoutes);

const socialRoutes = require('./routes/social');
app.use('/api/social', socialRoutes);

app.use('/api/posts', require('./routes/posts'))

// ISHGA TUSHIRISH
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
