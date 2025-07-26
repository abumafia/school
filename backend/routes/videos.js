const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const videosPath = path.join(__dirname, '../data/videos.json');

router.get('/', (req, res) => {
  const data = fs.existsSync(videosPath) ? JSON.parse(fs.readFileSync(videosPath)) : [];
  res.json(data);
});

module.exports = router;
