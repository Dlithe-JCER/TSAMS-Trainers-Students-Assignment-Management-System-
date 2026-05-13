export interface Trainer {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

export interface Submission {
  id: string;
  trainerName: string;
  githubLink: string;
  batchName: string;
  topicsCovered: string;
  assignmentLink: string;
  sessionDate: string;
  createdAt: string;
}

export const mockTrainers: Trainer[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@trainer.com',
    phone: '1234567890',
    createdAt: '2026-01-15T10:00:00Z',
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@trainer.com',
    phone: '2345678901',
    createdAt: '2026-01-20T10:00:00Z',
  },
  {
    id: '3',
    name: 'Michael Chen',
    email: 'michael.chen@trainer.com',
    phone: '3456789012',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@trainer.com',
    phone: '4567890123',
    createdAt: '2026-02-10T10:00:00Z',
  },
];

export const mockSubmissions: Submission[] = [
  {
    id: '1',
    trainerName: 'John Smith',
    githubLink: 'https://github.com/johnsmith/react-basics',
    batchName: 'Batch 2026-A',
    topicsCovered: 'React fundamentals, Components, Props, State management',
    assignmentLink: 'https://github.com/assignments/react-basics-assignment',
    sessionDate: '2026-03-15',
    createdAt: '2026-03-15T14:30:00Z',
  },
  {
    id: '2',
    trainerName: 'Sarah Johnson',
    githubLink: 'https://github.com/sarahjohnson/nodejs-intro',
    batchName: 'Batch 2026-B',
    topicsCovered: 'Node.js introduction, Express setup, REST APIs',
    assignmentLink: 'https://github.com/assignments/nodejs-api-assignment',
    sessionDate: '2026-03-18',
    createdAt: '2026-03-18T15:00:00Z',
  },
  {
    id: '3',
    trainerName: 'Michael Chen',
    githubLink: 'https://github.com/michaelchen/mongodb-basics',
    batchName: 'Batch 2026-A',
    topicsCovered: 'MongoDB setup, CRUD operations, Schema design',
    assignmentLink: 'https://github.com/assignments/mongodb-assignment',
    sessionDate: '2026-03-20',
    createdAt: '2026-03-20T13:45:00Z',
  },
  {
    id: '4',
    trainerName: 'Emily Davis',
    githubLink: 'https://github.com/emilydavis/react-hooks',
    batchName: 'Batch 2026-C',
    topicsCovered: 'React Hooks, useState, useEffect, Custom hooks',
    assignmentLink: 'https://github.com/assignments/react-hooks-assignment',
    sessionDate: '2026-03-22',
    createdAt: '2026-03-22T16:15:00Z',
  },
  {
    id: '5',
    trainerName: 'John Smith',
    githubLink: 'https://github.com/johnsmith/advanced-react',
    batchName: 'Batch 2026-A',
    topicsCovered: 'Context API, useReducer, Performance optimization',
    assignmentLink: 'https://github.com/assignments/advanced-react-assignment',
    sessionDate: '2026-03-25',
    createdAt: '2026-03-25T14:00:00Z',
  },
  {
    id: '6',
    trainerName: 'Sarah Johnson',
    githubLink: 'https://github.com/sarahjohnson/authentication',
    batchName: 'Batch 2026-B',
    topicsCovered: 'JWT authentication, Password hashing, Authorization',
    assignmentLink: 'https://github.com/assignments/auth-assignment',
    sessionDate: '2026-04-01',
    createdAt: '2026-04-01T15:30:00Z',
  },
  {
    id: '7',
    trainerName: 'Michael Chen',
    githubLink: 'https://github.com/michaelchen/deployment',
    batchName: 'Batch 2026-C',
    topicsCovered: 'Deployment strategies, CI/CD, Environment variables',
    assignmentLink: 'https://github.com/assignments/deployment-assignment',
    sessionDate: '2026-04-05',
    createdAt: '2026-04-05T13:00:00Z',
  },
  {
    id: '8',
    trainerName: 'Emily Davis',
    githubLink: 'https://github.com/emilydavis/testing',
    batchName: 'Batch 2026-A',
    topicsCovered: 'Unit testing, Integration testing, Jest, React Testing Library',
    assignmentLink: 'https://github.com/assignments/testing-assignment',
    sessionDate: '2026-04-08',
    createdAt: '2026-04-08T16:45:00Z',
  },
];
