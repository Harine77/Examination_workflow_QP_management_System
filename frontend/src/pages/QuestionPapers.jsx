import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import api from '../services/api';

const QuestionPapers = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const statusFilter = searchParams.get('status');

  useEffect(() => {
    fetchPapers();
  }, [statusFilter]);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await api.get('/questions/papers', { params });
      setPapers(response.data.data);
    } catch (error) {
      toast.error('Failed to fetch question papers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      draft: { color: 'bg-gray-500', text: 'Draft' },
      submitted: { color: 'bg-blue-500', text: 'Submitted' },
      reviewed: { color: 'bg-green-500', text: 'Reviewed' },
      finalized: { color: 'bg-purple-500', text: 'Finalized' }
    };
    const config = statusConfig[status] || { color: 'bg-gray-500', text: status };
    return (
      <span className={`${config.color} text-white px-3 py-1 rounded-full text-xs font-bold`}>
        {config.text}
      </span>
    );
  };

  const handleViewPaper = (paperId) => {
    navigate(`/papers/${paperId}`);
  };

  const handleSubmitPaper = async (paperId) => {
    if (!window.confirm('Submit this paper for review?')) return;
    
    try {
      await api.post(`/questions/papers/${paperId}/submit`);
      toast.success('Paper submitted for review!');
      fetchPapers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to submit paper');
    }
  };

  const handleReviewPaper = async (paperId) => {
    const comments = prompt('Enter review comments:');
    if (!comments) return;

    try {
      await api.post(`/questions/papers/${paperId}/review`, {
        reviewComments: comments
      });
      toast.success('Paper reviewed successfully!');
      fetchPapers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to review paper');
    }
  };

  const handleFinalizePaper = async (paperId) => {
    const notes = prompt('Enter finalization notes:');
    if (!notes) return;

    try {
      await api.post(`/questions/papers/${paperId}/finalize`, {
        finalizationNotes: notes
      });
      toast.success('Paper finalized successfully!');
      fetchPapers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to finalize paper');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Question Papers</h1>
          <p className="text-gray-600">
            {statusFilter 
              ? `Showing ${statusFilter} papers` 
              : 'All question papers in the system'}
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex space-x-3 mb-6">
          <button
            onClick={() => navigate('/papers')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              !statusFilter 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            All Papers
          </button>
          <button
            onClick={() => navigate('/papers?status=draft')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === 'draft' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Draft
          </button>
          <button
            onClick={() => navigate('/papers?status=submitted')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === 'submitted' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Submitted
          </button>
          <button
            onClick={() => navigate('/papers?status=reviewed')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === 'reviewed' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Reviewed
          </button>
          <button
            onClick={() => navigate('/papers?status=finalized')}
            className={`px-4 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === 'finalized' 
                ? 'bg-indigo-600 text-white' 
                : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            Finalized
          </button>
        </div>

        {/* Papers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-2xl text-indigo-600">Loading papers...</div>
          </div>
        ) : papers.length === 0 ? (
          <div className="bg-white rounded-xl shadow-lg p-12 text-center">
            <div className="text-6xl mb-4">📋</div>
            <h3 className="text-2xl font-bold text-gray-700 mb-2">No Papers Found</h3>
            <p className="text-gray-600 mb-6">
              {user.role === 'faculty' 
                ? "You haven't created any question papers yet." 
                : "No papers available in this category."}
            </p>
            {user.role === 'faculty' && (
              <button
                onClick={() => navigate('/create-paper')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-3 rounded-lg font-semibold"
              >
                Create Your First Paper
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {papers.map((paper) => (
              <div key={paper.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-bold text-gray-800">
                        {paper.Course?.courseCode} - {paper.Course?.courseName}
                      </h3>
                      {getStatusBadge(paper.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
                      <div>
                        <strong>Exam Type:</strong> {paper.examType}
                        {paper.catNumber && ` - ${paper.catNumber}`}
                      </div>
                      <div>
                        <strong>Created By:</strong> {paper.creator?.username || 'Unknown'}
                      </div>
                      {paper.examDate && (
                        <div>
                          <strong>Exam Date:</strong> {new Date(paper.examDate).toLocaleDateString()}
                        </div>
                      )}
                      <div>
                        <strong>Created:</strong> {new Date(paper.createdAt).toLocaleDateString()}
                      </div>
                    </div>

                    {/* Review/Finalization Info */}
                    {paper.reviewComments && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
                        <strong className="text-green-700">Review Comments:</strong>
                        <p className="text-sm text-gray-700 mt-1">{paper.reviewComments}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Reviewed by: {paper.reviewer?.username}
                        </p>
                      </div>
                    )}

                    {paper.finalizationNotes && (
                      <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                        <strong className="text-purple-700">Finalization Notes:</strong>
                        <p className="text-sm text-gray-700 mt-1">{paper.finalizationNotes}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          Finalized by: {paper.finalizer?.username}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex flex-col space-y-2 ml-4">
                    <button
                      onClick={() => handleViewPaper(paper.id)}
                      className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                    >
                      View Details
                    </button>

                    {/* Faculty Actions */}
                    {user.role === 'faculty' && paper.createdBy === user.id && paper.status === 'draft' && (
                      <button
                        onClick={() => handleSubmitPaper(paper.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                      >
                        Submit for Review
                      </button>
                    )}

                    {/* Scrutinizer Actions */}
                    {user.role === 'scrutinizer' && paper.status === 'submitted' && (
                      <button
                        onClick={() => handleReviewPaper(paper.id)}
                        className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                      >
                        Review Paper
                      </button>
                    )}

                    {/* HOD Actions */}
                    {user.role === 'hod' && paper.status === 'reviewed' && (
                      <button
                        onClick={() => handleFinalizePaper(paper.id)}
                        className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
                      >
                        Finalize Paper
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionPapers;