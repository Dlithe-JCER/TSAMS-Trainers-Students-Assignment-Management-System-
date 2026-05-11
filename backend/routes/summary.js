import express from 'express';
import Batch from '../models/Batch.js';
import Trainer from '../models/Trainer.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

const ALL_COLLEGES = ['Nitte', 'MITE', 'SDMIT'];
const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';
const COLLEGE_EMAIL_MAP = { sdmit: 'SDMIT', mite: 'MITE', nitte: 'Nitte' };

function getAdminColleges(user) {
  if (!user?.email) return ALL_COLLEGES;
  if (user.email === SUPER_ADMIN_EMAIL || user.role === 'superAdmin') return ALL_COLLEGES;
  const prefix = user.email.split('@')[0].toLowerCase();
  const college = COLLEGE_EMAIL_MAP[prefix];
  return college ? [college] : ALL_COLLEGES;
}

router.get('/', adminAuth, async (req, res) => {
  try {
    const colleges = getAdminColleges(req.user);
    const summaries = {};

    for (const college of colleges) {
      const activeBatches = await Batch.countDocuments({ college, status: 'active' });
      const technicalBatches = await Batch.countDocuments({ college, status: 'active', type: 'technical' });
      const nonTechnicalBatches = await Batch.countDocuments({ college, status: 'active', type: 'non-technical' });
      const trainers = await Trainer.countDocuments({ college });
      summaries[college] = { activeBatches, technicalBatches, nonTechnicalBatches, trainers };
    }

    res.json({ summaries });
  } catch (error) {
    console.error('Failed to fetch summary data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
