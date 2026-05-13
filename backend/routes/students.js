import express from 'express';
import Student from '../models/Student.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

function toPayload(s) {
  return {
    _id: s._id,
    name: s.name,
    usn: s.usn,
    college: s.college,
    sec: s.sec,
    sem: s.sem,
    branch: s.branch,
    email: s.email,
    cleanKey: s.cleanKey,
    registrationStatus: s.registrationStatus,
    personalEmailId: s.personalEmailId,
    contactNumber: s.contactNumber,
    formProgrammingLanguage: s.formProgrammingLanguage,
    toolProgrammingLanguage: s.toolProgrammingLanguage,
    questionTitle: s.questionTitle,
    assessmentStatus: s.assessmentStatus,
    assignedBatch: s.assignedBatch,
    createdAt: s.createdAt,
  };
}

function fromBody(body) {
  return {
    name: body.name?.trim(),
    usn: body.usn?.trim().toUpperCase(),
    college: body.college?.trim() || '',
    sec: body.sec?.trim() || null,
    sem: body.sem?.trim() || null,
    branch: body.branch?.trim() || null,
    email: body.email?.trim() || null,
    cleanKey: body.cleanKey?.trim() || null,
    registrationStatus: body.registrationStatus?.trim() || null,
    personalEmailId: body.personalEmailId?.trim() || null,
    contactNumber: body.contactNumber?.trim() || null,
    formProgrammingLanguage: body.formProgrammingLanguage?.trim() || null,
    toolProgrammingLanguage: body.toolProgrammingLanguage?.trim() || null,
    questionTitle: body.questionTitle?.trim() || null,
    assessmentStatus: body.assessmentStatus?.trim() || null,
    assignedBatch: body.assignedBatch?.trim() || null,
  };
}

// GET /api/students/lookup?usn=4NM22CS001  (used by attendance system)
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
      batchName: student.assignedBatch || '',
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
    res.json(students.map(toPayload));
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// POST /api/students
router.post('/', adminAuth, async (req, res) => {
  try {
    const data = fromBody(req.body);
    if (!data.name || !data.usn) {
      return res.status(400).json({ message: 'Name and USN are required' });
    }
    const existing = await Student.findOne({ usn: data.usn });
    if (existing) return res.status(409).json({ message: 'USN already exists' });
    const student = await Student.create(data);
    res.status(201).json(toPayload(student));
  } catch (err) {
    console.error('Create student error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// PUT /api/students/:id
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const data = fromBody(req.body);
    if (!data.name || !data.usn) {
      return res.status(400).json({ message: 'Name and USN are required' });
    }
    const student = await Student.update(req.params.id, data);
    if (!student) return res.status(404).json({ message: 'Student not found' });
    res.json(toPayload(student));
  } catch (err) {
    console.error('Update student error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

// DELETE /api/students/:id
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    await Student.delete(req.params.id);
    res.json({ message: 'Student deleted' });
  } catch (err) {
    console.error('Delete student error:', err);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;
