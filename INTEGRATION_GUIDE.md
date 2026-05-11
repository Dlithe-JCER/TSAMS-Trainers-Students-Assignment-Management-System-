# Frontend Integration Guide

This guide explains how to update your React frontend to use the new Express + MongoDB backend instead of mock data.

## Step 1: Update Vite Configuration

Add the API URL to your `.env.development` file:

```
VITE_API_URL=http://localhost:5000/api
```

## Step 2: Update Frontend Components

### Example 1: Trainer Management Page

**Before (using mockData):**
```javascript
import { mockTrainers } from '@/app/data/mockData';

export default function TrainerManagement() {
  const [trainers, setTrainers] = useState(mockTrainers);
  
  // ...
}
```

**After (using API):**
```javascript
import { trainerAPI } from '@/services/api';

export default function TrainerManagement() {
  const [trainers, setTrainers] = useState([]);
  
  useEffect(() => {
    const fetchTrainers = async () => {
      try {
        const data = await trainerAPI.getAll();
        setTrainers(data);
      } catch (error) {
        console.error('Failed to fetch trainers:', error);
      }
    };
    
    fetchTrainers();
  }, []);
  
  // ...
}
```

### Example 2: Submissions Page

**Before (using mockData):**
```javascript
import { mockSubmissions } from '@/app/data/mockData';

export default function TrainerSubmission() {
  const [submissions, setSubmissions] = useState(mockSubmissions);
  
  // ...
}
```

**After (using API):**
```javascript
import { submissionAPI } from '@/services/api';

export default function TrainerSubmission() {
  const [submissions, setSubmissions] = useState([]);
  
  useEffect(() => {
    const fetchSubmissions = async () => {
      try {
        const data = await submissionAPI.getAll();
        setSubmissions(data);
      } catch (error) {
        console.error('Failed to fetch submissions:', error);
      }
    };
    
    fetchSubmissions();
  }, []);
  
  // ...
}
```

### Example 3: Creating a New Submission

```javascript
import { submissionAPI } from '@/services/api';

export default function SubmissionForm() {
  const [formData, setFormData] = useState({
    batchName: '',
    topicsCovered: '',
    sessionDate: '',
    githubLink: '',
    assignmentLink: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await submissionAPI.create(formData);
      console.log('Submission created:', response.submission);
      // Reset form
      setFormData({...});
    } catch (error) {
      console.error('Failed to create submission:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      {/* Form fields */}
    </form>
  );
}
```

### Example 4: Login/Authentication

```javascript
import { trainerAPI } from '@/services/api';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await trainerAPI.login(email, password);
      console.log('Login successful:', response.trainer);
      // Redirect to dashboard
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Login fields */}
    </form>
  );
}
```

## Step 3: Setup Backend

1. Install backend dependencies:
```bash
cd backend
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection:
```env
MONGODB_URI=mongodb://localhost:27017/trainer-management
JWT_SECRET=your_secure_key_here
PORT=5000
CORS_ORIGIN=http://localhost:5173
```

4. Start the backend:
```bash
npm run dev
```

## Step 4: Run Frontend & Backend Together

### Terminal 1 - Backend:
```bash
cd backend
npm run dev
```

### Terminal 2 - Frontend:
```bash
npm run dev
```

Your frontend will run on `http://localhost:5173` and backend on `http://localhost:5000`

## API Response Examples

### Successful Response:
```json
{
  "message": "Success message",
  "trainer": {
    "id": "xyz123",
    "name": "John Smith",
    "email": "john@example.com"
  },
  "token": "jwt_token_here"
}
```

### Error Response:
```json
{
  "message": "Error message",
  "errors": [
    {
      "field": "email",
      "message": "Invalid email"
    }
  ]
}
```

## Common Tasks

### Check if User is Logged In
```javascript
import { authAPI } from '@/services/api';

if (authAPI.isAuthenticated()) {
  // User is logged in
}
```

### Logout
```javascript
import { authAPI } from '@/services/api';

const handleLogout = () => {
  authAPI.logout();
  navigate('/login');
};
```

### Update User Context with Login Data
```javascript
import { useAuth } from '@/app/context/AuthContext';
import { trainerAPI } from '@/services/api';

export default function AdminLogin() {
  const { setUser } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const response = await trainerAPI.login(email, password);
      setUser(response.trainer);
      navigate('/admin/dashboard');
    } catch (error) {
      console.error('Login failed:', error);
    }
  };
  
  // ...
}
```

## Database Setup with MongoDB

### Option 1: Local MongoDB
```bash
# Install MongoDB from https://www.mongodb.com/try/download/community

# Start MongoDB service
mongod

# Connection string
MONGODB_URI=mongodb://localhost:27017/trainer-management
```

### Option 2: MongoDB Atlas (Cloud)
1. Create account at https://www.mongodb.com/cloud/atlas
2. Create a cluster
3. Get connection string: `mongodb+srv://user:password@cluster.mongodb.net/trainer-management`

## Troubleshooting

### CORS Error
Make sure your `.env` has correct `CORS_ORIGIN`:
```env
CORS_ORIGIN=http://localhost:5173
```

### 401 Unauthorized
Check if token is saved in localStorage after login:
```javascript
console.log(localStorage.getItem('token'));
```

### MongoDB Connection Error
Verify MongoDB is running and connection string is correct in `.env`

## Next Steps

1. Update all components to use the API
2. Add error handling and loading states
3. Implement pagination for large datasets
4. Add more validation
5. Setup production deployment

