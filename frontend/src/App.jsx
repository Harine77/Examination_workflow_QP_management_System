import { useState } from 'react';
import axios from 'axios';
import { ToastContainer, toast } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

const API_URL = 'http://localhost:5000/api';

function App() {
  const [step, setStep] = useState(1);
  const [examFormat, setExamFormat] = useState(''); // CAT, SAT, SEM
  const [courseInfo, setCourseInfo] = useState({
    courseCode: '',
    courseName: '',
    semester: '',
    department: '',
    degree: '',
    branch: '',
    catNumber: '',
    examDate: '',
    month: '',
    year: ''
  });
  
  const [courseOutcomes, setCourseOutcomes] = useState([
    { coNumber: 'CO1', description: '', keywords: '' },
    { coNumber: 'CO2', description: '', keywords: '' },
    { coNumber: 'CO3', description: '', keywords: '' },
    { coNumber: 'CO4', description: '', keywords: '' },
    { coNumber: 'CO5', description: '', keywords: '' }
  ]);

  const [questions, setQuestions] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [courseId, setCourseId] = useState(null);

  // Initialize questions based on exam format
  const initializeQuestions = (format) => {
    if (format === 'SEM') {
      return {
        partA: Array.from({ length: 5 }, (_, i) => ({
          number: i + 1,
          text: '',
          kl: '',
          co: '',
          pi: '',
          marks: 2
        })),
        partB: Array.from({ length: 5 }, (_, i) => ({
          number: i + 6,
          text: '',
          kl: '',
          co: '',
          pi: '',
          marks: 6
        })),
        partC: Array.from({ length: 10 }, (_, i) => ({
          number: i + 11,
          text: '',
          kl: '',
          co: '',
          pi: '',
          marks: 12,
          isOr: i % 2 === 1 // Questions 12, 14, 16, 18, 20 have OR
        }))
      };
    } else {
      // CAT/SAT format
      return {
        partA: Array.from({ length: 4 }, (_, i) => ({
          number: i + 1,
          text: '',
          kl: '',
          co: '',
          pi: '',
          marks: 2
        })),
        partB: Array.from({ length: 3 }, (_, i) => ({
          number: i + 5,
          text: '',
          kl: '',
          co: '',
          pi: '',
          marks: 6
        })),
        partC: Array.from({ length: 4 }, (_, i) => ({
          number: i + 8,
          text: '',
          kl: '',
          co: '',
          pi: '',
          marks: 12,
          isOr: i % 2 === 1 // Questions 9, 11 have OR
        }))
      };
    }
  };

  // Step 1: Select Exam Format
  const selectExamFormat = (format) => {
    setExamFormat(format);
    setQuestions(initializeQuestions(format));
    setStep(2);
  };

  // Step 2: Submit Course Info
  const submitCourseInfo = async () => {
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

  // Update PI
  const updateQuestionPI = (part, index, pi) => {
    setQuestions(prev => ({
      ...prev,
      [part]: prev[part].map((q, i) => 
        i === index ? { ...q, pi } : q
      )
    }));
  };

  // Download PDF
const downloadPDF = async () => {
  // Validate that all questions have text
  const allParts = [...questions.partA, ...questions.partB, ...questions.partC];
  const emptyQuestions = allParts.filter(q => !q.text.trim());
  
  if (emptyQuestions.length > 0) {
    toast.warning(`Please fill all questions before downloading (${emptyQuestions.length} questions are empty)`);
    return;
  }

  try {
    toast.info('🔄 Generating PDF... This may take a few seconds');
    
    const response = await axios.post(
      `${API_URL}/pdf/generate`,
      {
        courseInfo,
        courseOutcomes,
        questions,
        examFormat
      },
      {
        responseType: 'blob' // Important for PDF download
      }
    );

    // Create download link
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement('a');
    link.href = url;
    
    // Generate filename
    const timestamp = new Date().toISOString().split('T')[0];
    const filename = `${courseInfo.courseCode}_${examFormat}${courseInfo.catNumber ? '-' + courseInfo.catNumber : ''}_${timestamp}.pdf`;
    link.setAttribute('download', filename);
    
    document.body.appendChild(link);
    link.click();
    link.remove();
    
    toast.success('✅ PDF downloaded successfully!');
    
  } catch (error) {
    console.error('Download error:', error);
    toast.error('Failed to generate PDF. Please try again.');
  }
};

  // Get exam details for display
  const getExamDetails = () => {
    if (examFormat === 'CAT' || examFormat === 'SAT') {
      return {
        title: `Continuous Assessment Test${examFormat === 'CAT' ? ` - ${courseInfo.catNumber}` : ''}`,
        time: '90 Minutes',
        maxMarks: '50 Marks',
        partADesc: '4 × 2 = 8 Marks',
        partBDesc: '3 × 6 = 18 Marks',
        partCDesc: '2 × 12 = 24 Marks'
      };
    } else {
      return {
        title: `End Semester Examination - ${courseInfo.month} ${courseInfo.year}`,
        time: 'Three Hours',
        maxMarks: '100 Marks',
        partADesc: '5 × 2 = 10 Marks',
        partBDesc: '5 × 6 = 30 Marks',
        partCDesc: '5 × 12 = 60 Marks'
      };
    }
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
            SSN College of Engineering - Automated Question Paper Generator
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
            <div className="grid grid-cols-2 gap-6 max-w-3xl mx-auto">
              <button
                onClick={() => selectExamFormat('CAT')}
                className="bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all"
              >
                <div className="text-4xl mb-3">📋</div>
                <div className="text-2xl font-bold mb-2">CAT / SAT</div>
                <div className="text-sm opacity-90">
                  Continuous/Summative Assessment
                </div>
                <div className="mt-3 text-xs opacity-75">
                  50 Marks • 90 Minutes
                </div>
              </button>
              
              <button
                onClick={() => selectExamFormat('SEM')}
                className="bg-gradient-to-br from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-xl p-8 shadow-lg transform hover:scale-105 transition-all"
              >
                <div className="text-4xl mb-3">📚</div>
                <div className="text-2xl font-bold mb-2">SEM (ESE)</div>
                <div className="text-sm opacity-90">
                  End Semester Examination
                </div>
                <div className="mt-3 text-xs opacity-75">
                  100 Marks • 3 Hours
                </div>
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
              
              {(examFormat === 'CAT' || examFormat === 'SAT') && (
                <>
                  <div>
                    <label className="block font-semibold mb-2">
                      {examFormat === 'CAT' ? 'CAT Number' : 'SAT Number'}
                    </label>
                    <select
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      value={courseInfo.catNumber}
                      onChange={(e) => setCourseInfo({...courseInfo, catNumber: e.target.value})}
                    >
                      <option value="">Select</option>
                      <option value="I">I</option>
                      <option value="II">II</option>
                      <option value="III">III</option>
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

              {examFormat === 'SEM' && (
                <>
                  <div>
                    <label className="block font-semibold mb-2">Month</label>
                    <input
                      type="text"
                      placeholder="e.g., December"
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      value={courseInfo.month}
                      onChange={(e) => setCourseInfo({...courseInfo, month: e.target.value})}
                    />
                  </div>
                  <div>
                    <label className="block font-semibold mb-2">Year</label>
                    <input
                      type="text"
                      placeholder="e.g., 2024"
                      className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      value={courseInfo.year}
                      onChange={(e) => setCourseInfo({...courseInfo, year: e.target.value})}
                    />
                  </div>
                </>
              )}
            </div>

            {/* Course Outcomes */}
            <div className="mb-6">
              <h3 className="text-xl font-bold text-gray-700 mb-4">Course Outcomes *</h3>
              <p className="text-sm text-gray-600 mb-4">
                Enter keywords separated by commas (these help the AI match questions to COs)
              </p>
              {courseOutcomes.map((co, index) => (
                <div key={co.coNumber} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <label className="block font-semibold mb-2 text-indigo-600">{co.coNumber}</label>
                  <input
                    type="text"
                    placeholder="Description (e.g., Understand the foundations of AI and autonomous agents)"
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
                    placeholder="Keywords: intelligent agents, search algorithms, problem solving, BFS, DFS, rational agent"
                    className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none text-sm"
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
        {step === 3 && questions && (
          <div className="bg-white rounded-xl shadow-lg p-8">
            {/* Header */}
            <div className="text-center mb-6 border-b-2 pb-6">
              <h2 className="text-2xl font-bold text-gray-800">
                Sri Sivasubramaniya Nadar College of Engineering, Kalavakkam – 603 110
              </h2>
              <p className="text-sm text-gray-600">(An Autonomous Institution, Affiliated to Anna University, Chennai)</p>
              <h3 className="text-xl font-bold mt-4 text-indigo-700">
                {getExamDetails().title}
              </h3>
              <div className="mt-2 text-sm">
                <p><strong>Course:</strong> {courseInfo.courseCode} - {courseInfo.courseName}</p>
                <p><strong>Time:</strong> {getExamDetails().time} | <strong>Maximum:</strong> {getExamDetails().maxMarks}</p>
              </div>
            </div>

            {/* Bloom's Legend */}
            <div className="bg-blue-50 p-4 rounded-lg mb-6 text-sm">
              <strong>Knowledge Levels:</strong> K1: Remembering, K2: Understanding, K3: Applying, K4: Analyzing, K5: Evaluating, K6: Creating
            </div>

            {/* Course Outcomes Display */}
            <div className="bg-green-50 p-4 rounded-lg mb-6">
              <strong className="block mb-2">Course Outcomes:</strong>
              {courseOutcomes.map(co => (
                <div key={co.coNumber} className="text-sm mb-1">
                  <strong className="text-green-700">{co.coNumber}:</strong> {co.description}
                </div>
              ))}
            </div>

            {/* Part A */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-blue-700 mb-4 border-b-2 border-blue-700 pb-2">
                Part A ({getExamDetails().partADesc})
              </h3>
              {questions.partA.map((q, index) => (
                <QuestionBox
                  key={q.number}
                  question={q}
                  onTextChange={(text) => updateQuestionText('partA', index, text)}
                  onPIChange={(pi) => updateQuestionPI('partA', index, pi)}
                  onAnalyze={() => analyzeQuestion('partA', index)}
                  analyzing={analyzing}
                />
              ))}
            </div>

            {/* Part B */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-green-700 mb-4 border-b-2 border-green-700 pb-2">
                Part B ({getExamDetails().partBDesc})
              </h3>
              {examFormat === 'SEM' && (
                <p className="text-sm text-gray-600 mb-3 italic">(No Sub-divisions in Part-B)</p>
              )}
              {questions.partB.map((q, index) => (
                <QuestionBox
                  key={q.number}
                  question={q}
                  onTextChange={(text) => updateQuestionText('partB', index, text)}
                  onPIChange={(pi) => updateQuestionPI('partB', index, pi)}
                  onAnalyze={() => analyzeQuestion('partB', index)}
                  analyzing={analyzing}
                />
              ))}
            </div>

            {/* Part C */}
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-purple-700 mb-4 border-b-2 border-purple-700 pb-2">
                Part C ({getExamDetails().partCDesc})
              </h3>
              {examFormat === 'SEM' && (
                <p className="text-sm text-gray-600 mb-3 italic">(Maximum two Sub-divisions in Part-C with either 4 or 5 marks)</p>
              )}
              {questions.partC.map((q, index) => (
                <QuestionBox
                  key={q.number}
                  question={q}
                  onTextChange={(text) => updateQuestionText('partC', index, text)}
                  onPIChange={(pi) => updateQuestionPI('partC', index, pi)}
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
  onClick={downloadPDF}
  className="flex-1 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all"
>
  📥 Download Question Paper (PDF)
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
function QuestionBox({ question, onTextChange, onPIChange, onAnalyze, analyzing, showOr }) {
  return (
    <div className="mb-6">
      {showOr && (
        <div className="text-center my-3">
          <span className="bg-gray-200 px-6 py-2 rounded-full font-bold text-gray-700">(OR)</span>
        </div>
      )}
      <div className="border-2 border-gray-300 rounded-lg p-4 hover:border-indigo-300 transition-colors">
        <div className="flex items-start space-x-4">
          <div className="font-bold text-lg text-gray-700 min-w-[50px] pt-3">
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
            <div className="mt-3 flex items-center space-x-3 flex-wrap">
              <button
                onClick={onAnalyze}
                disabled={analyzing || !question.text.trim()}
                className={`px-5 py-2 rounded-lg font-semibold transition-all ${
                  analyzing || !question.text.trim()
                    ? 'bg-gray-300 cursor-not-allowed text-gray-500'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-md hover:shadow-lg'
                }`}
              >
                {analyzing ? '🔄 Analyzing...' : '🤖 Auto-Detect CO & KL'}
              </button>
              
              {question.kl && question.co && (
                <>
                  <div className="bg-blue-100 border-2 border-blue-300 px-4 py-2 rounded-lg">
                    <span className="font-semibold text-gray-700">KL:</span>
                    <span className="ml-2 font-bold text-blue-700 text-lg">{question.kl}</span>
                    {question.klConfidence && (
                      <span className="ml-2 text-xs text-gray-600">({question.klConfidence}%)</span>
                    )}
                  </div>
                  <div className="bg-green-100 border-2 border-green-300 px-4 py-2 rounded-lg">
                    <span className="font-semibold text-gray-700">CO:</span>
                    <span className="ml-2 font-bold text-green-700 text-lg">{question.co}</span>
                    {question.coConfidence && (
                      <span className="ml-2 text-xs text-gray-600">({question.coConfidence}%)</span>
                    )}
                  </div>
                  <div className="flex items-center">
                    <label className="font-semibold text-gray-700 mr-2">PI:</label>
                    <input
                      type="text"
                      placeholder="e.g., 1.1.1, 2.3.1"
                      className="w-40 px-3 py-2 border-2 border-gray-300 rounded-lg focus:border-indigo-500 focus:outline-none"
                      value={question.pi}
                      onChange={(e) => onPIChange(e.target.value)}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;