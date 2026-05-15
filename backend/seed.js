import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';
import connectDB from './config/db.js';
import { sql } from './config/db.js';
import Trainer from './models/Trainer.js';
import College from './models/College.js';
import Submission from './models/Submission.js';
import Batch from './models/Batch.js';
import Classroom from './models/Classroom.js';
import TocDocument from './models/TocDocument.js';
import Student from './models/Student.js';
import AttendanceSummary from './models/AttendanceSummary.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '.env') });

// ── helpers ─────────────────────────────────────────────────────────────────

async function upsertBatch(data) {
  const existing = await Batch.findOne({ name: data.name, college: data.college });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return Batch.create(data);
}

async function upsertClassroom(data) {
  const existing = await Classroom.findOne({ name: data.name, college: data.college });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return Classroom.create(data);
}

async function upsertToc(data) {
  const existing = await TocDocument.findOne({
    title: data.title,
    level: data.level,
    college: data.college,
  });
  if (existing) {
    Object.assign(existing, data);
    await existing.save();
    return existing;
  }
  return TocDocument.create(data);
}

// ── seed ────────────────────────────────────────────────────────────────────

const seed = async () => {
  try {
    await connectDB();

    const defaultAdminPassword = 'dlithe2026';

    // ── Admin accounts ───────────────────────────────────────────────────────
    const adminAccounts = [
      { email: 'dlithe@gmail.com', phone: '+911234567890', name: 'Dlithe Super Admin', role: 'superAdmin' },
      { email: 'sdmit@dlithe.com',     phone: '+911234567891', name: 'SDMIT Admin',        role: 'admin' },
      { email: 'mite@dlithe.com',      phone: '+911234567892', name: 'MITE Admin',         role: 'admin' },
      { email: 'nitte@dlithe.com',     phone: '+911234567893', name: 'Nitte Admin',        role: 'admin' },
    ];

    for (const account of adminAccounts) {
      const existing = await Trainer.findOne({ email: account.email });
      if (!existing) {
        const hashed = await bcrypt.hash(defaultAdminPassword, 10);
        await Trainer.create({ ...account, password: hashed, verified: true });
        console.log(`Created ${account.role}: ${account.email}`);
      } else {
        if (existing.role !== account.role) {
          existing.role = account.role;
          await existing.save();
          console.log(`Updated role: ${account.email} → ${account.role}`);
        } else {
          console.log(`Exists: ${account.email}`);
        }
      }
    }

    // ── Colleges ────────────────────────────────────────────────────────────
    const collegeDefs = [
      { name: 'NMAMIT Nitte', code: 'NMAMIT-NITTE-ENG',  department: 'ENG',  location: 'Nitte' },
      { name: 'NMAMIT Nitte', code: 'NMAMIT-NITTE-MCA',  department: 'MCA',  location: 'Nitte' },
      { name: 'NMAMIT Nitte', code: 'NMAMIT-NITTE-POLY', department: 'POLY', location: 'Nitte' },
      { name: 'MITE',         code: 'MITE',               department: 'ENG',  location: 'Mangalore' },
      { name: 'SDMIT',        code: 'SDMIT-POLY',         department: 'POLY', location: 'Ujire' },
      { name: 'SDMIT',        code: 'SDMIT-ENG',          department: 'ENG',  location: 'Ujire' },
      { name: 'PESCE',        code: 'PESCE-ENG',          department: 'ENG',  location: 'Mandya' },
      { name: 'PESCE',        code: 'PESCE-MCA',          department: 'MCA',  location: 'Mandya' },
    ];
    for (const def of collegeDefs) {
      const existing = await College.findOne({ code: def.code });
      if (!existing) {
        await College.create({ ...def, isActive: true });
        console.log(`Created college: ${def.code}`);
      } else {
        console.log(`College exists: ${def.code}`);
      }
    }

    // ── Batches (with type) ──────────────────────────────────────────────────
    const batchDefs = [
      // Nitte
      { name: 'NITTE Placement Training – Tech', college: 'Nitte', status: 'active', type: 'technical',
        startDate: new Date('2026-05-29'), endDate: new Date('2026-06-14') },
      { name: 'NITTE Placement Training – Non-Tech', college: 'Nitte', status: 'active', type: 'non-technical',
        startDate: new Date('2026-05-29'), endDate: new Date('2026-06-14') },
      { name: 'NITTE Full Stack Batch', college: 'Nitte', status: 'active', type: 'technical',
        startDate: new Date('2026-06-01'), endDate: new Date('2026-08-31') },
      // MITE
      { name: 'MITE Advanced Python – Tech', college: 'MITE', status: 'active', type: 'technical',
        startDate: new Date('2026-06-15'), endDate: new Date('2026-07-30') },
      { name: 'MITE Soft Skills – Non-Tech', college: 'MITE', status: 'active', type: 'non-technical',
        startDate: new Date('2026-06-15'), endDate: new Date('2026-07-30') },
      { name: 'MITE Data Science Batch', college: 'MITE', status: 'active', type: 'technical',
        startDate: new Date('2026-07-01'), endDate: new Date('2026-09-30') },
      // SDMIT
      { name: 'SDMIT Data Science – Tech', college: 'SDMIT', status: 'active', type: 'technical',
        startDate: new Date('2026-08-15'), endDate: new Date('2026-09-30') },
      { name: 'SDMIT Communication – Non-Tech', college: 'SDMIT', status: 'active', type: 'non-technical',
        startDate: new Date('2026-08-15'), endDate: new Date('2026-09-30') },
      { name: 'SDMIT AI Batch', college: 'SDMIT', status: 'active', type: 'technical',
        startDate: new Date('2026-08-01'), endDate: new Date('2026-10-31') },
    ];

    const batches = {};
    for (const def of batchDefs) {
      batches[def.name] = await upsertBatch(def);
    }
    console.log('Batches upserted:', Object.keys(batches).length);

    // ── Classrooms ───────────────────────────────────────────────────────────
    const classroomDefs = [
      { name: 'Lab A',          college: 'Nitte', status: 'available', capacity: 25, description: 'Computer lab with modern equipment' },
      { name: 'Lab B',          college: 'Nitte', status: 'available', capacity: 30, description: 'General purpose classroom' },
      { name: 'Room 101',       college: 'MITE',  status: 'available', capacity: 35, description: 'Lecture hall with projector' },
      { name: 'Room 202',       college: 'MITE',  status: 'available', capacity: 28, description: 'Seminar room' },
      { name: 'Computer Lab',   college: 'SDMIT', status: 'available', capacity: 40, description: 'Advanced computing facility' },
      { name: 'Workshop Room',  college: 'SDMIT', status: 'available', capacity: 20, description: 'Hands-on workshop space' },
    ];
    for (const def of classroomDefs) await upsertClassroom(def);
    console.log('Classrooms upserted');

    // ── TOC Documents ────────────────────────────────────────────────────────
    const tocDefs = [
      // Nitte – NITTE-MAY29-JUNE14-PlacementTraining
      { college: 'Nitte', assignmentName: 'NITTE-MAY29-JUNE14-PlacementTraining', title: 'Java',
        level: 'Level 1', fileName: 'java-basics.pdf',
        filePath: '/uploads/java-basics.pdf', fileUrl: 'http://localhost:5000/uploads/java-basics.pdf' },
      { college: 'Nitte', assignmentName: 'NITTE-MAY29-JUNE14-PlacementTraining', title: 'JavaScript',
        level: 'Level 1', fileName: 'javascript-basics.pdf',
        filePath: '/uploads/javascript-basics.pdf', fileUrl: 'http://localhost:5000/uploads/javascript-basics.pdf' },
      // MITE – MITE-JUNE15-JULY30-AdvancedPython
      { college: 'MITE', assignmentName: 'MITE-JUNE15-JULY30-AdvancedPython', title: 'Python',
        level: 'Level 2', fileName: 'python-advanced.pdf',
        filePath: '/uploads/python-advanced.pdf', fileUrl: 'http://localhost:5000/uploads/python-advanced.pdf' },
      { college: 'MITE', assignmentName: 'MITE-JUNE15-JULY30-AdvancedPython', title: 'React',
        level: 'Level 2', fileName: 'react-fundamentals.pdf',
        filePath: '/uploads/react-fundamentals.pdf', fileUrl: 'http://localhost:5000/uploads/react-fundamentals.pdf' },
      // SDMIT – SDMIT-AUG15-SEPT30-DataScience
      { college: 'SDMIT', assignmentName: 'SDMIT-AUG15-SEPT30-DataScience', title: 'Python',
        level: 'Level 3', fileName: 'python-ds.pdf',
        filePath: '/uploads/python-ds.pdf', fileUrl: 'http://localhost:5000/uploads/python-ds.pdf' },
      { college: 'SDMIT', assignmentName: 'SDMIT-AUG15-SEPT30-DataScience', title: 'Machine Learning',
        level: 'Level 3', fileName: 'ml-basics.pdf',
        filePath: '/uploads/ml-basics.pdf', fileUrl: 'http://localhost:5000/uploads/ml-basics.pdf' },
    ];
    for (const def of tocDefs) await upsertToc(def);
    console.log('TOC documents upserted');

    // ── Trainers ─────────────────────────────────────────────────────────────
    const trainerDefs = [
      {
        name: 'Ravi Sharma', phone: '+919876543210', username: 'ravi.sharma', password: 'ravi123',
        college: 'Nitte', allottedCollege: 'Nitte', allottedProgrammingLanguage: 'Java',
        allottedLevel: 'Level 1', assignmentName: 'NITTE-MAY29-JUNE14-PlacementTraining',
        allottedBatch: batches['NITTE Placement Training – Tech']._id,
        topicCoverage: 'After completing this training: Java fundamentals, OOP, data structures, collections, and placement preparation.',
      },
      {
        name: 'Priya Nair', phone: '+919876543211', username: 'priya.nair', password: 'priya123',
        college: 'Nitte', allottedCollege: 'Nitte', allottedProgrammingLanguage: 'JavaScript',
        allottedLevel: 'Level 1', assignmentName: 'NITTE-MAY29-JUNE14-PlacementTraining',
        allottedBatch: batches['NITTE Placement Training – Non-Tech']._id,
        topicCoverage: 'After completing this training: Communication skills, aptitude, group discussions, and mock interviews.',
      },
      {
        name: 'Neha Mehta', phone: '+919812345678', username: 'neha.mehta', password: 'neha123',
        college: 'MITE', allottedCollege: 'MITE', allottedProgrammingLanguage: 'Python',
        allottedLevel: 'Level 2', assignmentName: 'MITE-JUNE15-JULY30-AdvancedPython',
        allottedBatch: batches['MITE Advanced Python – Tech']._id,
        topicCoverage: 'After completing this training: Advanced Python, Django, REST APIs, data analysis with pandas, and ML basics.',
      },
      {
        name: 'Arjun Rao', phone: '+919812345679', username: 'arjun.rao', password: 'arjun123',
        college: 'MITE', allottedCollege: 'MITE', allottedProgrammingLanguage: 'React',
        allottedLevel: 'Level 2', assignmentName: 'MITE-JUNE15-JULY30-AdvancedPython',
        allottedBatch: batches['MITE Soft Skills – Non-Tech']._id,
        topicCoverage: 'After completing this training: Professional communication, email writing, presentation skills, and teamwork.',
      },
      {
        name: 'Kavya Bhat', phone: '+919800012345', username: 'kavya.bhat', password: 'kavya123',
        college: 'SDMIT', allottedCollege: 'SDMIT', allottedProgrammingLanguage: 'Python',
        allottedLevel: 'Level 3', assignmentName: 'SDMIT-AUG15-SEPT30-DataScience',
        allottedBatch: batches['SDMIT Data Science – Tech']._id,
        topicCoverage: 'After completing this training: Data science fundamentals, Python for data analysis, ML algorithms, and project work.',
      },
      {
        name: 'Suresh Kumar', phone: '+919800012346', username: 'suresh.kumar', password: 'suresh123',
        college: 'SDMIT', allottedCollege: 'SDMIT', allottedProgrammingLanguage: 'Machine Learning',
        allottedLevel: 'Level 3', assignmentName: 'SDMIT-AUG15-SEPT30-DataScience',
        allottedBatch: batches['SDMIT Communication – Non-Tech']._id,
        topicCoverage: 'After completing this training: Leadership, time management, problem solving, and industry readiness.',
      },
    ];

    const trainers = {};
    for (const def of trainerDefs) {
      const { password: rawPw, ...rest } = def;
      let trainer = await Trainer.findOne({ phone: rest.phone });
      if (!trainer) {
        trainer = await Trainer.create({
          ...rest,
          password: await bcrypt.hash(rawPw, 10),
          verified: true,
          role: 'trainer',
        });
        console.log(`Created trainer: ${rest.name}`);
      } else {
        Object.assign(trainer, rest);
        trainer.verified = true;
        await trainer.save();
        console.log(`Updated trainer: ${rest.name}`);
      }
      trainers[rest.name] = trainer;
    }

    // ── Sample Submissions ───────────────────────────────────────────────────
    // Each trainer gets 3 sample submissions
    const submissionDefs = [
      // Nitte – Ravi Sharma
      {
        trainerName: 'Ravi Sharma', college: 'Nitte',
        assignmentName: 'NITTE-MAY29-JUNE14-PlacementTraining',
        batchName: 'NITTE Placement Training – Tech',
        classroom: 'Lab A (Nitte)', topicsCovered: 'Java Basics: Variables, Data Types, Operators, Control Flow',
        sessionDate: new Date('2026-05-29'), githubLink: 'https://github.com/ravi/session1',
        assignmentLink: 'https://classroom.github.com/ravi/assignment1',
        trainerId: () => trainers['Ravi Sharma']._id,
      },
      {
        trainerName: 'Ravi Sharma', college: 'Nitte',
        assignmentName: 'NITTE-MAY29-JUNE14-PlacementTraining',
        batchName: 'NITTE Placement Training – Tech',
        classroom: 'Lab A (Nitte)', topicsCovered: 'OOP Concepts: Classes, Objects, Inheritance, Polymorphism',
        sessionDate: new Date('2026-06-02'), githubLink: 'https://github.com/ravi/session2',
        assignmentLink: 'https://classroom.github.com/ravi/assignment2',
        trainerId: () => trainers['Ravi Sharma']._id,
      },
      {
        trainerName: 'Ravi Sharma', college: 'Nitte',
        assignmentName: 'NITTE-MAY29-JUNE14-PlacementTraining',
        batchName: 'NITTE Placement Training – Tech',
        classroom: 'Lab B (Nitte)', topicsCovered: 'Data Structures: Arrays, LinkedList, Stack, Queue',
        sessionDate: new Date('2026-06-07'), githubLink: 'https://github.com/ravi/session3',
        assignmentLink: 'https://classroom.github.com/ravi/assignment3',
        trainerId: () => trainers['Ravi Sharma']._id,
      },
      // Nitte – Priya Nair
      {
        trainerName: 'Priya Nair', college: 'Nitte',
        assignmentName: 'NITTE-MAY29-JUNE14-PlacementTraining',
        batchName: 'NITTE Placement Training – Non-Tech',
        classroom: 'Lab B (Nitte)', topicsCovered: 'Communication Skills: Verbal, Non-verbal, Active Listening',
        sessionDate: new Date('2026-05-30'), githubLink: 'https://github.com/priya/session1',
        assignmentLink: 'https://classroom.github.com/priya/assignment1',
        trainerId: () => trainers['Priya Nair']._id,
      },
      {
        trainerName: 'Priya Nair', college: 'Nitte',
        assignmentName: 'NITTE-MAY29-JUNE14-PlacementTraining',
        batchName: 'NITTE Placement Training – Non-Tech',
        classroom: 'Lab B (Nitte)', topicsCovered: 'Aptitude Training: Quantitative, Verbal, Logical Reasoning',
        sessionDate: new Date('2026-06-04'), githubLink: 'https://github.com/priya/session2',
        assignmentLink: 'https://classroom.github.com/priya/assignment2',
        trainerId: () => trainers['Priya Nair']._id,
      },
      // MITE – Neha Mehta
      {
        trainerName: 'Neha Mehta', college: 'MITE',
        assignmentName: 'MITE-JUNE15-JULY30-AdvancedPython',
        batchName: 'MITE Advanced Python – Tech',
        classroom: 'Room 101 (MITE)', topicsCovered: 'Python Advanced: Decorators, Generators, Context Managers',
        sessionDate: new Date('2026-06-15'), githubLink: 'https://github.com/neha/session1',
        assignmentLink: 'https://classroom.github.com/neha/assignment1',
        trainerId: () => trainers['Neha Mehta']._id,
      },
      {
        trainerName: 'Neha Mehta', college: 'MITE',
        assignmentName: 'MITE-JUNE15-JULY30-AdvancedPython',
        batchName: 'MITE Advanced Python – Tech',
        classroom: 'Room 101 (MITE)', topicsCovered: 'Django Framework: Models, Views, Templates, REST API',
        sessionDate: new Date('2026-06-20'), githubLink: 'https://github.com/neha/session2',
        assignmentLink: 'https://classroom.github.com/neha/assignment2',
        trainerId: () => trainers['Neha Mehta']._id,
      },
      {
        trainerName: 'Neha Mehta', college: 'MITE',
        assignmentName: 'MITE-JUNE15-JULY30-AdvancedPython',
        batchName: 'MITE Advanced Python – Tech',
        classroom: 'Room 202 (MITE)', topicsCovered: 'Data Analysis: NumPy, Pandas, Matplotlib, Seaborn',
        sessionDate: new Date('2026-06-25'), githubLink: 'https://github.com/neha/session3',
        assignmentLink: 'https://classroom.github.com/neha/assignment3',
        trainerId: () => trainers['Neha Mehta']._id,
      },
      // MITE – Arjun Rao
      {
        trainerName: 'Arjun Rao', college: 'MITE',
        assignmentName: 'MITE-JUNE15-JULY30-AdvancedPython',
        batchName: 'MITE Soft Skills – Non-Tech',
        classroom: 'Room 202 (MITE)', topicsCovered: 'Email Etiquette, Professional Writing, and Report Format',
        sessionDate: new Date('2026-06-16'), githubLink: 'https://github.com/arjun/session1',
        assignmentLink: 'https://classroom.github.com/arjun/assignment1',
        trainerId: () => trainers['Arjun Rao']._id,
      },
      // SDMIT – Kavya Bhat
      {
        trainerName: 'Kavya Bhat', college: 'SDMIT',
        assignmentName: 'SDMIT-AUG15-SEPT30-DataScience',
        batchName: 'SDMIT Data Science – Tech',
        classroom: 'Computer Lab (SDMIT)', topicsCovered: 'Data Science Intro: EDA, Descriptive Statistics, Data Cleaning',
        sessionDate: new Date('2026-08-15'), githubLink: 'https://github.com/kavya/session1',
        assignmentLink: 'https://classroom.github.com/kavya/assignment1',
        trainerId: () => trainers['Kavya Bhat']._id,
      },
      {
        trainerName: 'Kavya Bhat', college: 'SDMIT',
        assignmentName: 'SDMIT-AUG15-SEPT30-DataScience',
        batchName: 'SDMIT Data Science – Tech',
        classroom: 'Computer Lab (SDMIT)', topicsCovered: 'ML Algorithms: Linear Regression, Decision Trees, SVM',
        sessionDate: new Date('2026-08-22'), githubLink: 'https://github.com/kavya/session2',
        assignmentLink: 'https://classroom.github.com/kavya/assignment2',
        trainerId: () => trainers['Kavya Bhat']._id,
      },
      {
        trainerName: 'Kavya Bhat', college: 'SDMIT',
        assignmentName: 'SDMIT-AUG15-SEPT30-DataScience',
        batchName: 'SDMIT Data Science – Tech',
        classroom: 'Workshop Room (SDMIT)', topicsCovered: 'Deep Learning Basics: Neural Networks, TensorFlow, Keras',
        sessionDate: new Date('2026-08-29'), githubLink: 'https://github.com/kavya/session3',
        assignmentLink: 'https://classroom.github.com/kavya/assignment3',
        trainerId: () => trainers['Kavya Bhat']._id,
      },
      // SDMIT – Suresh Kumar
      {
        trainerName: 'Suresh Kumar', college: 'SDMIT',
        assignmentName: 'SDMIT-AUG15-SEPT30-DataScience',
        batchName: 'SDMIT Communication – Non-Tech',
        classroom: 'Workshop Room (SDMIT)', topicsCovered: 'Leadership Skills: Decision Making, Conflict Resolution, Team Dynamics',
        sessionDate: new Date('2026-08-16'), githubLink: 'https://github.com/suresh/session1',
        assignmentLink: 'https://classroom.github.com/suresh/assignment1',
        trainerId: () => trainers['Suresh Kumar']._id,
      },
    ];

    let subCreated = 0;
    let subSkipped = 0;
    for (const def of submissionDefs) {
      const trainerId = def.trainerId();
      const existing = await Submission.findOne({
        trainerId,
        sessionDate: def.sessionDate,
      });
      if (!existing) {
        await Submission.create({
          trainerName: def.trainerName,
          college: def.college,
          assignmentName: def.assignmentName,
          batchName: def.batchName,
          classroom: def.classroom,
          topicsCovered: def.topicsCovered,
          sessionDate: def.sessionDate,
          githubLink: def.githubLink,
          assignmentLink: def.assignmentLink,
          trainerId,
          status: 'pending',
        });
        subCreated++;
      } else {
        // Patch assignmentName on old submissions
        if (!existing.assignmentName && def.assignmentName) {
          existing.assignmentName = def.assignmentName;
          await existing.save();
        }
        subSkipped++;
      }
    }
    console.log(`Submissions: ${subCreated} created, ${subSkipped} already existed`);

    // ── Test Student: A AKSHAY ────────────────────────────────────────────────
    // clean_key = lowercase(USN) = 'nnm23cs001'
    const TEST_USN = 'NNM23CS001';
    const TEST_CLEAN_KEY = TEST_USN.toLowerCase(); // 'nnm23cs001'

    let testStudent = await Student.findOne({ usn: TEST_USN });
    if (!testStudent) {
      testStudent = await Student.create({
        name: 'A AKSHAY',
        usn: TEST_USN,
        college: 'Nitte',
        sec: 'A',
        sem: '6',
        branch: 'CSE',
        email: 'akshay@nitte.edu.in',
        cleanKey: TEST_CLEAN_KEY,
        registrationStatus: 'Registered',
        personalEmailId: 'akshay@gmail.com',
        contactNumber: '9876543210',
        formProgrammingLanguage: 'Python',
        toolProgrammingLanguage: 'VS Code',
        questionTitle: 'Arrays & Strings',
        assessmentStatus: 'Completed',
        assignedBatch: 'NITTE Placement Training – Tech',
      });
      console.log(`Created test student: ${testStudent.name} (${testStudent.usn}) clean_key=${TEST_CLEAN_KEY}`);
    } else {
      console.log(`Test student already exists: ${TEST_USN}`);
    }

    // ── Test Attendance Summary: morning1 + afternoon1 ────────────────────────
    const SEED_DATE = '2026-05-13';

    const existingSummary = await sql.query(
      `SELECT id FROM attendance_summary WHERE usn=$1 AND date=$2`,
      [TEST_USN, SEED_DATE]
    );

    if (existingSummary.length === 0) {
      await AttendanceSummary.create({
        studentName: 'A AKSHAY',
        usn: TEST_USN,
        cleanKey: TEST_CLEAN_KEY,
        date: SEED_DATE,
        time: '09:15:00 AM',
        latitude: 13.0732,
        longitude: 74.9892,
        session: 'morning1',
        batchName: 'NITTE Placement Training – Tech',
        college: 'Nitte',
      });

      await AttendanceSummary.create({
        studentName: 'A AKSHAY',
        usn: TEST_USN,
        cleanKey: TEST_CLEAN_KEY,
        date: SEED_DATE,
        time: '01:20:00 PM',
        latitude: 13.0732,
        longitude: 74.9892,
        session: 'afternoon1',
        batchName: 'NITTE Placement Training – Tech',
        college: 'Nitte',
      });

      console.log(`Created attendance summary: morning1 + afternoon1 for ${TEST_USN} on ${SEED_DATE}`);
    } else {
      console.log(`Attendance summary already seeded for ${TEST_USN} on ${SEED_DATE}`);
    }

    console.log('\n✓ Seed complete');
    console.log('─────────────────────────────────────────');
    console.log('Admin logins (password: dlithe2026)');
    console.log('  Super Admin : dlithe@gmail.com');
    console.log('  Nitte Admin : nitte@dlithe.com');
    console.log('  MITE Admin  : mite@dlithe.com');
    console.log('  SDMIT Admin : sdmit@dlithe.com');
    console.log('─────────────────────────────────────────');

    process.exit(0);
  } catch (error) {
    console.error('Seed failed:', error);
    process.exit(1);
  }
};

seed();
