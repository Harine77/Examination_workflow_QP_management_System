require('dotenv').config();
const sequelize = require('../config/database');
const Course = require('../models/Course');
const CourseOutcome = require('../models/CourseOutcome');

const COURSES = [
  {
    courseCode: 'UIT2601', courseName: 'Data Structures and Algorithms', semester: 3,
    syllabus: 'Arrays, Linked Lists, Stacks, Queues, Trees, Graphs, Sorting, Searching, Hashing',
    outcomes: [
      { coNumber: 'CO1', description: 'Understand linear and non-linear data structures', keywords: ['array', 'linked list', 'stack', 'queue'] },
      { coNumber: 'CO2', description: 'Apply sorting and searching algorithms', keywords: ['sorting', 'searching', 'binary search', 'quicksort', 'mergesort'] },
      { coNumber: 'CO3', description: 'Analyze graph algorithms and tree traversals', keywords: ['graph', 'tree', 'bfs', 'dfs', 'spanning tree'] },
    ]
  },
  {
    courseCode: 'UIT2602', courseName: 'Database Management Systems', semester: 4,
    syllabus: 'ER Model, Relational Algebra, SQL, Normalization, Transactions, Indexing, NoSQL',
    outcomes: [
      { coNumber: 'CO1', description: 'Design relational databases using ER model', keywords: ['er model', 'entity', 'relationship', 'schema'] },
      { coNumber: 'CO2', description: 'Write SQL queries for data manipulation', keywords: ['sql', 'select', 'join', 'aggregate', 'ddl', 'dml'] },
      { coNumber: 'CO3', description: 'Apply normalization and transaction management', keywords: ['normalization', 'transaction', 'acid', 'indexing', 'concurrency'] },
    ]
  },
  {
    courseCode: 'UIT2603', courseName: 'Operating Systems', semester: 4,
    syllabus: 'Process Management, Scheduling, Memory Management, File Systems, Deadlocks, Synchronization',
    outcomes: [
      { coNumber: 'CO1', description: 'Understand process management and CPU scheduling', keywords: ['process', 'thread', 'scheduling', 'fcfs', 'sjf', 'round robin'] },
      { coNumber: 'CO2', description: 'Apply memory management techniques', keywords: ['paging', 'segmentation', 'virtual memory', 'page fault', 'thrashing'] },
      { coNumber: 'CO3', description: 'Analyze deadlock and synchronization problems', keywords: ['deadlock', 'semaphore', 'mutex', 'synchronization', 'banker algorithm'] },
    ]
  },
  {
    courseCode: 'UIT2604', courseName: 'Computer Networks', semester: 5,
    syllabus: 'OSI Model, TCP/IP, Routing, Switching, DNS, HTTP, Security, Wireless Networks',
    outcomes: [
      { coNumber: 'CO1', description: 'Understand network layers and protocols', keywords: ['osi', 'tcp', 'ip', 'udp', 'http', 'dns', 'protocol'] },
      { coNumber: 'CO2', description: 'Apply routing and switching concepts', keywords: ['routing', 'switching', 'router', 'switch', 'rip', 'ospf', 'bgp'] },
      { coNumber: 'CO3', description: 'Analyze network security mechanisms', keywords: ['security', 'encryption', 'ssl', 'tls', 'firewall', 'vpn'] },
    ]
  },
  {
    courseCode: 'UIT2605', courseName: 'Software Engineering', semester: 5,
    syllabus: 'SDLC, Agile, Requirements, Design Patterns, Testing, Project Management, DevOps',
    outcomes: [
      { coNumber: 'CO1', description: 'Apply software development life cycle models', keywords: ['sdlc', 'waterfall', 'agile', 'scrum', 'spiral'] },
      { coNumber: 'CO2', description: 'Design software using design patterns', keywords: ['design pattern', 'uml', 'class diagram', 'use case', 'architecture'] },
      { coNumber: 'CO3', description: 'Implement software testing strategies', keywords: ['testing', 'unit test', 'integration test', 'black box', 'white box'] },
    ]
  },
  {
    courseCode: 'UIT2606', courseName: 'Machine Learning', semester: 6,
    syllabus: 'Supervised Learning, Unsupervised Learning, Neural Networks, Deep Learning, NLP, Computer Vision',
    outcomes: [
      { coNumber: 'CO1', description: 'Apply supervised and unsupervised learning algorithms', keywords: ['regression', 'classification', 'clustering', 'svm', 'decision tree', 'random forest'] },
      { coNumber: 'CO2', description: 'Design neural networks for pattern recognition', keywords: ['neural network', 'deep learning', 'cnn', 'rnn', 'backpropagation'] },
      { coNumber: 'CO3', description: 'Evaluate ML models using performance metrics', keywords: ['accuracy', 'precision', 'recall', 'f1 score', 'cross validation', 'overfitting'] },
    ]
  },
  {
    courseCode: 'UIT2607', courseName: 'Web Technologies', semester: 3,
    syllabus: 'HTML, CSS, JavaScript, React, Node.js, REST APIs, Databases, Deployment',
    outcomes: [
      { coNumber: 'CO1', description: 'Build responsive web interfaces using HTML/CSS/JS', keywords: ['html', 'css', 'javascript', 'responsive', 'bootstrap'] },
      { coNumber: 'CO2', description: 'Develop full-stack web applications', keywords: ['react', 'node', 'express', 'rest api', 'json', 'ajax'] },
      { coNumber: 'CO3', description: 'Deploy and manage web applications', keywords: ['deployment', 'docker', 'cloud', 'database', 'authentication'] },
    ]
  },
  {
    courseCode: 'UIT2608', courseName: 'Theory of Computation', semester: 4,
    syllabus: 'Automata, Regular Languages, Context-Free Grammars, Turing Machines, Complexity',
    outcomes: [
      { coNumber: 'CO1', description: 'Design finite automata and regular expressions', keywords: ['automata', 'dfa', 'nfa', 'regular expression', 'regular language'] },
      { coNumber: 'CO2', description: 'Construct context-free grammars and pushdown automata', keywords: ['cfg', 'pda', 'context free', 'parse tree', 'chomsky'] },
      { coNumber: 'CO3', description: 'Analyze Turing machines and computational complexity', keywords: ['turing machine', 'decidability', 'np complete', 'complexity', 'halting problem'] },
    ]
  },
];

async function seed() {
  try {
    await sequelize.authenticate();
    console.log('Connected to DB');

    for (const c of COURSES) {
      const existing = await Course.findOne({ where: { courseCode: c.courseCode } });
      if (existing) {
        console.log(`Skipping ${c.courseCode} — already exists`);
        continue;
      }
      const course = await Course.create({
        courseCode: c.courseCode,
        courseName: c.courseName,
        semester: c.semester,
        syllabus: c.syllabus,
      });
      await CourseOutcome.bulkCreate(c.outcomes.map(o => ({ ...o, CourseId: course.id })));
      console.log(`✅ Added ${c.courseCode} — ${c.courseName}`);
    }

    console.log('Done!');
    process.exit(0);
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

seed();
