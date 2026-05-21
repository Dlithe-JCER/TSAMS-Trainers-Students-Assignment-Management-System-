import { neon, neonConfig } from '@neondatabase/serverless';
import { Agent, fetch as undiciFetch } from 'undici';
import dns from 'dns';
import dotenv from 'dotenv';
dotenv.config();

if (!process.env.DATABASE_URL) {
  console.error('ERROR: DATABASE_URL is not set in .env');
  process.exit(1);
}

// System DNS can't resolve .neon.tech — use Google DNS via undici Agent
const _resolver = new dns.Resolver();
_resolver.setServers(['8.8.8.8', '1.1.1.1']);

function neonLookup(hostname, options, callback) {
  if (typeof options === 'function') { callback = options; options = {}; }
  if (!hostname.endsWith('.neon.tech')) {
    return dns.lookup(hostname, options, callback);
  }
  _resolver.resolve4(hostname, (err, addresses) => {
    if (err || !addresses?.length) return dns.lookup(hostname, options, callback);
    if (options?.all) {
      callback(null, addresses.map(address => ({ address, family: 4 })));
    } else {
      callback(null, addresses[0], 4);
    }
  });
}

const _agent = new Agent({ connect: { lookup: neonLookup } });

// Inject custom fetch so neon() HTTP calls use our DNS-aware agent
neonConfig.fetchFunction = (url, opts) =>
  undiciFetch(url, { ...opts, dispatcher: _agent });

// HTTP-based SQL — connects over HTTPS port 443, no TCP 5432 needed
const sql = neon(process.env.DATABASE_URL);

export const initDB = async () => {
  await sql.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto"`);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS batches (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      assignment_name TEXT DEFAULT '',
      college TEXT NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','completed','inactive')),
      type TEXT DEFAULT 'technical' CHECK (type IN ('technical','non-technical')),
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS trainers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      email TEXT,
      phone TEXT NOT NULL,
      college TEXT,
      allotted_college TEXT,
      allotted_programming_language TEXT,
      allotted_level TEXT,
      assignment_name TEXT,
      allotted_batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
      topic_coverage TEXT,
      admin_remark TEXT,
      username TEXT UNIQUE,
      password TEXT,
      verified BOOLEAN DEFAULT false,
      is_active BOOLEAN DEFAULT true,
      role TEXT DEFAULT 'trainer' CHECK (role IN ('trainer','admin','superAdmin')),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS students (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      usn TEXT UNIQUE NOT NULL,
      batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
      college TEXT NOT NULL,
      email TEXT,
      phone TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS classrooms (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      college TEXT NOT NULL,
      assignment_name TEXT,
      name TEXT NOT NULL,
      batch_id UUID REFERENCES batches(id) ON DELETE SET NULL,
      status TEXT DEFAULT 'available' CHECK (status IN ('available','allocated','maintenance')),
      capacity INT DEFAULT 30,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      description TEXT,
      admin_remark TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS assignments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      college TEXT NOT NULL,
      start_date TIMESTAMPTZ,
      end_date TIMESTAMPTZ,
      is_active BOOLEAN DEFAULT true,
      admin_remark TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS submissions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      trainer_id UUID REFERENCES trainers(id) ON DELETE SET NULL,
      trainer_name TEXT NOT NULL,
      college TEXT,
      classroom TEXT,
      assignment_name TEXT,
      batch_name TEXT NOT NULL,
      topics_covered TEXT NOT NULL,
      session_date TIMESTAMPTZ NOT NULL,
      github_link TEXT NOT NULL,
      assignment_link TEXT NOT NULL,
      morning_session1 INT DEFAULT 0,
      morning_session2 INT DEFAULT 0,
      afternoon_session1 INT DEFAULT 0,
      afternoon_session2 INT DEFAULT 0,
      status TEXT DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
      feedback TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS qr_sessions (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      qr_token TEXT UNIQUE NOT NULL,
      batch_id UUID NOT NULL,
      classroom_id UUID,
      generated_at TIMESTAMPTZ DEFAULT NOW(),
      expires_at TIMESTAMPTZ NOT NULL,
      status TEXT DEFAULT 'active' CHECK (status IN ('active','expired','completed')),
      trainer_id UUID,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_id UUID,
      qr_session_id UUID NOT NULL,
      student_name TEXT NOT NULL,
      usn TEXT NOT NULL,
      batch_name TEXT NOT NULL,
      college TEXT NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      attendance_timestamp TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS session_attendance (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_name TEXT NOT NULL,
      usn TEXT NOT NULL,
      batch_id UUID,
      batch_name TEXT NOT NULL,
      college TEXT NOT NULL,
      session TEXT NOT NULL CHECK (session IN ('morning1','morning2','afternoon1','afternoon2')),
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      submitted_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS toc_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      college TEXT NOT NULL,
      assignment_name TEXT NOT NULL,
      title TEXT NOT NULL,
      level TEXT NOT NULL,
      file_name TEXT NOT NULL,
      file_path TEXT NOT NULL,
      file_url TEXT NOT NULL,
      uploaded_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS daily_logs (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      date TEXT NOT NULL,
      batch_id UUID,
      batch_name TEXT NOT NULL,
      college TEXT DEFAULT '',
      sessions JSONB DEFAULT '[]'::jsonb,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS session_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
      session TEXT NOT NULL CHECK (session IN ('morning1','morning2','afternoon1','afternoon2')),
      batch_id UUID,
      batch_name TEXT NOT NULL,
      college TEXT DEFAULT '',
      date TEXT NOT NULL,
      expires_at TIMESTAMPTZ NOT NULL,
      submit_until TIMESTAMPTZ NOT NULL,
      used_ips TEXT[] DEFAULT '{}',
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS colleges (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      name TEXT NOT NULL,
      code TEXT UNIQUE NOT NULL,
      department TEXT,
      location TEXT,
      is_active BOOLEAN DEFAULT true,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Add assigned_toc_id to trainers if not already present (idempotent migration)
  await sql.query(`
    ALTER TABLE trainers ADD COLUMN IF NOT EXISTS assigned_toc_id UUID REFERENCES toc_documents(id) ON DELETE SET NULL
  `);

  // Add type column to batches if not already present (idempotent migration)
  await sql.query(`ALTER TABLE batches ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'technical'`);
  // Backfill NULL types on rows created before the column existed
  await sql.query(`UPDATE batches SET type = 'technical' WHERE type IS NULL`);

  // Normalize legacy college values in batches to match college codes (idempotent)
  await sql.query(`UPDATE batches SET college = 'NMAMIT-NITTE-ENG' WHERE college = 'NMAMIT-NITTE'`);
  await sql.query(`UPDATE batches SET college = 'NMAMIT-NITTE-MCA' WHERE college = 'NMAMIT-MCA'`);

  await sql.query(`
    CREATE TABLE IF NOT EXISTS attendance_summary (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      student_name TEXT NOT NULL,
      usn TEXT NOT NULL,
      clean_key TEXT NOT NULL,
      date TEXT NOT NULL,
      time TEXT NOT NULL,
      latitude DOUBLE PRECISION,
      longitude DOUBLE PRECISION,
      session TEXT,
      batch_name TEXT,
      college TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Extend students table with new fields (idempotent)
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS sec TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS sem TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS branch TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS clean_key TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS registration_status TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS personal_email_id TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS contact_number TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS form_programming_language TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS tool_programming_language TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS question_title TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS assessment_status TEXT`);
  await sql.query(`ALTER TABLE students ADD COLUMN IF NOT EXISTS assigned_batch TEXT`);

  console.log('Database schema initialized');
};

const connectDB = async () => {
  try {
    await initDB();
    console.log('Neon PostgreSQL connected successfully');
  } catch (error) {
    console.error('Neon PostgreSQL connection failed:');
    console.error('  code   :', error.code);
    console.error('  message:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
};

export { sql };
export default connectDB;
