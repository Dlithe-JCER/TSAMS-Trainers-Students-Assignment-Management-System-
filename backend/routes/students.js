import express from 'express';
import Student from '../models/Student.js';

const router = express.Router();

// GET /api/students/lookup?usn=4NM22CS001
router.get('/lookup', async (req, res) => {
  try {
    const { usn } = req.query;
    if (!usn) return res.status(400).json({ message: 'USN required' });

    const student = await Student.findOne({ usn: usn.trim().toUpperCase() });
    if (!student) return res.status(404).json({ message: 'Student not found' });

    res.json({
      name: student.name,
      usn: student.usn,
      college: student.college,
      batchName: student.batch?.name || '',
    });
  } catch (err) {
    console.error('Student lookup error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// GET /api/students
router.get('/', async (req, res) => {
  try {
    const students = await Student.find();
    res.json(students.map((s) => ({
      _id: s.id,
      name: s.name,
      usn: s.usn,
      college: s.college,
      batchName: s.batch?.name || '',
    })));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
