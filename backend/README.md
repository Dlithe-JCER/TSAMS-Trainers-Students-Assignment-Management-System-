# Trainer Management Backend

Express.js + MongoDB Backend for Trainer Management Portal

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud connection string)
- npm or yarn

## Installation

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the backend directory (copy from `.env.example`):
```bash
cp .env.example .env
```

3. Update the `.env` file with your MongoDB connection string and JWT secret:
```env
MONGODB_URI=mongodb://localhost:27017/trainer-management
JWT_SECRET=your_secure_secret_key_here
PORT=5000
```

## Running the Server

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication & Trainers
- `POST /api/trainers/register` - Register a new trainer
- `POST /api/trainers/login` - Login trainer
- `GET /api/trainers` - Get all trainers (Admin only)
- `GET /api/trainers/:id` - Get trainer by ID
- `PUT /api/trainers/:id` - Update trainer profile
- `DELETE /api/trainers/:id` - Delete trainer (Admin only)

### Submissions
- `POST /api/submissions` - Create new submission
- `GET /api/submissions` - Get all submissions (Admin only)
- `GET /api/submissions/trainer/:trainerId` - Get submissions by trainer
- `GET /api/submissions/:id` - Get single submission
- `PUT /api/submissions/:id` - Update submission
- `PUT /api/submissions/:id/review` - Review submission (Admin only)
- `DELETE /api/submissions/:id` - Delete submission

## Authentication

Include JWT token in request headers:
```
Authorization: Bearer <token>
```

## Database Models

### Trainer
```javascript
{
  name: String,
  email: String (unique),
  phone: String,
  password: String (hashed),
  verified: Boolean,
  isActive: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Submission
```javascript
{
  trainerId: ObjectId (ref: Trainer),
  trainerName: String,
  batchName: String,
  topicsCovered: String,
  sessionDate: Date,
  githubLink: String,
  assignmentLink: String,
  status: String (pending, approved, rejected),
  feedback: String,
  createdAt: Date,
  updatedAt: Date
}
```

## Project Structure

```
backend/
├── config/
│   └── db.js                 # MongoDB connection
├── models/
│   ├── Trainer.js           # Trainer schema
│   └── Submission.js        # Submission schema
├── routes/
│   ├── trainers.js          # Trainer routes
│   └── submissions.js       # Submission routes
├── middleware/
│   └── auth.js              # Authentication middleware
├── server.js                # Main server file
├── package.json
├── .env.example
└── .env                     # (Create this file)
```

## Dependencies

- **express** - Web framework
- **mongoose** - MongoDB ODM
- **cors** - Cross-origin resource sharing
- **dotenv** - Environment variables
- **bcryptjs** - Password hashing
- **jsonwebtoken** - JWT authentication
- **express-validator** - Input validation

## Development Dependencies

- **nodemon** - Auto-reload during development

## Notes

- Always hash passwords before storing (handled by bcryptjs)
- JWT tokens expire in 7 days
- Implement input validation on all endpoints
- Use environment variables for sensitive data
- Never commit `.env` file to version control
