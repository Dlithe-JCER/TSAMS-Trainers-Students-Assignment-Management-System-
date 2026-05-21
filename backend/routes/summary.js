import express from 'express';
import Batch from '../models/Batch.js';
import Trainer from '../models/Trainer.js';
import College from '../models/College.js';
import { adminAuth } from '../middleware/auth.js';

const router = express.Router();

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';

function isSuperAdmin(user) {
  return user?.email === SUPER_ADMIN_EMAIL || user?.role === 'superAdmin';
}

function normalizeBatchType(type) {
  if (!type) return '';
  const normalized = String(type).trim().toLowerCase().replace(/[_\s]+/g, '-');
  if (/^non[-_ ]*tech(nical)?$/.test(normalized) || normalized === 'nontechnical') return 'non-technical';
  if (/^tech(nical)?$/.test(normalized) || normalized === 'tech') return 'technical';
  return normalized;
}

router.get('/', adminAuth, async (req, res) => {
  try {
    let collegeCodes;

    if (isSuperAdmin(req.user)) {
      const all = await College.findAll();
      collegeCodes = all.map(c => c.code);
    } else {
      const college = req.user?.allottedCollege;
      collegeCodes = college ? [college] : [];
    }

    const summaries = {};
    for (const college of collegeCodes) {
      const batches = (await Batch.find()).filter(
        (batch) => batch.college?.toLowerCase() === college.toLowerCase()
      );
      const trainers = await Trainer.countDocuments({ allottedCollege: college, role: 'trainer' });

      const activeBatches = batches.filter(b => !b.status || b.status.toLowerCase() === 'active').length;
      const technicalBatches = batches.filter(b => normalizeBatchType(b.type) === 'technical').length;
      const nonTechnicalBatches = batches.filter(b => normalizeBatchType(b.type) === 'non-technical').length;

      summaries[college] = { activeBatches, technicalBatches, nonTechnicalBatches, trainers };
    }

    res.json({ summaries });
  } catch (error) {
    console.error('Failed to fetch summary data:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
