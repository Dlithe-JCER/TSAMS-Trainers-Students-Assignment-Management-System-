// API configuration and utility functions for frontend

const API_BASE_URL = import.meta.env.VITE_API_URL;

// Get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Set token in localStorage
const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Clear token from localStorage
const clearToken = () => {
  localStorage.removeItem('token');
};

// Default headers with auth token
const getHeaders = () => {
  const token = getToken();
  return {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
  };
};

// API request wrapper
const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  const config = {
    ...options,
    headers: {
      ...getHeaders(),
      ...options.headers,
    },
  };

  try {
    const response = await fetch(url, config);
    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message || 'API request failed');
    }

    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};

// ============ Trainer APIs ============

export const trainerAPI = {
  // Register
  register: async (name, phone, email, username, password, allottedCollege, allottedProgrammingLanguage, allottedLevel) => {
    const data = await apiRequest('/trainers/register', {
      method: 'POST',
      body: JSON.stringify({ name, phone, email, username, password, allottedCollege, allottedProgrammingLanguage, allottedLevel }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Login
  login: async (username, password) => {
    const data = await apiRequest('/trainers/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  // Get all trainers (Admin)
  getAll: async () => {
    return apiRequest('/trainers');
  },

  // Get by ID
  getById: async (id) => {
    return apiRequest(`/trainers/${id}`);
  },

  // Update profile
  update: async (id, updates) => {
    return apiRequest(`/trainers/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Delete
  delete: async (id) => {
    return apiRequest(`/trainers/${id}`, {
      method: 'DELETE',
    });
  },

  // Logout
  logout: () => {
    clearToken();
  },
};

// ============ Submission APIs ============

export const submissionAPI = {
  // Create submission
  create: async (submissionData) => {
    return apiRequest('/submissions', {
      method: 'POST',
      body: JSON.stringify(submissionData),
    });
  },

  // Get all submissions (Admin)
  getAll: async () => {
    return apiRequest('/submissions');
  },

  // Get by trainer ID
  getByTrainer: async (trainerId) => {
    return apiRequest(`/submissions/trainer/${trainerId}`);
  },

  // Get by ID
  getById: async (id) => {
    return apiRequest(`/submissions/${id}`);
  },

  // Update submission
  update: async (id, updates) => {
    return apiRequest(`/submissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(updates),
    });
  },

  // Review submission (Admin)
  review: async (id, status, feedback) => {
    return apiRequest(`/submissions/${id}/review`, {
      method: 'PUT',
      body: JSON.stringify({ status, feedback }),
    });
  },

  // Delete submission
  delete: async (id) => {
    return apiRequest(`/submissions/${id}`, {
      method: 'DELETE',
    });
  },
};

// ============ Auth utilities ============

export const authAPI = {
  getToken,
  setToken,
  clearToken,
  isAuthenticated: () => !!getToken(),
};

export default {
  trainerAPI,
  submissionAPI,
  authAPI,
};
