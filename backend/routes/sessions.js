import express from 'express';
import DailyLog from '../models/DailyLog.js';
import SessionToken from '../models/SessionToken.js';
import SessionAttendance from '../models/SessionAttendance.js';
import Student from '../models/Student.js';
import AttendanceSummary from '../models/AttendanceSummary.js';
import { adminAuth } from '../middleware/auth.js';

const GFORM_SUBMIT_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSewelbciXC3k9FzPPKyN427lqb-UjTsV3n2lihFigrolWk7wg/formResponse';

async function submitToGoogleForm(studentName, usn, date) {
  try {
    const [year, month, day] = date.split('-');
    const body = new URLSearchParams({
      'entry.1911055123': studentName,
      'entry.628498189': usn,
      'entry.1713188524_year': year,
      'entry.1713188524_month': String(parseInt(month, 10)),
      'entry.1713188524_day': String(parseInt(day, 10)),
    });
    await fetch(GFORM_SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual',
    });
  } catch (err) {
    console.error('Google Form submit error:', err.message);
  }
}

const router = express.Router();

const SESSION_LABELS = {
  morning1: 'Morning Session 1',
  morning2: 'Morning Session 2',
  afternoon1: 'Afternoon Session 1',
  afternoon2: 'Afternoon Session 2',
};

// GET /api/sessions/check
router.get('/check', async (req, res) => {
  try {
    const { batchId, date } = req.query;
    const SESS = ['morning1', 'morning2', 'afternoon1', 'afternoon2'];
    if (!batchId || !date) {
      return res.json(Object.fromEntries(SESS.map(s => [s, false])));
    }
    const log = await DailyLog.findOne({ date, batchId });
    const sessions = log?.sessions || [];
    const used = Object.fromEntries(SESS.map(s => [s, sessions.some(e => e.session === s)]));
    res.json(used);
  } catch (err) {
    console.error('Check sessions error:', err);
    res.status(500).json({ message: 'Failed to check sessions' });
  }
});

// POST /api/sessions/generate
router.post('/generate', async (req, res) => {
  try {
    const { session, batchId, batchName, college } = req.body;
    if (!session || !batchName) {
      return res.status(400).json({ message: 'session and batchName required' });
    }

    const today = new Date().toISOString().split('T')[0];

    const alreadyUsed = await DailyLog.findSession(today, batchId || null, session);
    if (alreadyUsed) {
      return res.status(409).json({
        message: `${SESSION_LABELS[session] || session} QR already generated today. Try again tomorrow.`,
      });
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const submitUntil = new Date(expiresAt.getTime() + 8 * 60 * 1000);

    const sessionToken = await SessionToken.create({
      session,
      batchId: batchId || null,
      batchName,
      college: college || '',
      date: today,
      expiresAt,
      submitUntil,
    });

    await DailyLog.upsert(today, batchId || null, batchName, college || '', {
      session,
      sessionLabel: SESSION_LABELS[session] || session,
      generatedAt: new Date().toISOString(),
    });

    res.status(201).json({
      token: sessionToken.token,
      expiresAt: sessionToken.expiresAt,
      expiresIn: 300,
    });
  } catch (err) {
    console.error('Generate session token error:', err);
    res.status(500).json({ message: 'Failed to generate QR token' });
  }
});

// GET /api/sessions/validate/:token
router.get('/validate/:token', async (req, res) => {
  try {
    const st = await SessionToken.findOne({ token: req.params.token });
    if (!st) return res.json({ valid: false, message: 'QR not found' });
    if (new Date() > new Date(st.expiresAt)) return res.json({ valid: false, message: 'QR has expired' });
    res.json({
      valid: true,
      session: st.session,
      sessionLabel: SESSION_LABELS[st.session] || st.session,
      batchName: st.batchName,
      college: st.college,
      expiresAt: st.expiresAt,
    });
  } catch (err) {
    res.status(500).json({ valid: false, message: 'Server error' });
  }
});

// POST /api/sessions/submit
router.post('/submit', async (req, res) => {
  try {
    const { token, studentName, usn, latitude, longitude } = req.body;
    if (!token || !studentName || !usn) {
      return res.status(400).json({ message: 'token, studentName and usn required' });
    }

    const st = await SessionToken.findOne({ token });
    if (!st) return res.status(400).json({ message: 'Invalid QR code' });

    const now = new Date();
    if (now < new Date(st.expiresAt)) {
      return res.status(400).json({ message: 'Session still active — wait for it to end before submitting' });
    }
    const deadline = st.submitUntil
      ? new Date(st.submitUntil)
      : new Date(new Date(st.expiresAt).getTime() + 8 * 60 * 1000);
    if (now > deadline) {
      return res.status(400).json({ message: 'Submission window has closed' });
    }

    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';

    if (st.usedIps.includes(ip)) {
      return res.status(409).json({ message: 'Attendance already submitted from this device' });
    }

    // Step 1: verify USN exists in students table
    const normalizedUsn = usn.trim().toUpperCase();
    const student = await Student.findOne({ usn: normalizedUsn });
    if (!student) {
      return res.status(400).json({ message: 'USN not registered. Contact your coordinator.' });
    }

    // Step 2: lowercase(entered USN) must match student clean_key
    const usnLower = normalizedUsn.toLowerCase();
    if (!student.cleanKey || usnLower !== student.cleanKey.trim().toLowerCase()) {
      return res.status(400).json({ message: 'USN verification failed. Contact your coordinator.' });
    }

    await SessionToken.addUsedIp(st.id, ip);

    const record = await SessionAttendance.create({
      studentName: student.name,
      usn: normalizedUsn,
      batchId: st.batchId,
      batchName: st.batchName,
      college: st.college,
      session: st.session,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    });

    // Store verified record in attendance_summary
    const timeStr = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
    await AttendanceSummary.create({
      studentName: student.name,
      usn: normalizedUsn,
      cleanKey: student.cleanKey,
      date: st.date,
      time: timeStr,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
      session: st.session,
      batchName: st.batchName,
      college: st.college,
    });

    submitToGoogleForm(student.name, normalizedUsn, st.date);

    res.status(201).json({ success: true, id: record.id });
  } catch (err) {
    console.error('Submit attendance error:', err);
    res.status(500).json({ message: 'Failed to record attendance' });
  }
});

// GET /api/sessions/attendance-summary  (admin only)
router.get('/attendance-summary', adminAuth, async (req, res) => {
  try {
    const { college, date } = req.query;
    const records = await AttendanceSummary.find({
      college: college || undefined,
      date: date || undefined,
    });
    res.json(records);
  } catch (err) {
    console.error('Attendance summary fetch error:', err);
    res.status(500).json({ message: 'Failed to fetch attendance summary' });
  }
});

// GET /api/sessions/logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await DailyLog.find();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

export default router;
