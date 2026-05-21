import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Trainer from '../models/Trainer.js';
import Batch from '../models/Batch.js';
import TocDocument from '../models/TocDocument.js';
import College from '../models/College.js';
import { auth, adminAuth } from '../middleware/auth.js';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';

function isSuperAdmin(user) {
  return user?.email === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';
}

function getAdminCollegeFilter(user) {
  if (isSuperAdmin(user)) return null;
  // allottedCollege is stored in JWT for admin accounts
  return user?.allottedCollege ?? null;
}

const router = express.Router();

// Register a new trainer (admin only)
router.post(
  '/register',
  adminAuth,
  [
    body('name').notEmpty().withMessage('Name is required'),
    body('phone').notEmpty().withMessage('Phone is required'),
    body('username').notEmpty().withMessage('Username is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
    body('allottedCollege').notEmpty().withMessage('Allotted college is required'),
    body('allottedProgrammingLanguage').notEmpty().withMessage('Programming language is required'),
    body('allottedLevel').notEmpty().withMessage('Level is required'),
    body('assignmentName').notEmpty().withMessage('Assignment name is required'),
    body('allottedBatch').notEmpty().withMessage('Batch is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, phone, email, username, password, allottedCollege, allottedProgrammingLanguage, allottedLevel, assignmentName, allottedBatch, topicCoverage, remark, assignedTocId } = req.body;

      const existing = await Trainer.findOne({ $or: [{ phone }, { username }] });
      if (existing) {
        return res.status(400).json({ message: 'Trainer with this phone or username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const trainer = await Trainer.create({
        name, phone, email, username,
        password: hashedPassword,
        allottedCollege,
        allottedProgrammingLanguage,
        allottedLevel,
        assignmentName,
        allottedBatch,
        topicCoverage,
        college: allottedCollege,
        verified: true,
        role: 'trainer',
        adminRemark: remark?.trim(),
        assignedTocId: assignedTocId || null,
      });

      const token = jwt.sign(
        { id: trainer.id, role: trainer.role, email: trainer.email, allottedCollege: trainer.allottedCollege ?? null },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.status(201).json({
        message: 'Trainer registered successfully',
        token,
        trainer: {
          id: trainer.id,
          name: trainer.name,
          phone: trainer.phone,
          username: trainer.username,
          role: trainer.role,
          allottedCollege: trainer.allottedCollege,
          allottedProgrammingLanguage: trainer.allottedProgrammingLanguage,
          allottedLevel: trainer.allottedLevel,
          assignmentName: trainer.assignmentName,
          allottedBatch: trainer.allottedBatch,
          topicCoverage: trainer.topicCoverage,
          ...(trainer.email ? { email: trainer.email } : {}),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Login trainer
router.post(
  '/login',
  [
    body('password').notEmpty().withMessage('Password is required'),
    body('username').custom((value, { req }) => {
      if (!value && !req.body.email && !req.body.phone) throw new Error('Username, email, or phone is required');
      return true;
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { username, email, phone, password } = req.body;
      const orConditions = [];
      if (username) orConditions.push({ username });
      if (email) orConditions.push({ email });
      if (phone) orConditions.push({ phone });

      const trainer = await Trainer.findOne({ $or: orConditions });
      if (!trainer) return res.status(400).json({ message: 'Invalid credentials' });

      const isMatch = await bcrypt.compare(password, trainer.password);
      if (!isMatch) return res.status(400).json({ message: 'Invalid credentials' });

      const token = jwt.sign(
        { id: trainer.id, role: trainer.role, email: trainer.email, allottedCollege: trainer.allottedCollege ?? null },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );

      res.json({
        message: 'Login successful',
        token,
        trainer: {
          id: trainer.id,
          name: trainer.name,
          phone: trainer.phone,
          username: trainer.username,
          role: trainer.role,
          allottedCollege: trainer.allottedCollege,
          allottedProgrammingLanguage: trainer.allottedProgrammingLanguage,
          allottedLevel: trainer.allottedLevel,
          assignmentName: trainer.assignmentName,
          allottedBatch: trainer.allottedBatch,
          topicCoverage: trainer.topicCoverage,
          ...(trainer.email ? { email: trainer.email } : {}),
        },
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Get all trainers for submission form (public)
router.get('/public', async (req, res) => {
  try {
    const { assignmentName } = req.query;
    const conditions = { role: 'trainer' };
    if (assignmentName) conditions.assignmentName = assignmentName;
    const trainers = await Trainer.find(conditions, { withBatch: true });
    res.json(trainers.map(t => ({
      _id: t.id, id: t.id,
      name: t.name,
      allottedCollege: t.allottedCollege,
      college: t.college,
      assignmentName: t.assignmentName,
      allottedBatch: t.allottedBatch,
    })));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all trainers (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const collegeFilter = getAdminCollegeFilter(req.user);
    const conditions = { role: 'trainer' };
    if (collegeFilter) conditions.$or = [{ allottedCollege: collegeFilter }, { college: collegeFilter }];
    const trainers = await Trainer.find(conditions, { excludePassword: true });
    res.json(trainers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public: college list from DB
router.get('/colleges/all', async (req, res) => {
  try {
    const colleges = await College.findAll();
    res.json(colleges.map(c => c.code));
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public: distinct assignment names from TOC documents
router.get('/assignment-names/all', async (req, res) => {
  try {
    const { college } = req.query;
    const conditions = {};
    if (college) conditions.college = college;
    const names = await TocDocument.distinct('assignmentName', conditions);
    res.json(names);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── BATCH ROUTES ─────────────────────────────────────────────────────────────

// Public: active batches for submission form
router.get('/batches/all', async (req, res) => {
  try {
    const { college } = req.query;
    const conditions = { status: 'active' };
    if (college) conditions.college = college;
    const batches = await Batch.find(conditions);
    res.json(batches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: list batches
router.get('/batches', adminAuth, async (req, res) => {
  try {
    const collegeFilter = getAdminCollegeFilter(req.user);
    const conditions = {};
    if (collegeFilter) conditions.college = collegeFilter;
    const batches = await Batch.find(conditions);
    res.json(batches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: create batch (super admin only)
router.post('/batches', adminAuth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only super admin can create batches' });
    }
    const { name, assignmentName, college, status, type, startDate, endDate } = req.body;
    if (!name?.trim() || !assignmentName?.trim() || !college?.trim()) {
      return res.status(400).json({ message: 'Batch name, assignment name, and college are required' });
    }
    const existing = await Batch.findOne({ name: name.trim(), college: college.trim() });
    if (existing) return res.status(400).json({ message: 'Batch with this name and college already exists' });

    const batch = await Batch.create({ name: name.trim(), assignmentName: assignmentName.trim(), college: college.trim(), status, type, startDate, endDate });
    res.status(201).json(batch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: update batch (super admin only)
router.put('/batches/:id', adminAuth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only super admin can update batches' });
    }
    const { name, assignmentName, college, status, type, startDate, endDate } = req.body;
    const updateData = {};
    if (name !== undefined) updateData.name = name.trim();
    if (assignmentName !== undefined) updateData.assignmentName = assignmentName.trim();
    if (college !== undefined) updateData.college = college.trim();
    if (status !== undefined) updateData.status = status;
    if (type !== undefined) updateData.type = type;
    if (startDate !== undefined) updateData.startDate = startDate || null;
    if (endDate !== undefined) updateData.endDate = endDate || null;

    const batch = await Batch.findByIdAndUpdate(req.params.id, updateData);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json(batch);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: delete batch (super admin only)
router.delete('/batches/:id', adminAuth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only super admin can delete batches' });
    }
    const batch = await Batch.findByIdAndDelete(req.params.id);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ── TRAINER ROUTES ────────────────────────────────────────────────────────────

// Get trainer profile for authenticated user
router.get('/me', auth, async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainerId, { excludePassword: true });
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
    res.json(trainer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get trainer by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id, { excludePassword: true });
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
    res.json(trainer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update trainer profile (admin only)
router.put(
  '/:id',
  adminAuth,
  [
    body('name').optional().notEmpty().withMessage('Name cannot be empty'),
    body('email').optional().isEmail().withMessage('Invalid email address'),
    body('phone').optional().notEmpty().withMessage('Phone cannot be empty'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { name, phone, email, username, password, allottedCollege, allottedProgrammingLanguage, allottedLevel, assignmentName, allottedBatch, topicCoverage, remark, assignedTocId } = req.body;

      const existing = await Trainer.findById(req.params.id);
      if (!existing) return res.status(404).json({ message: 'Trainer not found' });

      if (phone && phone !== existing.phone) {
        const phoneExists = await Trainer.findOne({ phone });
        if (phoneExists) return res.status(400).json({ message: 'Phone already in use' });
      }
      if (username && username !== existing.username) {
        const usernameExists = await Trainer.findOne({ username });
        if (usernameExists) return res.status(400).json({ message: 'Username already in use' });
      }

      const updates = {};
      if (name) updates.name = name;
      if (phone) updates.phone = phone;
      if (email) updates.email = email;
      if (username) updates.username = username;
      if (password) updates.password = await bcrypt.hash(password, 10);
      if (allottedCollege) { updates.allottedCollege = allottedCollege; updates.college = allottedCollege; }
      if (allottedProgrammingLanguage) updates.allottedProgrammingLanguage = allottedProgrammingLanguage;
      if (allottedLevel) updates.allottedLevel = allottedLevel;
      if (assignmentName) updates.assignmentName = assignmentName;
      if (allottedBatch) updates.allottedBatch = allottedBatch;
      if (topicCoverage) updates.topicCoverage = topicCoverage;
      if (remark) updates.adminRemark = remark.trim();
      if (assignedTocId !== undefined) updates.assignedTocId = assignedTocId || null;

      const trainer = await Trainer.findByIdAndUpdate(req.params.id, updates);
      res.json({ message: 'Trainer updated successfully', trainer });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Delete trainer (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { remark } = req.body;
    if (req.user?.role === 'superAdmin' && !remark?.trim()) {
      return res.status(400).json({ message: 'Remark is required for super admin changes' });
    }
    const trainer = await Trainer.findByIdAndDelete(req.params.id);
    if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
    console.log(`SuperAdmin delete remark for trainer ${req.params.id}:`, remark?.trim());
    res.json({ message: 'Trainer deleted successfully', remark: remark?.trim() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
