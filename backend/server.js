const express = require('express');
const cors = require('cors');
require('dotenv').config();


const sequelize = require('./config/database');
const Course = require('./models/Course');
const CourseOutcome = require('./models/CourseOutcome');
const BloomKeyword = require('./models/BloomKeyword');
const QuestionPaper = require('./models/QuestionPaper');
const Question = require('./models/Question');

const courseRoutes = require('./routes/courseRoutes');
const questionRoutes = require('./routes/questionRoutes');
const pdfRoutes = require('./routes/pdfRoutes');

const app = express();
app.use(express.json()); 

// Middleware
app.use(cors());
app.use(express.json());app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/courses', courseRoutes);
app.use('/api/questions', questionRoutes);
app.use('/api/pdf', pdfRoutes);
// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CO/KL Mapper API is running',
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5000;

// Start server and seed data
const startServer = async () => {
  try {
    // Connect to database
    await sequelize.authenticate();
    console.log('✅ Database connected');
    
    // Sync models (create tables)
    await sequelize.sync({ force: false });
    console.log('✅ Database models synced');
    
    // Seed sample data
    await seedSampleData();
    
    // Start listening
    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
      console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    });
    
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

// Seed sample data function
async function seedSampleData() {
  try {
    const courseCount = await Course.count();
    
    if (courseCount > 0) {
      console.log('✅ Sample data already exists');
      return;
    }
    
    console.log('📝 Seeding sample data...');
    
    // Create AI course
    const aiCourse = await Course.create({
      courseCode: 'UIT2504',
      courseName: 'Artificial Intelligence',
      semester: 5,
      syllabus: 'Introduction to AI, Intelligent Agents, Search Algorithms, Game Playing, Logic'
    });
    
    // Create Course Outcomes
    await CourseOutcome.bulkCreate([
      {
        CourseId: aiCourse.id,
        coNumber: 'CO1',
        description: 'Understand the foundations of artificial intelligence (AI) and autonomous agents',
        keywords: ['intelligent agents', 'agent', 'environment', 'rational agent', 'problem solving', 'search algorithms', 'bfs', 'dfs', 'uninformed search', 'informed search']
      },
      {
        CourseId: aiCourse.id,
        coNumber: 'CO2',
        description: 'Apply basic principles of AI in solutions that require problem solving, inference under certainty and uncertainty',
        keywords: ['heuristic', 'a* search', 'greedy search', 'local search', 'hill climbing', 'simulated annealing', 'genetic algorithm', 'csp', 'constraint satisfaction', 'game playing', 'minimax', 'alpha beta pruning', 'monte carlo']
      },
      {
        CourseId: aiCourse.id,
        coNumber: 'CO3',
        description: 'Define complex problems in AI terms, and solve them by analyzing appropriate AI agents',
        keywords: ['logical agents', 'propositional logic', 'first order logic', 'knowledge representation', 'inference', 'resolution', 'forward chaining', 'backward chaining', 'bayesian networks', 'probabilistic reasoning']
      }
    ]);
    
    // Create Bloom taxonomy keywords
    await BloomKeyword.bulkCreate([
      {
        level: 'K1',
        levelName: 'Remembering',
        keywords: ['define', 'list', 'state', 'name', 'label', 'recall', 'identify', 'describe']
      },
      {
        level: 'K2',
        levelName: 'Understanding',
        keywords: ['explain', 'discuss', 'summarize', 'interpret', 'compare', 'classify', 'illustrate']
      },
      {
        level: 'K3',
        levelName: 'Applying',
        keywords: ['apply', 'solve', 'demonstrate', 'calculate', 'implement', 'use', 'execute']
      },
      {
        level: 'K4',
        levelName: 'Analyzing',
        keywords: ['analyze', 'differentiate', 'distinguish', 'examine', 'investigate']
      },
      {
        level: 'K5',
        levelName: 'Evaluating',
        keywords: ['evaluate', 'justify', 'critique', 'assess', 'recommend']
      },
      {
        level: 'K6',
        levelName: 'Creating',
        keywords: ['design', 'develop', 'construct', 'formulate', 'create', 'devise']
      }
    ]);
    
    console.log('✅ Sample data seeded successfully');
    
  } catch (error) {
    console.error('❌ Error seeding data:', error);
  }
}

startServer();