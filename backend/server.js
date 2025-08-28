const express = require('express');
const cors = require('cors');
const path = require('path');
const multer = require('multer');
const http = require('http');
const fs = require('fs');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*' }
});

// MongoDB ulash
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/school_platform';

mongoose.connect(MONGODB_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => console.log('✅ MongoDB ga ulandi'))
.catch(err => console.error('❌ MongoDB ulanish xatosi:', err));

// MongoDB Schemalar
const userSchema = new mongoose.Schema({
  name: String,
  surname: String,
  email: { type: String, unique: true },
  password: String,
  role: { type: String, enum: ['student', 'teacher', 'admin', 'bachelor'] },
  school: String,
  bio: String,
  coin: { type: Number, default: 0 },
  avatar: String,
  createdAt: { type: Date, default: Date.now }
});

const lessonSchema = new mongoose.Schema({
  title: String,
  description: String,
  content: String,
  category: String,
  authorId: mongoose.Schema.Types.ObjectId,
  authorName: String,
  likes: [mongoose.Schema.Types.ObjectId],
  comments: [{
    userId: mongoose.Schema.Types.ObjectId,
    text: String,
    date: { type: Date, default: Date.now },
    likes: [mongoose.Schema.Types.ObjectId],
    replies: [{
      userId: mongoose.Schema.Types.ObjectId,
      text: String,
      date: { type: Date, default: Date.now }
    }]
  }],
  date: { type: Date, default: Date.now }
});

const postSchema = new mongoose.Schema({
  authorId: mongoose.Schema.Types.ObjectId,
  authorName: String,
  content: String,
  image: String,
  likes: [mongoose.Schema.Types.ObjectId],
  comments: [{
    userId: mongoose.Schema.Types.ObjectId,
    text: String,
    date: { type: Date, default: Date.now }
  }],
  date: { type: Date, default: Date.now }
});

const videoSchema = new mongoose.Schema({
  title: String,
  description: String,
  src: String,
  uploaderId: mongoose.Schema.Types.ObjectId,
  uploaderName: String,
  avatar: String,
  likes: { type: Number, default: 0 },
  comments: [{
    userId: mongoose.Schema.Types.ObjectId,
    user: String,
    text: String,
    date: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

const messageSchema = new mongoose.Schema({
  from: mongoose.Schema.Types.ObjectId,
  to: mongoose.Schema.Types.ObjectId,
  content: String,
  type: { type: String, enum: ['text', 'image', 'video', 'file', 'audio'] },
  time: { type: Date, default: Date.now }
});

const coinRequestSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  amount: Number,
  status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
  createdAt: { type: Date, default: Date.now }
});

// Modellar
const User = mongoose.model('User', userSchema);
const Lesson = mongoose.model('Lesson', lessonSchema);
const Post = mongoose.model('Post', postSchema);
const Video = mongoose.model('Video', videoSchema);
const Message = mongoose.model('Message', messageSchema);
const CoinRequest = mongoose.model('CoinRequest', coinRequestSchema);

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(express.static(path.join(__dirname, '../frontend')));

// Multer sozlamalari
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = path.join(__dirname, 'uploads');
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB limit
  }
});

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/lessons', require('./routes/lesson'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/users', require('./routes/users'));
app.use('/api/chat', require('./routes/chat'));
app.use('/api/videos', require('./routes/videos'));
app.use('/api/coin', require('./routes/coin'));
app.use('/api/social', require('./routes/social'));
app.use('/api/posts', require('./routes/posts'));

// Static fayllar
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/videos', express.static(path.join(__dirname, 'uploads')));
app.use('/img', express.static(path.join(__dirname, 'img')));

// Test route
app.get('/', (req, res) => {
  res.send('School Website API working ✅');
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    database: mongoose.connection.readyState === 1 ? 'Connected' : 'Disconnected'
  });
});

// Yangi API Endpointlar

// 1. Foydalanuvchilar ro'yxati
app.get('/api/users', async (req, res) => {
  try {
    const users = await User.find({}, { password: 0 });
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2. Foydalanuvchi ma'lumotlarini yangilash
app.put('/api/users/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const user = await User.findByIdAndUpdate(id, updatedData, { new: true });
    if (!user) {
      return res.status(404).json({ error: 'Foydalanuvchi topilmadi' });
    }

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3. Darslar ro'yxati
app.get('/api/lessons', async (req, res) => {
  try {
    const lessons = await Lesson.find().sort({ date: -1 });
    res.json(lessons);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 4. Yangi dars qo'shish
app.post('/api/lessons', async (req, res) => {
  try {
    const newLesson = new Lesson(req.body);
    await newLesson.save();
    res.status(201).json({ success: true, lesson: newLesson });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 5. Darsga like bosish
app.post('/api/lessons/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }

    const likeIndex = lesson.likes.indexOf(userId);
    if (likeIndex === -1) {
      lesson.likes.push(userId);
    } else {
      lesson.likes.splice(likeIndex, 1);
    }

    await lesson.save();
    res.json({ success: true, likes: lesson.likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Darsga comment qo'shish
app.post('/api/lessons/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, text } = req.body;

    const lesson = await Lesson.findById(id);
    if (!lesson) {
      return res.status(404).json({ error: 'Dars topilmadi' });
    }

    lesson.comments.push({ userId, text });
    await lesson.save();

    res.json({ success: true, comments: lesson.comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 7. Videolar ro'yxati
app.get('/api/videos', async (req, res) => {
  try {
    const videos = await Video.find().sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 8. Video yuklash
app.post('/api/upload/video', upload.single('video'), async (req, res) => {
  try {
    const { title, description, uploaderId, uploaderName } = req.body;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Video fayl kerak' });
    }

    const newVideo = new Video({
      title,
      description,
      src: `/uploads/${file.filename}`,
      uploaderId,
      uploaderName,
      avatar: '/img/default-avatar.png'
    });

    await newVideo.save();
    res.status(201).json({ success: true, video: newVideo });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 9. Videoga like bosish
app.post('/api/videos/:id/like', async (req, res) => {
  try {
    const { id } = req.params;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video topilmadi' });
    }

    video.likes += 1;
    await video.save();

    res.json({ success: true, likes: video.likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 10. Videoga comment qo'shish
app.post('/api/videos/:id/comment', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId, user, text } = req.body;

    const video = await Video.findById(id);
    if (!video) {
      return res.status(404).json({ error: 'Video topilmadi' });
    }

    video.comments.push({ userId, user, text });
    await video.save();

    res.json({ success: true, comments: video.comments });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 11. Postlar ro'yxati
app.get('/api/posts', async (req, res) => {
  try {
    const posts = await Post.find().sort({ date: -1 });
    res.json(posts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 12. Yangi post yaratish
app.post('/api/posts', async (req, res) => {
  try {
    const newPost = new Post(req.body);
    await newPost.save();
    res.status(201).json({ success: true, post: newPost });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 13. Postga like bosish
app.post('/api/posts/:id/like', async (req, res) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;

    const post = await Post.findById(id);
    if (!post) {
      return res.status(404).json({ error: 'Post topilmadi' });
    }

    const likeIndex = post.likes.indexOf(userId);
    if (likeIndex === -1) {
      post.likes.push(userId);
    } else {
      post.likes.splice(likeIndex, 1);
    }

    await post.save();
    res.json({ success: true, likes: post.likes });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Coin so'rov yuborish
app.post('/api/coin/request', async (req, res) => {
  try {
    const { userId, amount } = req.body;

    const newRequest = new CoinRequest({
      userId,
      amount
    });

    await newRequest.save();
    res.json({ success: true, request: newRequest });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 15. Coin so'rovlari ro'yxati (admin uchun)
app.get('/api/coin/requests', async (req, res) => {
  try {
    const requests = await CoinRequest.find().populate('userId', 'name email');
    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 16. Coin so'rovini tasdiqlash (admin uchun)
app.put('/api/coin/requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;

    const request = await CoinRequest.findById(id);
    if (!request) {
      return res.status(404).json({ error: 'So\'rov topilmadi' });
    }

    // Userga coin qo'shish
    const user = await User.findById(request.userId);
    user.coin += request.amount;
    await user.save();

    // So'rovni tasdiqlangan deb belgilash
    request.status = 'approved';
    await request.save();

    res.json({ success: true, user });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// SOCKET.IO — Real-time communication
let onlineUsers = {};

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);

  socket.on('register', (userId) => {
    onlineUsers[userId] = socket.id;
    console.log('User registered:', userId);
  });

  socket.on('privateMessage', async (data) => {
    try {
      const { to, from, content, type } = data;
      
      // MongoDBga xabarni saqlash
      const newMessage = new Message({
        from,
        to,
        content,
        type
      });
      
      await newMessage.save();

      // Recipientga yuborish
      const toSocket = onlineUsers[to];
      if (toSocket) {
        io.to(toSocket).emit('message', newMessage);
      }
    } catch (error) {
      console.error('Xabar saqlashda xatolik:', error);
    }
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
    for (let id in onlineUsers) {
      if (onlineUsers[id] === socket.id) {
        delete onlineUsers[id];
        break;
      }
    }
  });
});

// File upload endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Fayl yuklanmadi' });
    }
    
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ 
      success: true, 
      url: fileUrl,
      filename: req.file.filename,
      originalname: req.file.originalname
    });
  } catch (error) {
    res.status(500).json({ error: 'Fayl yuklashda xatolik' });
  }
});

// Server startup
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`✅ Server ${PORT}-portda ishga tushdi`);
  console.log(`✅ API: http://localhost:${PORT}/api`);
  console.log(`✅ Frontend: http://localhost:${PORT}`);
  console.log(`✅ MongoDB: ${mongoose.connection.readyState === 1 ? 'Ulangan' : 'Ulanmagan'}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('Server yopilmoqda...');
  await mongoose.connection.close();
  process.exit(0);
});
