# Backend Setup Guide - Complete Instructions

## 📋 Table of Contents
1. [Prerequisites](#prerequisites)
2. [Project Structure](#project-structure)
3. [Installation Steps](#installation-steps)
4. [MongoDB Setup](#mongodb-setup)
5. [Running the Server](#running-the-server)
6. [Testing the API](#testing-the-api)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

- **Node.js** v14.0.0 or higher ([Download](https://nodejs.org/))
- **npm** v6.0.0 or higher (comes with Node.js)
- **MongoDB** (local or cloud) ([Download local](https://www.mongodb.com/try/download/community))

### Verify Installation

Open Command Prompt/PowerShell and run:

```powershell
node --version
npm --version
```

---

## Project Structure

Your project now has this structure:

```
Trainer Management Portal SRS/
├── src/                          # React frontend
│   ├── app/
│   ├── services/
│   │   └── api.js               # NEW: API client
│   └── ...
├── backend/                      # NEW: Express backend
│   ├── config/
│   │   └── db.js               # MongoDB connection
│   ├── models/
│   │   ├── Trainer.js          # Trainer schema
│   │   └── Submission.js       # Submission schema
│   ├── routes/
│   │   ├── trainers.js         # Trainer endpoints
│   │   └── submissions.js      # Submission endpoints
│   ├── middleware/
│   │   └── auth.js             # JWT authentication
│   ├── server.js               # Main server file
│   ├── package.json
│   ├── .env.example
│   ├── .env                    # Create this file
│   ├── .gitignore
│   ├── README.md
│   ├── setup.bat               # Windows setup
│   └── setup.sh                # Linux/Mac setup
├── INTEGRATION_GUIDE.md        # NEW: Frontend integration guide
├── package.json
└── ...
```

---

## Installation Steps

### Step 1: Install Backend Dependencies

Open Command Prompt/PowerShell and navigate to the backend directory:

```powershell
cd "path\to\Trainer Management Portal SRS\backend"
npm install
```

This will install all required packages:
- express (web framework)
- mongoose (MongoDB ODM)
- cors (cross-origin support)
- bcryptjs (password encryption)
- jsonwebtoken (JWT auth)
- express-validator (input validation)
- nodemon (auto-reload in dev mode)

### Step 2: Setup Environment Variables

1. Navigate to the `backend` folder
2. Copy `.env.example` to `.env`:
   ```powershell
   copy .env.example .env
   ```

3. Open `.env` file and update values:
   ```env
   MONGODB_URI=mongodb://localhost:27017/trainer-management
   PORT=5000
   NODE_ENV=development
   JWT_SECRET=your_super_secret_key_here_change_in_production
   CORS_ORIGIN=http://localhost:5173
   ```

### Step 3: Setup Frontend Environment Variables

In the root directory, create or update `.env.development`:

```env
VITE_API_URL=http://localhost:5000/api
```

---

## MongoDB Setup

### Option 1: Local MongoDB (Recommended for Development)

#### Windows:
1. Download MongoDB Community Edition from: https://www.mongodb.com/try/download/community
2. Run the installer and follow the setup wizard
3. MongoDB will be installed as a Windows service and start automatically
4. Default connection: `mongodb://localhost:27017`

#### Verify Installation:
```powershell
mongosh
# You should see a prompt like: test>
```

To exit: Type `exit` and press Enter

### Option 2: MongoDB Atlas (Cloud - No Installation Required)

1. Visit https://www.mongodb.com/cloud/atlas
2. Create a free account
3. Create a new project and cluster
4. Get your connection string (example):
   ```
   mongodb+srv://username:password@cluster.mongodb.net/trainer-management
   ```
5. Update `MONGODB_URI` in `.env` with this connection string

---

## Running the Server

### Development Mode (Recommended)

Open Command Prompt/PowerShell in the backend directory:

```powershell
npm run dev
```

You should see:
```
Server is running on port 5000
MongoDB connected successfully
```

### Production Mode

```powershell
npm start
```

### Running Both Frontend and Backend

**Terminal 1 (Backend):**
```powershell
cd backend
npm run dev
```

**Terminal 2 (Frontend):**
```powershell
npm run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:5000

---

## Testing the API

### Using Postman

1. Download Postman: https://www.postman.com/downloads/
2. Create new requests:

#### Test 1: Health Check
- **Method:** GET
- **URL:** `http://localhost:5000/api/health`
- **Response:** `{ "message": "Server is running" }`

#### Test 2: Register Trainer
- **Method:** POST
- **URL:** `http://localhost:5000/api/trainers/register`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "name": "John Smith",
    "email": "john@example.com",
    "phone": "1234567890",
    "password": "password123"
  }
  ```
- **Response:** Returns token and trainer data

#### Test 3: Login
- **Method:** POST
- **URL:** `http://localhost:5000/api/trainers/login`
- **Headers:** `Content-Type: application/json`
- **Body:**
  ```json
  {
    "email": "john@example.com",
    "password": "password123"
  }
  ```

#### Test 4: Create Submission
- **Method:** POST
- **URL:** `http://localhost:5000/api/submissions`
- **Headers:**
  ```
  Content-Type: application/json
  Authorization: Bearer <your_token_from_login>
  ```
- **Body:**
  ```json
  {
    "batchName": "Batch 2024-A",
    "topicsCovered": "React, JavaScript",
    "sessionDate": "2024-04-15",
    "githubLink": "https://github.com/example/repo",
    "assignmentLink": "https://github.com/example/assignment"
  }
  ```

### Using cURL (Command Line)

```powershell
# Health check
curl http://localhost:5000/api/health

# Register
curl -X POST http://localhost:5000/api/trainers/register `
  -H "Content-Type: application/json" `
  -d '{"name":"John Smith","email":"john@example.com","phone":"1234567890","password":"password123"}'
```

---

## Troubleshooting

### Error: "Cannot find module 'express'"
**Solution:** Run `npm install` in the backend directory

### Error: "ECONNREFUSED: Connection refused"
**Solution:** Make sure MongoDB is running:
```powershell
# Check if MongoDB service is running
Get-Service MongoDB
# If not running, start it
Start-Service MongoDB
```

### Error: "MongoServerError: connect ECONNREFUSED"
**Solution:** Check your `MONGODB_URI` in `.env` file. Common issues:
- MongoDB not running
- Wrong connection string
- Wrong port (default is 27017)

### Error: "JsonWebTokenError: invalid token"
**Solution:** Make sure to:
1. Copy the token from login response
2. Include it exactly in Authorization header: `Bearer <token>`
3. Don't modify the token

### Mixed Frontend and Backend Issues
**Solution:** Check:
1. Backend running on port 5000
2. Frontend running on port 5173
3. `VITE_API_URL=http://localhost:5000/api` in frontend `.env`
4. `CORS_ORIGIN=http://localhost:5173` in backend `.env`

### "Port 5000 already in use"
**Solution:** Change `PORT` in `.env` to another port (e.g., 5001):
```env
PORT=5001
```

---

## Quick Start Summary

```powershell
# 1. Navigate to backend
cd backend

# 2. Install dependencies
npm install

# 3. Create .env (copy from .env.example and update)
copy .env.example .env

# 4. Make sure MongoDB is running

# 5. Start backend
npm run dev

# 6. In another terminal, start frontend (in root directory)
npm run dev
```

---

## Next Steps

1. ✅ Backend setup complete!
2. 📖 Read [INTEGRATION_GUIDE.md](../INTEGRATION_GUIDE.md) to update frontend components
3. 🧪 Test API endpoints with Postman
4. 🔗 Update frontend pages to use API instead of mock data
5. 🚀 Deploy to production when ready

---

## Support Files

- `.env.example` - Template for environment variables
- `package.json` - Dependencies and scripts
- `README.md` - Backend documentation
- `setup.bat` - Automated Windows setup
- `setup.sh` - Automated Linux/Mac setup

---

## Security Notes

⚠️ **Important for Production:**

1. Change `JWT_SECRET` to a secure random string
2. Do NOT commit `.env` to version control
3. Use strong MongoDB passwords
4. Enable MongoDB authentication
5. Use HTTPS for production
6. Validate all inputs on both frontend and backend
7. Implement rate limiting for API endpoints
8. Add logging and monitoring

---

## Common Commands

```powershell
# Install packages
npm install

# Start development server (with auto-reload)
npm run dev

# Start production server
npm start

# View logs
npm run dev 2>&1 | tee logs.txt
```

---

**You're all set! 🎉**

If you encounter any issues, check the Troubleshooting section or refer to the backend README.md for more details.
