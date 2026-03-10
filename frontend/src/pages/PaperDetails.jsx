import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import api from '../services/api';

const PaperDetails = () => {
  const { paperId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [paper, setPaper] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPaper = async () => {
      try {
        const response = await api.get(`/questions/papers/${paperId}`);
        setPaper(response.data.data);
      } catch (error) {
        toast.error(error.response?.data?.error || 'Failed to load question paper');
        if (error.response?.status === 404 || error.response?.status === 403) {
          navigate('/papers');
        }
      } finally {
        setLoading(false);
      }
    };
    fetchPaper();
  }, [paperId, navigate]);

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-500', text: 'Draft' },
      submitted: { color: 'bg-blue-500', text: 'Submitted' },
      reviewed: { color: 'bg-green-500', text: 'Reviewed' },
      finalized: { color: 'bg-purple-500', text: 'Finalized' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    return (
      <span className={`${config.color} text-white px-3 py-1 rounded-full text-sm font-bold`}>
        {config.text}
      </span>
    );
  };

  const handleSubmitPaper = async () => {
    if (!window.confirm('Submit this paper for review?')) return;
    try {
      await api.post(`/questions/papers/${paperId}/submit`);
      toast.success('Paper submitted for review!');
      const response = await api.get(`/questions/papers/${paperId}`);
      setPaper(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to submit paper');
    }
  };

  const handleReviewPaper = async () => {
    const comments = prompt('Enter review comments:');
    if (!comments) return;
    try {
      await api.post(`/questions/papers/${paperId}/review`, { reviewComments: comments });
      toast.success('Paper reviewed successfully!');
      const response = await api.get(`/questions/papers/${paperId}`);
      setPaper(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to review paper');
    }
  };

  const handleFinalizePaper = async () => {
    const notes = prompt('Enter finalization notes:');
    if (!notes) return;
    try {
      await api.post(`/questions/papers/${paperId}/finalize`, { finalizationNotes: notes });
      toast.success('Paper finalized successfully!');
      const response = await api.get(`/questions/papers/${paperId}`);
      setPaper(response.data.data);
    } catch (error) {
      toast.error(error.response?.data?.error || 'Failed to finalize paper');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 py-12 text-center">
          <div className="text-2xl text-indigo-600">Loading paper...</div>
        </div>
      </div>
    );
  }

  if (!paper) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <button
          onClick={() => navigate('/papers')}
          className="mb-6 px-4 py-2 bg-gray-200 hover:bg-gray-300 rounded-lg font-semibold text-gray-700"
        >
          ← Back to Question Papers
        </button>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-800 mb-2">
                {paper.Course?.courseCode} - {paper.Course?.courseName}
              </h1>
              {getStatusBadge(paper.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-gray-600 mb-6">
            <div><strong>Exam Type:</strong> {paper.examType}{paper.catNumber && ` - ${paper.catNumber}`}</div>
            <div><strong>Created By:</strong> {paper.creator?.username || 'Unknown'}</div>
            {paper.examDate && (
              <div><strong>Exam Date:</strong> {new Date(paper.examDate).toLocaleDateString()}</div>
            )}
            <div><strong>Created:</strong> {new Date(paper.createdAt).toLocaleDateString()}</div>
          </div>

          {paper.reviewComments && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
              <strong className="text-green-700">Review Comments:</strong>
              <p className="text-gray-700 mt-1">{paper.reviewComments}</p>
              <p className="text-xs text-gray-500 mt-1">Reviewed by: {paper.reviewer?.username}</p>
            </div>
          )}

          {paper.finalizationNotes && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
              <strong className="text-purple-700">Finalization Notes:</strong>
              <p className="text-gray-700 mt-1">{paper.finalizationNotes}</p>
              <p className="text-xs text-gray-500 mt-1">Finalized by: {paper.finalizer?.username}</p>
            </div>
          )}

          {paper.Questions && paper.Questions.length > 0 && (
            <div className="mt-8 border-t pt-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4">Questions</h2>
              <div className="space-y-4">
                {paper.Questions.map((q, i) => (
                  <div key={q.id} className="p-4 bg-gray-50 rounded-lg">
                    <div className="font-semibold text-gray-700">
                      Part {q.part} - Q{q.questionNumber} ({q.marks} marks)
                    </div>
                    <p className="text-gray-600">{q.questionText || '-'}</p>
                    {q.klLevel && (
                      <div className="mt-2 text-sm text-gray-500">KL: {q.klLevel}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-3 mt-8 pt-6 border-t">
            {user.role === 'faculty' && paper.createdBy === user.id && paper.status === 'draft' && (
              <button
                onClick={handleSubmitPaper}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                Submit for Review
              </button>
            )}
            {user.role === 'scrutinizer' && paper.status === 'submitted' && (
              <button
                onClick={handleReviewPaper}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                Review Paper
              </button>
            )}
            {user.role === 'hod' && paper.status === 'reviewed' && (
              <button
                onClick={handleFinalizePaper}
                className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold"
              >
                Finalize Paper
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaperDetails;
