import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import TocDocument from '../models/TocDocument.js';
import { adminAuth, auth } from '../middleware/auth.js';
import Trainer from '../models/Trainer.js';

const COLLEGE_EMAIL_MAP = { sdmit: 'SDMIT', mite: 'MITE', nitte: 'Nitte' };
const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';

function isSuperAdmin(user) {
  return !!(user?.email && user.email.toLowerCase() === SUPER_ADMIN_EMAIL) || user?.role === 'superAdmin';
}

function getAdminCollegeFilter(user) {
  if (!user?.email) return null;
  if (user.email === SUPER_ADMIN_EMAIL || user.role === 'superAdmin') return null;
  const prefix = user.email.split('@')[0].toLowerCase();
  return COLLEGE_EMAIL_MAP[prefix] ?? null;
}

const router = express.Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadDir = path.join(__dirname, '..', 'uploads');

if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${Date.now()}-${safeName}`);
  },
});
const upload = multer({ storage });

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

router.get('/', auth, async (req, res) => {
  try {
    const { college, level, title } = req.query;
    const conditions = {};

    if (req.user.role === 'trainer') {
      const trainer = await Trainer.findById(req.user.id);
      if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
      if (!trainer.allottedCollege || !trainer.allottedLevel) {
        return res.status(403).json({ message: 'You are not allowed to access TOC documents' });
      }
      const trainerCollege = (trainer.allottedCollege || '').trim();
      const trainerLevel = (trainer.allottedLevel || '').trim();
      conditions.college = { $regex: `^${escapeRegex(trainerCollege)}$` };
      conditions.level = { $regex: `^${trainerLevel.replace(/[-\s]+/g, '[\\s-]+')}$` };
    } else {
      const collegeFilter = getAdminCollegeFilter(req.user);
      if (collegeFilter) {
        conditions.college = collegeFilter;
      } else {
        if (college) conditions.college = college;
        if (level) conditions.level = level;
        if (title) conditions.title = { $regex: title };
      }
    }

    const docs = await TocDocument.find(conditions);
    res.json(docs);
  } catch (error) {
    console.error('Failed to fetch TOC documents:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/assignment-names', adminAuth, async (req, res) => {
  try {
    const conditions = {};
    const collegeFilter = getAdminCollegeFilter(req.user);
    if (collegeFilter) conditions.college = collegeFilter;
    else if (req.query.college) conditions.college = req.query.college;
    const names = await TocDocument.distinct('assignmentName', conditions);
    res.json(names);
  } catch (error) {
    console.error('Failed to fetch assignment names:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/options', auth, async (req, res) => {
  try {
    let colleges, levels, titles;

    if (req.user.role === 'trainer') {
      const trainer = await Trainer.findById(req.user.id);
      if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
      if (!trainer.allottedCollege || !trainer.allottedProgrammingLanguage || !trainer.allottedLevel) {
        return res.status(403).json({ message: 'You are not allowed to access TOC options' });
      }
      colleges = [trainer.allottedCollege];
      levels = [trainer.allottedLevel];
      const langEscaped = `^${escapeRegex(trainer.allottedProgrammingLanguage.trim())}$`;
      titles = await TocDocument.distinct('title', {
        college: trainer.allottedCollege,
        level: trainer.allottedLevel,
        title: { $regex: langEscaped },
      });
    } else {
      colleges = await TocDocument.distinct('college', {});
      levels = await TocDocument.distinct('level', {});
      titles = await TocDocument.distinct('title', {});
    }

    res.json({ colleges, levels, titles });
  } catch (error) {
    console.error('Failed to fetch TOC options:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.post('/upload', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only superadmin may manage TOC documents' });
    }
    const { title, level, college, assignmentName } = req.body;
    const file = req.file;
    if (!file) return res.status(400).json({ message: 'File upload is required' });
    if (!college || !assignmentName || !title || !level) {
      return res.status(400).json({ message: 'College, assignment name, title, and level are required' });
    }
    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${file.filename}`;
    const tocDocument = await TocDocument.create({ college, assignmentName, title, level, fileName: file.originalname, filePath: file.path, fileUrl });
    res.status(201).json({ message: 'TOC document uploaded', tocDocument });
  } catch (error) {
    console.error('TOC upload failed:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.put('/:id', adminAuth, upload.single('file'), async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only superadmin may manage TOC documents' });
    }
    const doc = await TocDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'TOC document not found' });

    const { title, level, college, assignmentName } = req.body;
    if (!college || !assignmentName || !title || !level) {
      return res.status(400).json({ message: 'College, assignment name, title, and level are required' });
    }

    const updates = { college, assignmentName, title, level };

    if (req.file) {
      try {
        if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
      } catch (unlinkError) {
        console.warn('Failed to remove old TOC file:', unlinkError);
      }
      updates.fileName = req.file.originalname;
      updates.filePath = req.file.path;
      updates.fileUrl = `${req.protocol}://${req.get('host')}/uploads/${req.file.filename}`;
    }

    const updated = await TocDocument.findByIdAndUpdate(req.params.id, updates);
    res.json({ message: 'TOC document updated', tocDocument: updated });
  } catch (error) {
    console.error('TOC update failed:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    if (!isSuperAdmin(req.user)) {
      return res.status(403).json({ message: 'Only superadmin may manage TOC documents' });
    }
    const doc = await TocDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'TOC document not found' });

    try {
      if (fs.existsSync(doc.filePath)) fs.unlinkSync(doc.filePath);
    } catch (unlinkError) {
      console.warn('Failed to remove TOC file on delete:', unlinkError);
    }

    await TocDocument.findByIdAndDelete(req.params.id);
    res.json({ message: 'TOC document deleted' });
  } catch (error) {
    console.error('TOC delete failed:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/:id/download', auth, async (req, res) => {
  try {
    const doc = await TocDocument.findById(req.params.id);
    if (!doc) return res.status(404).json({ message: 'Document not found' });

    if (req.user.role === 'trainer') {
      const trainer = await Trainer.findById(req.user.id);
      if (!trainer) return res.status(404).json({ message: 'Trainer not found' });
      if (!trainer.allottedCollege || !trainer.allottedProgrammingLanguage || !trainer.allottedLevel) {
        return res.status(403).json({ message: 'You are not allowed to access this document' });
      }
      const allowedLanguage = trainer.allottedProgrammingLanguage.trim().toLowerCase();
      const docLanguage = doc.title.trim().toLowerCase();
      if (doc.college !== trainer.allottedCollege || doc.level !== trainer.allottedLevel || docLanguage !== allowedLanguage) {
        return res.status(403).json({ message: 'You are not allowed to access this document' });
      }
    }

    res.download(doc.filePath, doc.fileName);
  } catch (error) {
    console.error('TOC download failed:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/by-assignment/:assignmentName', async (req, res) => {
  try {
    const { assignmentName } = req.params;
    if (!assignmentName) return res.status(400).json({ message: 'Assignment name is required' });
    const docs = await TocDocument.find({ assignmentName });
    res.json(docs.map(d => ({
      _id: d.id, id: d.id,
      title: d.title, level: d.level, college: d.college,
      fileUrl: d.fileUrl, fileName: d.fileName, assignmentName: d.assignmentName,
    })));
  } catch (error) {
    console.error('Failed to fetch TOC documents by assignment:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

router.get('/by-trainer/:trainerId', async (req, res) => {
  try {
    const trainer = await Trainer.findById(req.params.trainerId, { excludePassword: true });
    if (!trainer || trainer.role === 'admin' || trainer.role === 'superAdmin') {
      return res.status(404).json({ message: 'Trainer not found' });
    }

    const college = (trainer.allottedCollege || trainer.college || '').trim();
    const level = (trainer.allottedLevel || '').trim();

    if (!college || !level) {
      return res.status(200).json({
        docs: [],
        trainer: { name: trainer.name, college: college || null, level: level || null, assignmentName: trainer.assignmentName || null },
      });
    }

    const levelNorm = level.replace(/[-\s]+/g, '[\\s-]+');
    const docs = await TocDocument.find({
      college: { $regex: `^${escapeRegex(college)}$` },
      level: { $regex: `^${levelNorm}$` },
    });

    res.json({
      trainer: { name: trainer.name, college, level, assignmentName: trainer.assignmentName },
      docs: docs.map(d => ({
        _id: d.id, id: d.id,
        title: d.title, level: d.level, college: d.college,
        fileUrl: d.fileUrl, fileName: d.fileName, assignmentName: d.assignmentName,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch TOC by trainer:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
