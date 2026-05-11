import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import path from 'path';

dotenv.config({ path: path.join(path.dirname(fileURLToPath(import.meta.url)), '../.env') });

import Batch from '../models/Batch.js';
import Student from '../models/Student.js';

const MOCK_STUDENTS = [
  { name: 'Aarav Sharma',   usn: '4NM22CS001', college: 'NMIT' },
  { name: 'Priya Patel',    usn: '4NM22CS002', college: 'NMIT' },
  { name: 'Rahul Kumar',    usn: '4NM22CS003', college: 'NMIT' },
  { name: 'Sneha Reddy',    usn: '4NM22CS004', college: 'NMIT' },
  { name: 'Arjun Nair',     usn: '4NM22CS005', college: 'NMIT' },
  { name: 'Divya Menon',    usn: '4SD22CS001', college: 'SDMIT' },
  { name: 'Kiran Gowda',    usn: '4SD22CS002', college: 'SDMIT' },
  { name: 'Lakshmi Rao',    usn: '4MI22CS001', college: 'MITE' },
  { name: 'Suresh Babu',    usn: '4MI22CS002', college: 'MITE' },
  { name: 'Meera Iyer',     usn: '4MI22CS003', college: 'MITE' },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('Connected');

  let batch = await Batch.findOne({ name: 'Mock Batch A' });
  if (!batch) {
    batch = await Batch.create({
      name: 'Mock Batch A',
      assignmentName: 'Mock Assignment',
      college: 'NMIT',
      status: 'active',
      type: 'technical',
    });
    console.log('Created batch:', batch.name, batch._id);
  } else {
    console.log('Reusing batch:', batch.name, batch._id);
  }

  for (const s of MOCK_STUDENTS) {
    const exists = await Student.findOne({ usn: s.usn });
    if (!exists) {
      await Student.create({ ...s, batch: batch._id });
      console.log('Created:', s.usn, s.name);
    } else {
      console.log('Skip (exists):', s.usn);
    }
  }

  console.log('Done');
  await mongoose.disconnect();
}

seed().catch((err) => { console.error(err); process.exit(1); });
