import { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [step, setStep] = useState(1); // Multi-step form
  const [examFormat, setExamFormat] = useState(''); // CAT, SAT, SEM
  const [courseInfo, setCourseInfo] = useState({
    courseCode: '',
    courseName: '',
    semester: '',
    department: '',
    degree: '',
    branch: '',
    catNumber: '', // CAT-I, CAT-II, CAT-III
    examDate: ''
  });
  
  const [courseOutcomes, setCourseOutcomes] = useState([
    { coNumber: 'CO1', description: '', keywords: '' },
    { coNumber: 'CO2', description: '', keywords: '' },
    { coNumber: 'CO3', description: '', keywords: '' },
    { coNumber: 'CO4', description: '', keywords: '' },
    { coNumber: 'CO5', description: '', keywords: '' }
  ]);

  const [questions, setQuestions] = useState({
    partA: [
      { number: 1, text: '', kl: '', co: '', pi: '', marks: 2 },
      { number: 2, text: '', kl: '', co: '', pi: '', marks: 2 },
      { number: 3, text: '', kl: '', co: '', pi: '', marks: 2 },
      { number: 4, text: '', kl: '', co: '', pi: '', marks: 2 }
    ],
    partB: [
      { number: 5, text: '', kl: '', co: '', pi: '', marks: 6 },
      { number: 6, text: '', kl: '', co: '', pi: '', marks: 6 },
      { number: 7, text: '', kl: '', co: '', pi: '', marks: 6 }
    ],
    partC: [
      { number: 8, text: '', kl: '', co: '', pi: '', marks: 12, isOr: false },
      { number: 9, text: '', kl: '', co: '', pi: '', marks: 12, isOr: true },
      { number: 10, text: '', kl: '', co: '', pi: '', marks: 12, isOr: false },
      { number: 11, text: '', kl: '', co: '', pi: '', marks: 12, isOr: true }
    ]
  });

  const [analyzing, setAnalyzing] = useState(false);
  const [courseId, setCourseId] = useState(null);

  // Step 1: Select Exam Format
  const selectExamFormat = (format) => {
    setExamFormat(format);
    setStep(2);
  };

  // Step 2: Submit Course Info and COs
  const submitCourseInfo = async () => {
    // Validation
    if (!courseInfo.courseCode || !courseInfo.courseName) {
      toast.error('Please fill course code and name');
      return;
    }

    const hasEmptyCO = courseOutcomes.some(co => !co.description.trim());
    if (hasEmptyCO) {
      toast.error('Please fill all Course Outcome descriptions');
      return;
    }

    try {
      // Create course with outcomes
      const response = await axios.post(`${API_URL}/courses`, {
        courseCode: courseInfo.courseCode,
        courseName: courseInfo.courseName,
        semester: parseInt(courseInfo.semester) || 1,
        syllabus: '',
        outcomes: courseOutcomes.map(co => ({
          coNumber: co.coNumber,
          description: co.description,
          keywords: co.keywords.split(',').map(k => k.trim()).filter(k => k)
        }))
      });

      setCourseId(response.data.id);
      toast.success('✅ Course information saved!');
      setStep(3);
    } catch (error) {
      toast.error('Failed to save course information');
      console.error(error);
    }
  };

  // Analyze individual question
  const analyzeQuestion = async (part, index) => {
    const question = questions[part][index];
    
    if (!question.text.trim()) {
      toast.warning('Please enter question text first');
      return;
    }

    setAnalyzing(true);
    try {
      const response = await axios.post(`${API_URL}/questions/analyze`, {
        questionText: question.text,
        courseId: courseId
      });

      const result = response.data.data;

      // Update question with results
      setQuestions(prev => ({
        ...prev,
        [part]: prev[part].map((q, i) => 
          i === index 
            ? { 
                ...q, 
                kl: result.kl.level, 
                co: result.co.number,
                klConfidence: result.kl.confidence,
                coConfidence: result.co.confidence
              }
            : q
        )
      }));

      toast.success(`✅ ${result.kl.level} & ${result.co.number} detected!`);
    } catch (error) {
      toast.error('Failed to analyze question');
      console.error(error);
    } finally {
      setAnalyzing(false);
    }
  };

  // Update question text
  const updateQuestionText = (part, index, text) => {
    setQuestions(prev => ({
      ...prev,
      [part]: prev[part].map((q, i) => 
        i === index ? { ...q, text } : q
      )
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-bold text-indigo-700 mb-2">
            📝 Question Paper CO & KL Mapper
          </h1>
          <p className="text-gray-600 text-lg">
            SSN College of Engineering - CAT/SAT/SEM Exam Generator
          </p>
        </div>

        {/* Progress Steps */}
        <div className="flex justify-center mb-8">
          <div className="flex items-center space-x-4">
            <div className={`px-4 py-2 rounded-lg ${step >= 1 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
              1. Format
            </div>
            <div className="w-12 h-1 bg-gray-300"></div>
            <div className={`px-4 py-2 rounded-lg ${step >= 2 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
              2. Course Info
            </div>
            <div className="w-12 h-1 bg-gray-300"></div>
            <div className={`px-4 py-2 rounded-lg ${step >= 3 ? 'bg-indigo-600 text-white' : 'bg-gray-300'}`}>
              3. Questions
            </div>
          </div>
        </div>

        {/* STEP 1: EXAM FORMAT SELECTION */}
        {step === 1 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6 text-center">
              Select Exam Format
            </h2>
            <div className="grid grid-cols-3 gap-6">
              <button
                onClick={() => selectExamFormat('CAT')}
                className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-8 text-2xl font-bold shadow-lg transform hover:scale-105 transition-all"
              >
                📋 CAT
                <p className="text-sm font-normal mt-2">Continuous Assessment Test</p>
              </button>
              <button
                onClick={() => selectExamFormat('SAT')}
                className="bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white rounded-xl p-8 text-2xl font-bold shadow-lg transform hover:scale-105 transition-all"
              >
                📝 SAT
                <p className="text-sm font-normal mt-2">Summative Assessment Test</p>
              </button>
              <button
                onClick={() => selectExamFormat('SEM')}
                className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-8 text-2xl font-bold shadow-lg transform hover:scale-105 transition-all"
              >
                📚 SEM
                <p className="text-sm font-normal mt-2">Semester Exam</p>
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: COURSE INFO & COs */}
        {step === 2 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-6">
              Course Information & Outcomes
            </h2>

            {/* Course Basic Info */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block font-semibold mb-2">Course Code *</label>
                <input
                  type="text"
                  placeholder="e.g., UIT2504"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  value={courseInfo.courseCode}
                  onChange={(e) => setCourseInfo({...courseInfo, courseCode: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Course Name *</label>
                <input
                  type="text"
                  placeholder="e.g., Artificial Intelligence"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  value={courseInfo.courseName}
                  onChange={(e) => setCourseInfo({...courseInfo, courseName: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Semester</label>
                <input
                  type="number"
                  placeholder="e.g., 5"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  value={courseInfo.semester}
                  onChange={(e) => setCourseInfo({...courseInfo, semester: e.target.value})}
                />
              </div>
              <div>
                <label className="block font-semibold mb-2">Department</label>
                <input
                  type="text"
                  placeholder="e.g., Computer Science"
                  className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                  value={courseInfo.department}
                  onChange={(e) => setCourseInfo({...courseInfo, department: e.target.value})}
                />
              </div>
              {examFormat === 'CAT' && (
                <>
                  <div>
                    <label className="block font-semibold mb-2">CAT Number</label>
                    <select
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      value={courseInfo.catNumber}
                      onChange={(e) => setCourseInfo({...courseInfo, catNumber: e.target.value})}
                    >
                      <option value="">Select</option>
                      <option value="I">CAT-I</option>
                      <option value="II">CAT-II</option>
                      <option value="III">CAT-III</option>
                    </select>
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">Exam Date</label>
                    <input
                      type="date"
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      value={courseInfo.examDate}
                      onChange={(e) => setCourseInfo({...courseInfo, examDate: e.target.value})}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Course Outcomes */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-700 mb-4">Course Outcomes *</h3>
              {courseOutcomes.map((co, index) => (
                <div key={co.coNumber} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block font-semibold mb-2">{co.coNumber}</label>
                  <input
                    type="text"
                    placeholder="Description (e.g., Understand the foundations of AI...)"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none mb-2"
                    value={co.description}
                    onChange={(e) => {
                      const updated = [...courseOutcomes];
                      updated[index].description = e.target.value;
                      setCourseOutcomes(updated);
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Keywords (comma-separated, e.g., intelligent agents, search, problem solving)"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    value={co.keywords}
                    onChange={(e) => {
                      const updated = [...courseOutcomes];
                      updated[index].keywords = e.target.value;
                      setCourseOutcomes(updated);
                    }}
                  />
                </div>
              ))}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setStep(1)}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg font-semibold"
              >
                ← Back
              </button>
              <button
                onClick={submitCourseInfo}
                className="flex-1 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold"
              >
                Continue to Question Paper →
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: QUESTION PAPER TEMPLATE */}
        {step === 3 && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-3xl font-bold text-gray-800 mb-2">
              {examFormat} Question Paper - {courseInfo.courseCode}
            </h2>
            <p className="text-gray-600 mb-6">{courseInfo.courseName}</p>

            {/* Part A */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-blue-700 mb-4 border-b-2 border-blue-700 pb-2">
                Part A (4 × 2 = 8 Marks)
              </h3>
              {questions.partA.map((q, index) => (
                <QuestionBox
                  key={q.number}
                  question={q}
                  onTextChange={(text) => updateQuestionText('partA', index, text)}
                  onAnalyze={() => analyzeQuestion('partA', index)}
                  analyzing={analyzing}
                />
              ))}
            </div>

            {/* Part B */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-green-700 mb-4 border-b-2 border-green-700 pb-2">
                Part B (3 × 6 = 18 Marks)
              </h3>
              {questions.partB.map((q, index) => (
                <QuestionBox
                  key={q.number}
                  question={q}
                  onTextChange={(text) => updateQuestionText('partB', index, text)}
                  onAnalyze={() => analyzeQuestion('partB', index)}
                  analyzing={analyzing}
                />
              ))}
            </div>

            {/* Part C */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-purple-700 mb-4 border-b-2 border-purple-700 pb-2">
                Part C (2 × 12 = 24 Marks)
              </h3>
              {questions.partC.map((q, index) => (
                <QuestionBox
                  key={q.number}
                  question={q}
                  onTextChange={(text) => updateQuestionText('partC', index, text)}
                  onAnalyze={() => analyzeQuestion('partC', index)}
                  analyzing={analyzing}
                  showOr={q.isOr}
                />
              ))}
            </div>

            <div className="flex space-x-4">
              <button
                onClick={() => setStep(2)}
                className="px-6 py-3 bg-gray-300 hover:bg-gray-400 rounded-lg font-semibold"
              >
                ← Back
              </button>
              <button
                onClick={() => toast.success('Download feature coming soon!')}
                className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold"
              >
                📥 Download Question Paper
              </button>
            </div>
          </div>
        )}
      </div>

      <ToastContainer position="top-right" autoClose={3000} />
    </div>
  );
}

// Question Box Component
function QuestionBox({ question, onTextChange, onAnalyze, analyzing, showOr }) {
  return (
    <div className="mb-6">
      {showOr && (
        <div className="text-center my-2">
          <span className="bg-gray-200 px-4 py-1 rounded-full font-bold">OR</span>
        </div>
      )}
      <div className="border-2 border-gray-300 rounded-lg p-4">
        <div className="flex items-start space-x-4">
          <div className="font-bold text-lg text-gray-700 min-w-[40px]">
            {question.number}.
          </div>
          <div className="flex-1">
            <textarea
              className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none resize-none"
              rows="3"
              placeholder="Type your question here..."
              value={question.text}
              onChange={(e) => onTextChange(e.target.value)}
            />
            <div className="mt-3 flex items-center space-x-4">
              <button
                onClick={onAnalyze}
                disabled={analyzing || !question.text.trim()}
                className={`px-4 py-2 rounded-lg font-semibold ${
                  analyzing || !question.text.trim()
                    ? 'bg-gray-300 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                }`}
              >
                {analyzing ? '🔄 Analyzing...' : '🤖 Auto-Detect'}
              </button>
              
              {question.kl && (
                <div className="flex space-x-4">
                  <div className="bg-blue-100 px-4 py-2 rounded-lg">
                    <span className="font-semibold">KL:</span>
                    <span className="ml-2 font-bold text-blue-700">{question.kl}</span>
                    {question.klConfidence && (
                      <span className="ml-2 text-sm text-gray-600">({question.klConfidence}%)</span>
                    )}
                  </div>
                  <div className="bg-green-100 px-4 py-2 rounded-lg">
                    <span className="font-semibold">CO:</span>
                    <span className="ml-2 font-bold text-green-700">{question.co}</span>
                    {question.coConfidence && (
                      <span className="ml-2 text-sm text-gray-600">({question.coConfidence}%)</span>
                    )}
                  </div>
                  <input
                    type="text"
                    placeholder="PI"
                    className="w-32 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                    value={question.pi}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;