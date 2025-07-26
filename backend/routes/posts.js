const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const postsPath = path.join(__dirname, '../data/posts.json');

// GET /api/posts
router.get('/', (req, res) => {
  const posts = fs.existsSync(postsPath) ? JSON.parse(fs.readFileSync(postsPath)) : [];
  res.json(posts);
});

// POST /api/posts
router.post('/', (req, res) => {
  const posts = fs.existsSync(postsPath) ? JSON.parse(fs.readFileSync(postsPath)) : [];
  const newPost = req.body;
  posts.unshift(newPost);
  fs.writeFileSync(postsPath, JSON.stringify(posts, null, 2));
  res.status(201).json({ success: true });
});

module.exports = router;
