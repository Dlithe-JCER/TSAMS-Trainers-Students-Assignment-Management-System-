import express from 'express';
import DailyLog from '../models/DailyLog.js';
import SessionToken from '../models/SessionToken.js';
import SessionAttendance from '../models/SessionAttendance.js';
import pool from '../config/mysql.js';

const GFORM_SUBMIT_URL =
  'https://docs.google.com/forms/d/e/1FAIpQLSewelbciXC3k9FzPPKyN427lqb-UjTsV3n2lihFigrolWk7wg/formResponse';

async function submitToGoogleForm(studentName, usn, date) {
  try {
    const [year, month, day] = date.split('-');
    const body = new URLSearchParams({
      'entry.1911055123': studentName,
      'entry.628498189':  usn,
      'entry.1713188524_year':  year,
      'entry.1713188524_month': String(parseInt(month, 10)),
      'entry.1713188524_day':   String(parseInt(day, 10)),
    });
    await fetch(GFORM_SUBMIT_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: body.toString(),
      redirect: 'manual', // Google redirects after submit — ignore it
    });
  } catch (err) {
    console.error('Google Form submit error:', err.message);
  }
}

const router = express.Router();

const SESSION_LABELS = {
  morning1:   'Morning Session 1',
  morning2:   'Morning Session 2',
  afternoon1: 'Afternoon Session 1',
  afternoon2: 'Afternoon Session 2',
};

// GET /api/sessions/check — which sessions already generated today for a batch
router.get('/check', async (req, res) => {
  try {
    const { batchId, date } = req.query;
    const SESS = ['morning1', 'morning2', 'afternoon1', 'afternoon2'];
    if (!batchId || !date) {
      return res.json(Object.fromEntries(SESS.map(s => [s, false])));
    }
    const log = await DailyLog.findOne({ date, batchId }).lean();
    const used = Object.fromEntries(
      SESS.map(s => [s, log ? log.sessions.some(e => e.session === s) : false])
    );
    res.json(used);
  } catch (err) {
    console.error('Check sessions error:', err);
    res.status(500).json({ message: 'Failed to check sessions' });
  }
});

// POST /api/sessions/generate — create 5-min token + log the day
router.post('/generate', async (req, res) => {
  try {
    const { session, batchId, batchName, college } = req.body;

    if (!session || !batchName) {
      return res.status(400).json({ message: 'session and batchName required' });
    }

    const today = new Date().toISOString().split('T')[0];

    // Block duplicate: each session may only be generated once per batch per day
    const alreadyUsed = await DailyLog.findOne({
      date: today,
      batchId: batchId || null,
      'sessions.session': session,
    });
    if (alreadyUsed) {
      return res.status(409).json({
        message: `${SESSION_LABELS[session] || session} QR already generated today. Try again tomorrow.`,
      });
    }

    const expiresAt   = new Date(Date.now() + 5 * 60 * 1000);        // QR scannable 5 min
    const submitUntil = new Date(expiresAt.getTime() + 8 * 60 * 1000); // students submit within 8 min after expiry

    const sessionToken = await SessionToken.create({
      session,
      batchId: batchId || undefined,
      batchName,
      college: college || '',
      date: today,
      expiresAt,
      submitUntil,
    });

    // Upsert daily log (MongoDB)
    await DailyLog.findOneAndUpdate(
      { date: today, batchId: batchId || null },
      {
        $setOnInsert: { date: today, batchId: batchId || undefined, batchName, college },
        $push: { sessions: { session, sessionLabel: SESSION_LABELS[session] || session, generatedAt: new Date() } },
      },
      { upsert: true }
    );

    // Log QR session in MySQL
    try {
      await pool.query(
        `INSERT IGNORE INTO qr_sessions_log
           (session_key, session_label, session_date, batch_name, college)
         VALUES (?, ?, ?, ?, ?)`,
        [session, SESSION_LABELS[session] || session, today, batchName, college || '']
      );
    } catch (mysqlErr) {
      console.error('[MySQL] qr_sessions_log insert error:', mysqlErr.message);
    }

    res.status(201).json({
      token: sessionToken.token,
      expiresAt: sessionToken.expiresAt,
      expiresIn: 300, // seconds
    });
  } catch (err) {
    console.error('Generate session token error:', err);
    res.status(500).json({ message: 'Failed to generate QR token' });
  }
});

// GET /api/sessions/validate/:token — check validity
router.get('/validate/:token', async (req, res) => {
  try {
    const st = await SessionToken.findOne({ token: req.params.token });
    if (!st) return res.json({ valid: false, message: 'QR not found' });
    if (new Date() > st.expiresAt) return res.json({ valid: false, message: 'QR has expired' });
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

// POST /api/sessions/submit — mark attendance, check IP
router.post('/submit', async (req, res) => {
  try {
    const { token, studentName, usn, latitude, longitude } = req.body;

    if (!token || !studentName || !usn) {
      return res.status(400).json({ message: 'token, studentName and usn required' });
    }

    const st = await SessionToken.findOne({ token });
    if (!st) return res.status(400).json({ message: 'Invalid QR code' });

    const now = new Date();
    // Must wait for QR to expire before submitting
    if (now < st.expiresAt) {
      return res.status(400).json({ message: 'Session still active — wait for it to end before submitting' });
    }
    // Submit window: expiresAt → submitUntil (8 min grace)
    const deadline = st.submitUntil || new Date(st.expiresAt.getTime() + 8 * 60 * 1000);
    if (now > deadline) {
      return res.status(400).json({ message: 'Submission window has closed' });
    }

    // Capture IP
    const forwarded = req.headers['x-forwarded-for'];
    const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim()
      || req.socket.remoteAddress
      || 'unknown';

    // Block duplicate IP
    if (st.usedIps.includes(ip)) {
      return res.status(409).json({ message: 'Attendance already submitted from this device' });
    }

    await SessionToken.updateOne({ _id: st._id }, { $push: { usedIps: ip } });

    const record = await SessionAttendance.create({
      studentName: studentName.trim(),
      usn: usn.trim().toUpperCase(),
      batchId: st.batchId,
      batchName: st.batchName,
      college: st.college,
      session: st.session,
      latitude: latitude ?? null,
      longitude: longitude ?? null,
    });

    // Mirror to Google Form → auto-appends row in linked Google Sheet
    submitToGoogleForm(studentName.trim(), usn.trim().toUpperCase(), st.date);

    // Write attendance to MySQL
    try {
      await pool.query(
        `INSERT INTO student_attendance
           (usn, student_name, session_key, session_label, session_date,
            batch_name, college, latitude, longitude)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE submitted_at = submitted_at`,
        [
          usn.trim().toUpperCase(),
          studentName.trim(),
          st.session,
          SESSION_LABELS[st.session] || st.session,
          st.date,
          st.batchName,
          st.college,
          latitude ?? null,
          longitude ?? null,
        ]
      );
    } catch (mysqlErr) {
      console.error('[MySQL] student_attendance insert error:', mysqlErr.message);
    }

    res.status(201).json({ success: true, id: record._id });
  } catch (err) {
    console.error('Submit attendance error:', err);
    res.status(500).json({ message: 'Failed to record attendance' });
  }
});

// GET /api/sessions/logs
router.get('/logs', async (req, res) => {
  try {
    const logs = await DailyLog.find().sort({ date: -1 }).lean();
    res.json(logs);
  } catch (err) {
    res.status(500).json({ message: 'Failed to fetch logs' });
  }
});

export default router;
