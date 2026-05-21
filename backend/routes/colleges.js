import express from 'express';
import bcrypt from 'bcryptjs';
import { adminAuth } from '../middleware/auth.js';
import College from '../models/College.js';
import Trainer from '../models/Trainer.js';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';
const DEFAULT_ADMIN_PASSWORD = 'dlithe2026';

function isSuperAdmin(user) {
  return user?.email === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';
}

function adminEmailForCode(code) {
  return `${code.toLowerCase()}@dlithe.com`;
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

// POST create college — super admin only; auto-creates admin account
router.post('/', adminAuth, async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  try {
    const { name, code, department, location } = req.body;
    if (!name?.trim() || !code?.trim()) {
      return res.status(400).json({ message: 'Name and code are required' });
    }
    const upperCode = code.trim().toUpperCase();

    const existing = await College.findOne({ code: upperCode });
    if (existing) {
      return res.status(400).json({ message: 'College with this code already exists' });
    }

    const college = await College.create({
      name: name.trim(),
      code: upperCode,
      department: department?.trim() || null,
      location: location?.trim() || null,
      isActive: true,
    });

    // Auto-create admin account for this college
    const adminEmail = adminEmailForCode(upperCode);
    const existingAdmin = await Trainer.findOne({ email: adminEmail });
    if (!existingAdmin) {
      const hashedPw = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);
      await Trainer.create({
        name: `${name.trim()} Admin`,
        email: adminEmail,
        phone: `admin-${upperCode.toLowerCase()}`,
        role: 'admin',
        allottedCollege: upperCode,
        password: hashedPw,
        verified: true,
      });
    }

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

// POST create/reset admin account for existing college — super admin only
router.post('/:id/reset-admin', adminAuth, async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });

    const adminEmail = adminEmailForCode(college.code);
    const hashedPw = await bcrypt.hash(DEFAULT_ADMIN_PASSWORD, 10);

    const existing = await Trainer.findOne({ email: adminEmail });
    if (existing) {
      await Trainer.findByIdAndUpdate(existing._id, { password: hashedPw, role: 'admin', allottedCollege: college.code, verified: true });
    } else {
      await Trainer.create({
        name: `${college.name} Admin`,
        email: adminEmail,
        phone: `admin-${college.code.toLowerCase()}`,
        role: 'admin',
        allottedCollege: college.code,
        password: hashedPw,
        verified: true,
      });
    }

    res.json({ message: 'Admin account ready', email: adminEmail });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// DELETE college — super admin only; removes admin account too
router.delete('/:id', adminAuth, async (req, res) => {
  if (!isSuperAdmin(req.user)) {
    return res.status(403).json({ message: 'Super admin access required' });
  }
  try {
    const college = await College.findById(req.params.id);
    if (!college) return res.status(404).json({ message: 'College not found' });

    // Remove corresponding admin account
    const adminEmail = adminEmailForCode(college.code);
    const adminTrainer = await Trainer.findOne({ email: adminEmail });
    if (adminTrainer) await Trainer.findByIdAndDelete(adminTrainer._id);

    await College.findByIdAndDelete(req.params.id);
    res.json({ message: 'College deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
