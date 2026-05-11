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
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      const { trainerName, college, assignmentName, batchName, topicsCovered, sessionDate, githubLink, assignmentLink, trainerId, classroom, morningSession1, morningSession2, afternoonSession1, afternoonSession2 } = req.body;

      const classroomCollege = parseCollegeFromClassroom(classroom);
      const submissionData = {
        trainerName,
        college: classroomCollege || college || undefined,
        assignmentName,
        batchName,
        topicsCovered,
        sessionDate,
        githubLink,
        assignmentLink,
        trainerId: trainerId || null,
        classroom: classroom || undefined,
        morningSession1: Number(morningSession1) || 0,
        morningSession2: Number(morningSession2) || 0,
        afternoonSession1: Number(afternoonSession1) || 0,
        afternoonSession2: Number(afternoonSession2) || 0,
      };

      if (trainerId) {
        const trainer = await Trainer.findById(trainerId);
        if (trainer) {
          if (!submissionData.college) {
            submissionData.college = trainer.college || trainer.allottedCollege || undefined;
          }
          if (!submissionData.assignmentName && trainer.assignmentName) {
            submissionData.assignmentName = trainer.assignmentName;
          }
        }
      }

      const submission = new Submission(submissionData);

      await submission.save();

      res.status(201).json({
        message: 'Submission created successfully',
        submission,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Get distinct assignment names for the admin's accessible college(s)
router.get('/assignment-names', adminAuth, async (req, res) => {
  try {
    const collegeFilter = getAdminCollegeFilter(req.user);
    const college = req.query.college || collegeFilter;
    const query = college ? { college } : {};
    const names = await Submission.distinct('assignmentName', {
      ...query,
      assignmentName: { $exists: true, $nin: [null, ''] },
    });
    res.json(names.filter(Boolean).sort());
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get all submissions (Admin only)
router.get('/', adminAuth, async (req, res) => {
  try {
    const collegeFilter = getAdminCollegeFilter(req.user);
    const query = collegeFilter ? { college: collegeFilter } : {};
    if (req.query.assignmentName) {
      query.assignmentName = req.query.assignmentName;
    }

    const submissions = await Submission.find(query)
      .populate('trainerId', 'name email college')
      .sort({ createdAt: -1 });

    const submissionsWithCollege = submissions.map((submission) => {
      const sub = submission.toObject();
      if (!sub.college) {
        sub.college = parseCollegeFromClassroom(sub.classroom) || sub.trainerId?.college;
      }
      return sub;
    });

    res.json(submissionsWithCollege);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get submissions by trainer
router.get('/trainer/:trainerId', auth, async (req, res) => {
  try {
    const submissions = await Submission.find({
      trainerId: req.params.trainerId,
    }).sort({ createdAt: -1 });

    res.json(submissions);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single submission
router.get('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id).populate('trainerId', 'name email');

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

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
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    try {
      let submission = await Submission.findById(req.params.id);

      if (!submission) {
        return res.status(404).json({ message: 'Submission not found' });
      }

      // Check if user owns this submission
      if (!submission.trainerId || submission.trainerId.toString() !== req.trainerId) {
        return res.status(403).json({ message: 'Not authorized to update this submission' });
      }

      const { batchName, topicsCovered, sessionDate, githubLink, assignmentLink } = req.body;

      if (batchName) submission.batchName = batchName;
      if (topicsCovered) submission.topicsCovered = topicsCovered;
      if (sessionDate) submission.sessionDate = sessionDate;
      if (githubLink) submission.githubLink = githubLink;
      if (assignmentLink) submission.assignmentLink = assignmentLink;

      await submission.save();

      res.json({
        message: 'Submission updated successfully',
        submission,
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Server error', error: error.message });
    }
  }
);

// Approve/Reject submission (Admin only)
router.put('/:id/review', adminAuth, [body('status').isIn(['approved', 'rejected']).withMessage('Invalid status'), body('feedback').optional().isString()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { status, feedback } = req.body;

    let submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    submission.status = status;
    if (feedback) submission.feedback = feedback;

    await submission.save();

    res.json({
      message: 'Submission reviewed successfully',
      submission,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete submission (Admin or owner)
router.delete('/:id', auth, async (req, res) => {
  try {
    const submission = await Submission.findById(req.params.id);

    if (!submission) {
      return res.status(404).json({ message: 'Submission not found' });
    }

    // Check if user owns this submission or is admin
    if (!submission.trainerId || submission.trainerId.toString() !== req.trainerId) {
      return res.status(403).json({ message: 'Not authorized to delete this submission' });
    }

    await Submission.findByIdAndDelete(req.params.id);

    res.json({ message: 'Submission deleted successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
