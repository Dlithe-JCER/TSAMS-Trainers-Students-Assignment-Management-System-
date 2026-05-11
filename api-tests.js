// ===== API Testing Examples =====
// Use this file to test your backend API endpoints
// Copy individual functions and use in Postman or your API testing tool

const API_URL = 'http://localhost:5000/api';

// Store token globally for testing
let testToken = '';

// ===== TRAINER ENDPOINTS =====

// 1. Register Trainer
async function registerTrainer() {
  const response = await fetch(`${API_URL}/trainers/register`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: 'John Smith',
      email: 'john@example.com',
      phone: '1234567890',
      password: 'password123',
    }),
  });
  const data = await response.json();
  if (data.token) {
    testToken = data.token;
    console.log('✅ Registration successful');
    console.log('Token:', testToken);
  }
  return data;
}

// 2. Login Trainer
async function loginTrainer() {
  const response = await fetch(`${API_URL}/trainers/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: 'john@example.com',
      password: 'password123',
    }),
  });
  const data = await response.json();
  if (data.token) {
    testToken = data.token;
    console.log('✅ Login successful');
    console.log('Token:', testToken);
  }
  return data;
}

// 3. Get All Trainers (Admin only)
async function getAllTrainers(token) {
  const response = await fetch(`${API_URL}/trainers`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}

// 4. Get Trainer by ID
async function getTrainerById(trainerId, token) {
  const response = await fetch(`${API_URL}/trainers/${trainerId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}

// 5. Update Trainer Profile
async function updateTrainer(trainerId, updates, token) {
  const response = await fetch(`${API_URL}/trainers/${trainerId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  return response.json();
}

// 6. Delete Trainer (Admin only)
async function deleteTrainer(trainerId, token) {
  const response = await fetch(`${API_URL}/trainers/${trainerId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}

// ===== SUBMISSION ENDPOINTS =====

// 7. Create Submission
async function createSubmission(submissionData, token) {
  const response = await fetch(`${API_URL}/submissions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(submissionData),
  });
  return response.json();
}

// Example submission data
const exampleSubmission = {
  batchName: 'Batch 2024-A',
  topicsCovered: 'React fundamentals, Component lifecycle, Hooks',
  sessionDate: '2024-04-15',
  githubLink: 'https://github.com/johnsmith/react-basics',
  assignmentLink: 'https://github.com/assignments/react-basics-assignment',
};

// 8. Get All Submissions (Admin only)
async function getAllSubmissions(token) {
  const response = await fetch(`${API_URL}/submissions`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}

// 9. Get Submissions by Trainer
async function getSubmissionsByTrainer(trainerId, token) {
  const response = await fetch(`${API_URL}/submissions/trainer/${trainerId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}

// 10. Get Single Submission
async function getSubmissionById(submissionId, token) {
  const response = await fetch(`${API_URL}/submissions/${submissionId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}

// 11. Update Submission
async function updateSubmission(submissionId, updates, token) {
  const response = await fetch(`${API_URL}/submissions/${submissionId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify(updates),
  });
  return response.json();
}

// 12. Review Submission (Admin only)
async function reviewSubmission(submissionId, status, feedback, token) {
  const response = await fetch(`${API_URL}/submissions/${submissionId}/review`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({
      status: status, // 'approved' or 'rejected'
      feedback: feedback,
    }),
  });
  return response.json();
}

// 13. Delete Submission
async function deleteSubmission(submissionId, token) {
  const response = await fetch(`${API_URL}/submissions/${submissionId}`, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
  });
  return response.json();
}

// ===== TEST WORKFLOW =====
// This demonstrates a complete workflow

async function testCompleteWorkflow() {
  console.log('🚀 Starting API Test Workflow...\n');

  try {
    // Step 1: Register
    console.log('Step 1: Registering trainer...');
    const registerResult = await registerTrainer();
    console.log(registerResult);
    console.log('');

    const token = testToken;

    // Step 2: Create submission
    console.log('Step 2: Creating submission...');
    const createResult = await createSubmission(exampleSubmission, token);
    console.log(createResult);
    const submissionId = createResult.submission?._id;
    console.log('');

    // Step 3: Get submission
    if (submissionId) {
      console.log('Step 3: Fetching submission...');
      const getResult = await getSubmissionById(submissionId, token);
      console.log(getResult);
      console.log('');
    }

    // Step 4: Update submission
    if (submissionId) {
      console.log('Step 4: Updating submission...');
      const updateResult = await updateSubmission(
        submissionId,
        {
          topicsCovered: 'React, JavaScript, TypeScript',
        },
        token
      );
      console.log(updateResult);
      console.log('');
    }

    console.log('✅ Workflow Complete!');
  } catch (error) {
    console.error('❌ Error:', error);
  }
}

// ===== TIP: Run in Browser Console =====
// 1. Go to http://localhost:5173 (your frontend)
// 2. Open Developer Tools (F12)
// 3. Go to Console tab
// 4. Copy and paste the functions above
// 5. Call: testCompleteWorkflow()

// ===== OR: Use in Node.js =====
// node api-tests.js

export {
  registerTrainer,
  loginTrainer,
  getAllTrainers,
  getTrainerById,
  updateTrainer,
  deleteTrainer,
  createSubmission,
  getAllSubmissions,
  getSubmissionsByTrainer,
  getSubmissionById,
  updateSubmission,
  reviewSubmission,
  deleteSubmission,
  testCompleteWorkflow,
};
