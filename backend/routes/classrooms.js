import express from 'express';
import Classroom from '../models/Classroom.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all classrooms (public - for trainer selection)
router.get('/', async (req, res) => {
  try {
    const classrooms = await Classroom.find({ status: 'available' }).select('name college');
    res.json(classrooms.map(c => `${c.name} (${c.college})`));
  } catch (error) {
    console.error('Failed to fetch classrooms:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all classrooms for admin (with full details)
router.get('/admin', adminAuth, async (req, res) => {
  try {
    const classrooms = await Classroom.find()
      .populate('batch', 'name college')
      .sort({ college: 1, assignmentName: 1, name: 1 });
    res.json(classrooms);
  } catch (error) {
    console.error('Failed to fetch classrooms:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create classroom (admin only)
router.post('/', adminAuth, async (req, res) => {
  try {
    const { college, assignmentName, name, batch, status, capacity, description, startDate, endDate, remark } = req.body;

    if (!name || !college) {
      return res.status(400).json({ message: 'Classroom number and college are required' });
    }
    if (req.user?.role === 'superAdmin' && !remark?.trim()) {
      return res.status(400).json({ message: 'Remark is required for super admin changes' });
    }

    const classroom = await Classroom.create({
      college,
      assignmentName,
      name,
      batch: batch || undefined,
      status: status || 'available',
      capacity: capacity || 30,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      description,
      adminRemark: remark?.trim(),
    });

    const populated = await classroom.populate('batch', 'name college');
    res.status(201).json({ message: 'Classroom created', classroom: populated });
  } catch (error) {
    console.error('Failed to create classroom:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update classroom (admin only)
router.put('/:id', adminAuth, async (req, res) => {
  try {
    const { college, assignmentName, name, batch, status, capacity, description, startDate, endDate, remark } = req.body;
    if (req.user?.role === 'superAdmin' && !remark?.trim()) {
      return res.status(400).json({ message: 'Remark is required for super admin changes' });
    }

    const updateData = {
      college,
      assignmentName,
      name,
      batch: batch || undefined,
      status,
      capacity,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      description,
    };
    if (remark?.trim()) {
      updateData.adminRemark = remark.trim();
    }

    const classroom = await Classroom.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate('batch', 'name college');

    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }

    res.json({ message: 'Classroom updated', classroom });
  } catch (error) {
    console.error('Failed to update classroom:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete classroom (admin only)
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { remark } = req.body;
    if (req.user?.role === 'superAdmin' && !remark?.trim()) {
      return res.status(400).json({ message: 'Remark is required for super admin changes' });
    }

    const classroom = await Classroom.findByIdAndDelete(req.params.id);
    if (!classroom) {
      return res.status(404).json({ message: 'Classroom not found' });
    }
    console.log(`SuperAdmin delete remark for classroom ${req.params.id}:`, remark?.trim());
    res.json({ message: 'Classroom deleted', remark: remark?.trim() });
  } catch (error) {
    console.error('Failed to delete classroom:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
