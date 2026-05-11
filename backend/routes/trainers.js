import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { body, validationResult } from 'express-validator';
import Trainer from '../models/Trainer.js';
import Batch from '../models/Batch.js';
import TocDocument from '../models/TocDocument.js';
import { auth, adminAuth } from '../middleware/auth.js';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';
const COLLEGE_EMAIL_MAP = { sdmit: 'SDMIT', mite: 'MITE', nitte: 'Nitte' };

function getAdminCollegeFilter(user) {
  if (!user?.email) return null;
  if (user.email === SUPER_ADMIN_EMAIL || user.role === 'superAdmin') return null;
  const prefix = user.email.split('@')[0].toLowerCase();
  return COLLEGE_EMAIL_MAP[prefix] ?? null;
}

function isSuperAdmin(user) {
  return user?.email === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';
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
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, phone, email, username, password, allottedCollege, allottedProgrammingLanguage, allottedLevel, assignmentName, allottedBatch, topicCoverage, remark } = req.body;
      if (req.user?.role === 'superAdmin' && !remark?.trim()) {
        return res.status(400).json({ message: 'Remark is required for super admin changes' });
      }

      // Check if trainer already exists by phone or username
      let trainer = await Trainer.findOne({ $or: [{ phone }, { username }] });
      if (trainer) {
        return res.status(400).json({ message: 'Trainer with this phone or username already exists' });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      trainer = new Trainer({
        name,
        phone,
        email,
        username,
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
      });

      await trainer.save();

      const payload = {
        id: trainer._id,
        role: trainer.role,
        email: trainer.email,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.status(201).json({
        message: 'Trainer registered successfully',
        token,
        trainer: {
          id: trainer._id,
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
      if (!value && !req.body.email && !req.body.phone) {
        throw new Error('Username, email, or phone is required');
      }
      return true;
    }),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { username, email, phone, password } = req.body;
      const searchConditions = [];
      if (username) searchConditions.push({ username });
      if (email) searchConditions.push({ email });
      if (phone) searchConditions.push({ phone });

      const trainer = await Trainer.findOne({ $or: searchConditions });
      if (!trainer) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const isMatch = await bcrypt.compare(password, trainer.password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid credentials' });
      }

      const payload = {
        id: trainer._id,
        role: trainer.role,
        email: trainer.email,
      };

      const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '7d' });

      res.json({
        message: 'Login successful',
        token,
        trainer: {
          id: trainer._id,
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

// Get all trainers for submission form (public - no auth required)
// Supports ?assignmentName= to filter by assigned assignment
router.get('/public', async (req, res) => {
  try {
    const { assignmentName } = req.query;
    const query = { role: 'trainer' };
    if (assignmentName) query.assignmentName = assignmentName;
    const trainers = await Trainer.find(query)
      .select('name allottedCollege college assignmentName allottedBatch')
      .populate('allottedBatch', 'name college')
      .sort({ allottedCollege: 1, name: 1 });
    res.json(trainers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all trainers (admin only — excludes admin accounts, scoped by college)
router.get('/', adminAuth, async (req, res) => {
  try {
    const collegeFilter = getAdminCollegeFilter(req.user);
    const query = { role: 'trainer' };
    if (collegeFilter) query.$or = [{ allottedCollege: collegeFilter }, { college: collegeFilter }];
    const trainers = await Trainer.find(query).select('-password').sort({ allottedCollege: 1, name: 1 });
    res.json(trainers);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Public: static college list
router.get('/colleges/all', (req, res) => {
  res.json(['Nitte', 'MITE', 'SDMIT']);
});

// Public: distinct assignment names from TOC documents
router.get('/assignment-names/all', async (req, res) => {
  try {
    const { college } = req.query;
    const query = college ? { college, assignmentName: { $exists: true, $nin: [null, ''] } }
                          : { assignmentName: { $exists: true, $nin: [null, ''] } };
    const names = await TocDocument.distinct('assignmentName', query);
    res.json(names.filter(Boolean).sort());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// BATCH ROUTES (must come before /:id wildcard routes)
// ────────────────────────────────────────────────────────────────────────────

// Public: active batches for submission form dropdown
router.get('/batches/all', async (req, res) => {
  try {
    const { college } = req.query;
    const query = college ? { college, status: 'active' } : { status: 'active' };
    const batches = await Batch.find(query).select('name college status type').sort({ college: 1, name: 1 });
    res.json(batches);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: list batches accessible to the logged-in admin
router.get('/batches', adminAuth, async (req, res) => {
  try {
    const collegeFilter = getAdminCollegeFilter(req.user);
    const baseQuery = collegeFilter ? { college: collegeFilter } : {};
    const batches = await Batch.find(baseQuery)
      .select('name assignmentName college status type startDate endDate')
      .sort({ college: 1, name: 1 });
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
    if (existing) {
      return res.status(400).json({ message: 'Batch with this name and college already exists' });
    }

    const batch = new Batch({
      name: name.trim(),
      assignmentName: assignmentName.trim(),
      college: college.trim(),
      status: status || 'active',
      type: type || 'technical',
      startDate: startDate || undefined,
      endDate: endDate || undefined,
    });

    await batch.save();
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
    if (startDate !== undefined) updateData.startDate = startDate || undefined;
    if (endDate !== undefined) updateData.endDate = endDate || undefined;

    const batch = await Batch.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

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
    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    res.json({ message: 'Batch deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ────────────────────────────────────────────────────────────────────────────
// TRAINER ROUTES (/:id routes must come AFTER /batches routes)
// ────────────────────────────────────────────────────────────────────────────

// Get trainer profile for authenticated user
router.get('/me', auth, async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.trainerId).select('-password');
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }
    res.json(trainer);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get trainer by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.id).select('-password');
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }
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
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { name, phone, email, username, password, allottedCollege, allottedProgrammingLanguage, allottedLevel, assignmentName, allottedBatch, topicCoverage, remark } = req.body;
      if (req.user?.role === 'superAdmin' && !remark?.trim()) {
        return res.status(400).json({ message: 'Remark is required for super admin changes' });
      }

      let trainer = await Trainer.findById(req.params.id);
      if (!trainer) {
        return res.status(404).json({ message: 'Trainer not found' });
      }

      if (phone && phone !== trainer.phone) {
        const phoneExists = await Trainer.findOne({ phone });
        if (phoneExists) {
          return res.status(400).json({ message: 'Phone already in use' });
        }
      }

      if (username && username !== trainer.username) {
        const usernameExists = await Trainer.findOne({ username });
        if (usernameExists) {
          return res.status(400).json({ message: 'Username already in use' });
        }
      }

      if (name) trainer.name = name;
      if (phone) trainer.phone = phone;
      if (email) trainer.email = email;
      if (username) trainer.username = username;
      if (password) {
        trainer.password = await bcrypt.hash(password, 10);
      }
      if (allottedCollege) {
        trainer.allottedCollege = allottedCollege;
        trainer.college = allottedCollege;
      }
      if (allottedProgrammingLanguage) {
        trainer.allottedProgrammingLanguage = allottedProgrammingLanguage;
      }
      if (allottedLevel) {
        trainer.allottedLevel = allottedLevel;
      }
      if (assignmentName) {
        trainer.assignmentName = assignmentName;
      }
      if (allottedBatch) {
        trainer.allottedBatch = allottedBatch;
      }
      if (topicCoverage) {
        trainer.topicCoverage = topicCoverage;
      }
      if (remark) {
        trainer.adminRemark = remark.trim();
      }

      await trainer.save();
      res.json({
        message: 'Trainer updated successfully',
        trainer,
      });
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
    if (!trainer) {
      return res.status(404).json({ message: 'Trainer not found' });
    }
    console.log(`SuperAdmin delete remark for trainer ${req.params.id}:`, remark?.trim());
    res.json({ message: 'Trainer deleted successfully', remark: remark?.trim() });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
