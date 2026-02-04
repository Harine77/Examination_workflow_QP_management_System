const axios = require('axios');

const API_URL = 'http://localhost:5000/api';

// Test questions with expected KL levels
const testQuestions = [
  // K1 - Remembering
  { text: 'Define intelligent agents', expected: 'K1' },
  { text: 'List the types of search algorithms', expected: 'K1' },
  { text: 'State the properties of A* algorithm', expected: 'K1' },
  { text: 'What is artificial intelligence?', expected: 'K1' },
  
  // K2 - Understanding
  { text: 'Explain the concept of intelligent agents', expected: 'K2' },
  { text: 'Describe the working of BFS algorithm', expected: 'K2' },
  { text: 'Discuss the advantages of heuristic search', expected: 'K2' },
  { text: 'Summarize the minimax algorithm', expected: 'K2' },
  
  // K3 - Applying
  { text: 'Apply A* algorithm to solve the 8-puzzle problem', expected: 'K3' },
  { text: 'Demonstrate how hill climbing works with an example', expected: 'K3' },
  { text: 'Solve the given CSP using backtracking', expected: 'K3' },
  { text: 'Calculate the heuristic value for the given state', expected: 'K3' },
  { text: 'Implement DFS for the given graph', expected: 'K3' },
  
  // K4 - Analyzing
  { text: 'Compare and contrast BFS and DFS algorithms', expected: 'K4' },
  { text: 'Analyze the performance of greedy search vs A* search', expected: 'K4' },
  { text: 'Differentiate between uninformed and informed search', expected: 'K4' },
  { text: 'Examine the time complexity of minimax algorithm', expected: 'K4' },
  
  // K5 - Evaluating
  { text: 'Evaluate the efficiency of genetic algorithms for optimization', expected: 'K5' },
  { text: 'Justify the use of alpha-beta pruning in game playing', expected: 'K5' },
  { text: 'Assess the suitability of hill climbing for the given problem', expected: 'K5' },
  { text: 'Critique the limitations of propositional logic', expected: 'K5' },
  
  // K6 - Creating
  { text: 'Design a search algorithm for the traveling salesman problem', expected: 'K6' },
  { text: 'Develop a knowledge base for medical diagnosis', expected: 'K6' },
  { text: 'Formulate a CSP for the N-queens problem', expected: 'K6' },
  { text: 'Create an intelligent agent for playing chess', expected: 'K6' }
];

async function testKLMapping() {
  console.log('\n🧪 TESTING KL MAPPING (BLOOM\'S TAXONOMY)\n');
  console.log('='.repeat(80));
  
  let correct = 0;
  let total = testQuestions.length;
  
  for (const test of testQuestions) {
    try {
      const response = await axios.post(`${API_URL}/questions/analyze`, {
        questionText: test.text,
        courseId: 1  // Assuming AI course has ID 1
      });
      
      const result = response.data.data;
      const detected = result.kl.level;
      const isCorrect = detected === test.expected;
      
      if (isCorrect) correct++;
      
      const status = isCorrect ? '✅' : '❌';
      console.log(`${status} Expected: ${test.expected} | Detected: ${detected} (${result.kl.confidence}%)`);
      console.log(`   Q: "${test.text}"`);
      console.log(`   Verb: "${result.kl.verb}" | Method: ${result.kl.method}`);
      console.log('-'.repeat(80));
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log('\n📊 RESULTS:');
  console.log(`Correct: ${correct}/${total} (${((correct/total) * 100).toFixed(1)}%)`);
  console.log('='.repeat(80));
}

async function testCOMapping() {
  console.log('\n🧪 TESTING CO MAPPING (AI-BASED)\n');
  console.log('='.repeat(80));
  
  const coTests = [
    { text: 'Explain the concept of intelligent agents and their types', expectedCO: 'CO1' },
    { text: 'Describe the rational agent architecture', expectedCO: 'CO1' },
    { text: 'Apply A* algorithm to solve 8-puzzle problem', expectedCO: 'CO2' },
    { text: 'Demonstrate minimax algorithm with alpha-beta pruning', expectedCO: 'CO2' },
    { text: 'Explain propositional logic and inference rules', expectedCO: 'CO3' },
    { text: 'Describe forward chaining in first-order logic', expectedCO: 'CO3' }
  ];
  
  for (const test of coTests) {
    try {
      const response = await axios.post(`${API_URL}/questions/analyze`, {
        questionText: test.text,
        courseId: 1
      });
      
      const result = response.data.data;
      const isCorrect = result.co.number === test.expectedCO;
      const status = isCorrect ? '✅' : '⚠️';
      
      console.log(`${status} Expected: ${test.expectedCO} | Detected: ${result.co.number} (${result.co.confidence}%)`);
      console.log(`   Q: "${test.text}"`);
      console.log(`   Matched Keywords: [${result.co.matchedKeywords.join(', ')}]`);
      console.log('-'.repeat(80));
      
    } catch (error) {
      console.error('❌ Error:', error.message);
    }
  }
  
  console.log('='.repeat(80));
}

async function runAllTests() {
  console.log('\n🚀 STARTING API TESTS...\n');
  
  try {
    // Test health endpoint
    const health = await axios.get(`${API_URL}/health`);
    console.log('✅ Server is running:', health.data.message, '\n');
    
    // Run KL tests
    await testKLMapping();
    
    // Wait a bit
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Run CO tests
    await testCOMapping();
    
    console.log('\n✅ ALL TESTS COMPLETED!\n');
    
  } catch (error) {
    console.error('\n❌ TEST FAILED:', error.message);
    console.error('Make sure the backend server is running on http://localhost:5000\n');
  }
}

// Run tests
runAllTests();