const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const lessonsPath = path.join(__dirname, '../data/lessons.json');

function readLessons() {
  return fs.existsSync(lessonsPath) ? JSON.parse(fs.readFileSync(lessonsPath)) : [];
}

function saveLessons(data) {
  fs.writeFileSync(lessonsPath, JSON.stringify(data, null, 2));
}

// ⬇ Dars qo‘shish
router.post('/', (req, res) => {
  const lessons = readLessons();
  const newLesson = {
    id: Date.now().toString(),
    title: req.body.title,
    description: req.body.description,
    content: req.body.content,
    category: req.body.category || "",
    teacherId: req.body.teacherId,
    likes: [],
    comments: []
  };
  lessons.push(newLesson);
  saveLessons(lessons);
  res.json({ success: true, lesson: newLesson });
});

// ⬇ Barcha darslarni olish
router.get('/', (req, res) => {
  res.json(readLessons());
});

// ⬇ Like qilish / bekor qilish
router.post('/:id/like', (req, res) => {
  const lessons = readLessons();
  const lesson = lessons.find(l => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ success: false });

  const { userId } = req.body;
  if (lesson.likes.includes(userId)) {
    lesson.likes = lesson.likes.filter(id => id !== userId);
  } else {
    lesson.likes.push(userId);
  }
  saveLessons(lessons);
  res.json({ success: true });
});

// ⬇ Izoh qo‘shish
router.post('/:id/comment', (req, res) => {
  const lessons = readLessons();
  const lesson = lessons.find(l => l.id === req.params.id);
  if (!lesson) return res.status(404).json({ success: false });

  lesson.comments.push({ userId: req.body.userId, text: req.body.text, date: new Date() });
  saveLessons(lessons);
  res.json({ success: true });
});

// ⬇ Kommentga like berish
router.post('/:lessonId/comment-like', (req, res) => {
  const lessons = readLessons();
  const lesson = lessons.find(l => l.id === req.params.lessonId);
  if (!lesson) return res.status(404).json({ success: false, message: "Lesson topilmadi" });

  const { userId, commentIndex } = req.body;
  const comment = lesson.comments[commentIndex];
  if (!comment) return res.status(404).json({ success: false, message: "Comment topilmadi" });

  comment.likes = comment.likes || [];
  if (comment.likes.includes(userId)) {
    comment.likes = comment.likes.filter(id => id !== userId);
  } else {
    comment.likes.push(userId);
  }

  saveLessons(lessons);
  res.json({ success: true });
});

// ⬇ Kommentga reply berish
router.post('/:lessonId/reply', (req, res) => {
  const lessons = readLessons();
  const lesson = lessons.find(l => l.id === req.params.lessonId);
  if (!lesson) return res.status(404).json({ success: false, message: "Lesson topilmadi" });

  const { userId, commentIndex, text } = req.body;
  const comment = lesson.comments[commentIndex];
  if (!comment) return res.status(404).json({ success: false, message: "Comment topilmadi" });

  comment.replies = comment.replies || [];
  comment.replies.push({ userId, text, date: new Date() });

  saveLessons(lessons);
  res.json({ success: true });
});

// ⬇ PUT: darsni yangilash
router.put('/:id', (req, res) => {
  const lessons = readLessons();
  const index = lessons.findIndex(l => l.id === req.params.id);

  if (index === -1) return res.json({ success: false, message: "Dars topilmadi" });

  lessons[index] = {
    ...lessons[index],
    ...req.body,
    id: lessons[index].id,
    likes: lessons[index].likes || [],
    comments: lessons[index].comments || []
  };

  saveLessons(lessons);
  res.json({ success: true });
});

module.exports = router;
