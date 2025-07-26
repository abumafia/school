const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const postsPath = path.join(__dirname, '../data/posts.json');

function readPosts() {
  return fs.existsSync(postsPath) ? JSON.parse(fs.readFileSync(postsPath)) : [];
}

function savePosts(data) {
  fs.writeFileSync(postsPath, JSON.stringify(data, null, 2));
}

// Yangi post qo‘shish
router.post('/', (req, res) => {
  const posts = readPosts();
  const { userId, title, content, hashtags = [] } = req.body;

  const newPost = {
    id: Date.now().toString(),
    userId,
    title,
    content,
    hashtags, // ["#math", "#school"]
    likes: [],
    comments: [],
    date: new Date()
  };

  posts.push(newPost);
  savePosts(posts);
  res.json({ success: true, post: newPost });
});

// Barcha postlarni olish
router.get('/', (req, res) => {
  res.json(readPosts());
});

// Foydalanuvchining barcha postlari
router.get('/user/:userId', (req, res) => {
  const posts = readPosts().filter(p => p.userId === req.params.userId);
  res.json(posts);
});

// Postga like bosish
router.post('/:postId/like', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.postId);
  if (!post) return res.status(404).json({ success: false });

  const { userId } = req.body;

  if (post.likes.includes(userId)) {
    post.likes = post.likes.filter(id => id !== userId);
  } else {
    post.likes.push(userId);
  }

  savePosts(posts);
  res.json({ success: true });
});

// Komment qo‘shish
router.post('/:postId/comment', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.postId);
  if (!post) return res.status(404).json({ success: false });

  const comment = {
    id: Date.now().toString(), // ← Qo‘shilsin!
    userId: req.body.userId,
    text: req.body.text,
    date: new Date(),
    likes: [],
    replies: []
  };

  post.comments.push(comment);
  savePosts(posts);
  res.json({ success: true });
});

// Kommentga like
router.post('/:postId/comment-like', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.postId);
  if (!post) return res.status(404).json({ success: false });

  const { commentIndex, userId } = req.body;
  const comment = post.comments[commentIndex];
  if (!comment) return res.status(400).json({ success: false });

  if (comment.likes.includes(userId)) {
    comment.likes = comment.likes.filter(id => id !== userId);
  } else {
    comment.likes.push(userId);
  }

  savePosts(posts);
  res.json({ success: true });
});

// Kommentga reply
router.post('/:postId/reply', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.postId);
  if (!post) return res.status(404).json({ success: false });

  const { commentIndex, userId, text } = req.body;
  const comment = post.comments[commentIndex];
  if (!comment) return res.status(400).json({ success: false });

  comment.replies.push({
    userId,
    text,
    date: new Date()
  });

  savePosts(posts);
  res.json({ success: true });
});

// Hashtag bo‘yicha qidiruv
router.get('/search', (req, res) => {
  const { q } = req.query;
  const posts = readPosts();
  const filtered = posts.filter(p =>
    p.title.toLowerCase().includes(q.toLowerCase()) ||
    p.hashtags.some(tag => tag.toLowerCase().includes(q.toLowerCase()))
  );
  res.json(filtered);
});

// Kommentga reply (YANGI TO‘G‘RI YO‘L)
router.post('/:postId/comment/:commentId/reply', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.postId);
  if (!post) return res.status(404).json({ success: false });

  const { userId, text } = req.body;
  const commentId = req.params.commentId;

  // ID o‘rniga index ishlatmaymiz: commentlarga unique ID kerak
  const comment = post.comments.find(c => c.id === commentId);
  if (!comment) return res.status(404).json({ success: false });

  comment.replies.push({
    userId,
    text,
    date: new Date()
  });

  savePosts(posts);
  res.json({ success: true });
});

// Kommentga reply
router.post('/:postId/comment/:commentId/reply', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.postId);
  if (!post) return res.status(404).json({ success: false });

  const comment = post.comments.find(c => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ success: false });

  const { userId, text } = req.body;

  comment.replies.push({
    userId,
    text,
    date: new Date()
  });

  savePosts(posts);
  res.json({ success: true });
});

// Kommentga like
router.post('/:postId/comment/:commentId/like', (req, res) => {
  const posts = readPosts();
  const post = posts.find(p => p.id === req.params.postId);
  if (!post) return res.status(404).json({ success: false });

  const comment = post.comments.find(c => c.id === req.params.commentId);
  if (!comment) return res.status(404).json({ success: false });

  const { userId } = req.body;

  if (comment.likes.includes(userId)) {
    comment.likes = comment.likes.filter(id => id !== userId);
  } else {
    comment.likes.push(userId);
  }

  savePosts(posts);
  res.json({ success: true });
});

module.exports = router;
