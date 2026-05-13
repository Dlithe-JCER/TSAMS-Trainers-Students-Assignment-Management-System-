import express from 'express';
import { body, validationResult } from 'express-validator';
import Submission from '../models/Submission.js';
import Trainer from '../models/Trainer.js';
import { auth, adminAuth } from '../middleware/auth.js';

const SUPER_ADMIN_EMAIL = 'dlithe@gmail.com';
const COLLEGE_EMAIL_MAP = { sdmit: 'SDMIT', mite: 'MITE', nitte: 'Nitte' };

function getAdminCollegeFilter(user) {
  if (!user?.email) return null;
  if (user.email === SUPER_ADMIN_EMAIL || user.role === 'superAdmin') return null;
  const prefix = user.email.split('@')[0].toLowerCase();
  return COLLEGE_EMAIL_MAP[prefix] ?? null;
}

const router = express.Router();

const parseCollegeFromClassroom = (classroom) => {
  if (!classroom || typeof classroom !== 'string') return undefined;
  const match = classroom.match(/\(([^)]+)\)\s*$/);
  return match ? match[1].trim() : undefined;
};

// Create a new submission
router.post(
  '/',
  [
    body('trainerName').notEmpty().withMessage('Trainer name is required'),
    body('batchName').notEmpty().withMessage('Batch name is required'),
    body('topicsCovered').notEmpty().withMessage('Topics covered is required'),
    body('sessionDate').isISO8601().withMessage('Valid session date is required'),
    body('githubLink').isURL().withMessage('Valid GitHub link is required'),
    body('assignmentLink').isURL().withMessage('Valid assignment link is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { trainerName, college, assignmentName, batchName, topicsCovered, sessionDate, githubLink, assignmentLink, trainerId, classroom, morningSession1, morningSession2, afternoonSession1, afternoonSession2 } = req.body;

      const classroomCollege = parseCollegeFromClassroom(classroom);
      const submissionData = {
        trainerName,
        college: classroomCollege || college || null,
        assignmentName,
        batchName,
        topicsCovered,
        sessionDate,
        githubLink,
        assignmentLink,
        trainerId: trainerId || null,
        classroom: classroom || null,
        morningSession1: Number(morningSession1) || 0,
        morningSession2: Number(morningSession2) || 0,
        afternoonSession1: Number(afternoonSession1) || 0,
        afternoonSession2: Number(afternoonSession2) || 0,
      };

      if (trainerId) {
        const trainer = await Trainer.findById(trainerId);
        if (trainer) {
          if (!submissionData.college) submissionData.college = trainer.college || trainer.allottedCollege || null;
          if (!submissionData.assignmentName && trainer.assignmentName) submissionData.assignmentName = trainer.assignmentName;
        }
      }

      const submission = await Submission.create(submissionData);
      res.status(201).json({ message: 'Submission created successfully', submission });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Get distinct assignment names
router.get('/assignment-names', adminAuth, async (req, res) => {
  try {
    const collegeFilter = getAdminCollegeFilter(req.user);
    const college = req.query.college || collegeFilter;
    const conditions = {};
    if (college) conditions.college = college;
    const names = await Submission.distinct('assignmentName', conditions);
    res.json(names);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all submissions (admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const collegeFilter = getAdminCollegeFilter(req.user);
    const conditions = {};
    if (collegeFilter) conditions.college = collegeFilter;
    if (req.query.assignmentName) conditions.assignmentName = req.query.assignmentName;

    const submissions = await Submission.find(conditions);
    const result = submissions.map((sub) => {
      if (!sub.college) {
        sub.college = parseCollegeFromClassroom(sub.classroom) || sub.trainerId?.college;
      }
      return sub;
    });
    res.json(result);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get submissions by trainer
router.get('/trainer/:trainerId', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({ trainerId: req.params.trainerId });
    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single submission
router.get('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });
    res.json(submission);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update submission
router.put(
  '/:id',
  auth,
  [
    body('batchName').optional().notEmpty().withMessage('Batch name cannot be empty'),
    body('topicsCovered').optional().notEmpty().withMessage('Topics covered cannot be empty'),
    body('sessionDate').optional().isISO8601().withMessage('Valid session date is required'),
    body('githubLink').optional().isURL().withMessage('Valid GitHub link is required'),
    body('assignmentLink').optional().isURL().withMessage('Valid assignment link is required'),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const submission = await Submission.findById(req.params.id);
      if (!submission) return res.status(404).json({ message: 'Submission not found' });

      const ownerId = typeof submission.trainerId === 'object'
        ? submission.trainerId?.id
        : submission.trainerId;
      if (!ownerId || ownerId !== req.trainerId) {
        return res.status(403).json({ message: 'Not authorized to update this submission' });
      }

      const { batchName, topicsCovered, sessionDate, githubLink, assignmentLink } = req.body;
      const updates = {};
      if (batchName) updates.batchName = batchName;
      if (topicsCovered) updates.topicsCovered = topicsCovered;
      if (sessionDate) updates.sessionDate = sessionDate;
      if (githubLink) updates.githubLink = githubLink;
      if (assignmentLink) updates.assignmentLink = assignmentLink;

      const updated = await Submission.findByIdAndUpdate(req.params.id, updates);
      res.json({ message: 'Submission updated successfully', submission: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Approve/Reject submission (admin only)
router.put('/:id/review', adminAuth,
  [body('status').isIn(['approved', 'rejected']).withMessage('Invalid status'), body('feedback').optional().isString()],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

    try {
      const { status, feedback } = req.body;
      const submission = await Submission.findById(req.params.id);
      if (!submission) return res.status(404).json({ message: 'Submission not found' });

      const updates = { status };
      if (feedback) updates.feedback = feedback;
      const updated = await Submission.findByIdAndUpdate(req.params.id, updates);
      res.json({ message: 'Submission reviewed successfully', submission: updated });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Delete submission (owner or admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);
    if (!submission) return res.status(404).json({ message: 'Submission not found' });

    const isAdmin = req.user?.role === 'admin' || req.user?.role === 'superAdmin';
    if (!isAdmin) {
      const ownerId = typeof submission.trainerId === 'object'
        ? submission.trainerId?.id
        : submission.trainerId;
      if (!ownerId || ownerId !== req.user?.id) {
        return res.status(403).json({ message: 'Not authorized to delete this submission' });
      }
    }

    await Submission.findByIdAndDelete(req.params.id);
    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
