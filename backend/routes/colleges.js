import express from 'express';
import { adminAuth } from '../middleware/auth.js';
import College from '../models/College.js';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';

function isSuperAdmin(user) {
  return user?.email === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';
}

const router = express.Router();

// GET all colleges — any admin can view
router.get('/', adminAuth, async (req, res) => {
  try {
    const colleges = await College.findAll();
    res.json(colleges);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// POST create college — super admin only
router.post('/', adminAuth, async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  try {
    const { name, code, department, location } = req.body;
    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({ message: 'Name and code are required' });
    }
    const existing = await College.findOne({ code: code.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ message: 'College with this code already exists' });
    }
    const college = await College.create({
      name: name.trim(),
      code: code.trim().toUpperCase(),
      department: department?.trim() || null,
      location: location?.trim() || null,
      isActive: true,
    });
    res.status(201).json(college);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// PUT update college — super admin only
router.put('/:id', adminAuth, async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  try {
    const { name, code, department, location, isActive } = req.body;
    const college = await College.findByIdAndUpdate(req.params.id, {
      ...(name !== undefined && { name: name.trim() }),
      ...(code !== undefined && { code: code.trim().toUpperCase() }),
      ...(department !== undefined && { department: department?.trim() || null }),
      ...(location !== undefined && { location: location?.trim() || null }),
      ...(isActive !== undefined && { isActive }),
    });
    if (!college) return res.status(404).json({ message: 'College not found' });
    res.json(college);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE college — super admin only
router.delete('/:id', adminAuth, async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  try {
    const college = await College.findByIdAndDelete(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });
    res.json({ message: 'College deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
