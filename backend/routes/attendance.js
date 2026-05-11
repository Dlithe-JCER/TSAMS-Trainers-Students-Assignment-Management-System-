import express from 'express';
import crypto from 'crypto';
import { auth } from '../middleware/auth.js';
import QRSession from '../models/QRSession.js';
import Attendance from '../models/Attendance.js';
import Student from '../models/Student.js';
import SessionAttendance from '../models/SessionAttendance.js';

const router = express.Router();

// Generate QR code for attendance (trainer only)
router.post('/generate-qr', async (req, res) => {
  try {
    const { batchId, classroomId } = req.body;

    if (!batchId) {
      return res.status(400).json({ message: 'Batch ID required' });
    }

    // Generate random 16-char token
    const qrToken = crypto.randomBytes(8).toString('hex');

    // Set 5-minute expiry
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

    const qrSession = new QRSession({
      qrToken,
      batchId,
      classroomId,
      expiresAt,
      trainerId: req.trainerId,
    });

    await qrSession.save();

    res.json({
      qrToken,
      expiresAt,
      countdown: 300,
      message: 'QR code generated successfully',
    });
  } catch (error) {
    console.error('Generate QR error:', error);
    res.status(500).json({ message: 'Failed to generate QR code' });
  }
});

// Check QR status
router.get('/qr-status/:token', async (req, res) => {
  try {
    const { token } = req.params;

    const qrSession = await QRSession.findOne({ qrToken: token });

    if (!qrSession) {
      return res.json({ isValid: false, message: 'QR code not found' });
    }

    const now = new Date();
    const isExpired = now > qrSession.expiresAt;
    const expiresIn = Math.max(0, Math.floor((qrSession.expiresAt - now) / 1000));

    if (isExpired) {
      await QRSession.updateOne({ _id: qrSession._id }, { status: 'expired' });
      return res.json({ isValid: false, expired: true, message: 'QR code expired' });
    }

    res.json({
      isValid: true,
      expiresIn,
      batchId: qrSession.batchId,
      classroomId: qrSession.classroomId,
    });
  } catch (error) {
    console.error('QR status check error:', error);
    res.status(500).json({ message: 'Failed to check QR status' });
  }
});

// Mark attendance
router.post('/mark', async (req, res) => {
  try {
    const { qrToken, studentName, usn, batchName, college, latitude, longitude } = req.body;

    if (!qrToken || !studentName || !usn || !batchName || !college) {
      return res.status(400).json({ message: 'All required fields must be provided' });
    }

    // Validate QR token
    const qrSession = await QRSession.findOne({ qrToken });

    if (!qrSession) {
      return res.status(400).json({ message: 'Invalid QR code' });
    }

    const now = new Date();
    if (now > qrSession.expiresAt) {
      return res.status(400).json({ message: 'QR code has expired' });
    }

    // Check if student already scanned this QR
    const existingAttendance = await Attendance.findOne({
      qrSessionId: qrSession._id,
      usn,
    });

    if (existingAttendance) {
      return res.status(400).json({ message: 'Student already marked attendance for this QR' });
    }

    // Create attendance record
    const attendance = new Attendance({
      qrSessionId: qrSession._id,
      studentName,
      usn,
      batchName,
      college,
      latitude,
      longitude,
    });

    await attendance.save();

    // Update QR session status if needed
    const remainingTime = qrSession.expiresAt - now;
    if (remainingTime <= 0) {
      await QRSession.updateOne({ _id: qrSession._id }, { status: 'completed' });
    }

    res.json({ success: true, message: 'Attendance marked successfully', attendanceId: attendance._id });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({ message: 'Failed to mark attendance' });
  }
});

// Get attendance records by QR session (trainer only)
router.get('/session/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;

    const records = await Attendance.find({ qrSessionId: sessionId });
    res.json(records);
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({ message: 'Failed to get attendance records' });
  }
});

// Submit attendance from QR form (no token required)
router.post('/submit', async (req, res) => {
  try {
    const { studentName, usn, batchId, batchName, college, session, latitude, longitude } = req.body;

    if (!studentName || !usn || !batchName || !college || !session) {
      return res.status(400).json({ message: 'studentName, usn, batchName, college and session are required' });
    }

    const valid = ['morning1', 'morning2', 'afternoon1', 'afternoon2'];
    if (!valid.includes(session)) {
      return res.status(400).json({ message: 'Invalid session value' });
    }

    const record = new SessionAttendance({
      studentName: studentName.trim(),
      usn: usn.trim().toUpperCase(),
      batchId: batchId || undefined,
      batchName,
      college,
      session,
      latitude:  latitude  ?? null,
      longitude: longitude ?? null,
    });

    await record.save();
    res.status(201).json({ success: true, message: 'Attendance recorded', id: record._id });
  } catch (error) {
    console.error('Submit attendance error:', error);
    res.status(500).json({ message: 'Failed to record attendance' });
  }
});

export default router;
