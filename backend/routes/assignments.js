import express from 'express';
import Assignment from '../models/Assignment.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Public: list active assignments for submission form
router.get('/', async (req, res) => {
  try {
    const assignments = await Assignment.find({ isActive: true }).sort({ college: 1, name: 1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: list all assignments (including inactive)
router.get('/all', adminAuth, async (req, res) => {
  try {
    const assignments = await Assignment.find().sort({ college: 1, name: 1 });
    res.json(assignments);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: create assignment
router.post('/', adminAuth, async (req, res) => {
  try {
    const { name, college, startDate, endDate, remark } = req.body;
    if (!name || !college) {
      return res.status(400).json({ message: 'Name and college are required' });
    }
    if (req.user?.role === 'superAdmin' && !remark?.trim()) {
      return res.status(400).json({ message: 'Remark is required for super admin changes' });
    }
    const existing = await Assignment.findOne({ name, college });
    if (existing) {
      return res.status(400).json({ message: 'Assignment with this name and college already exists' });
    }
    const assignment = new Assignment({ name, college, startDate, endDate, adminRemark: remark?.trim() });
    await assignment.save();
    res.status(201).json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: update assignment
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { name, college, startDate, endDate, isActive, remark } = req.body;
    if (req.user?.role === 'superAdmin' && !remark?.trim()) {
      return res.status(400).json({ message: 'Remark is required for super admin changes' });
    }
    const updateData = { name, college, startDate, endDate, isActive };
    if (remark?.trim()) {
      updateData.adminRemark = remark.trim();
    }
    const assignment = await Assignment.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true }
    );
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    res.json(assignment);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Admin: delete assignment
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { remark } = req.body;
    if (req.user?.role === 'superAdmin' && !remark?.trim()) {
      return res.status(400).json({ message: 'Remark is required for super admin changes' });
    }
    const assignment = await Assignment.findByIdAndDelete(req.params.id);
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    console.log(`SuperAdmin delete remark for assignment ${req.params.id}:`, remark?.trim());
    res.json({ message: 'Assignment deleted successfully', remark: remark?.trim() });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
