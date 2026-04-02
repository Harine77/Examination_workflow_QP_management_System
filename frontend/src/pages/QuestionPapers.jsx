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
      draft:                 { color: 'bg-gray-500',    text: 'Draft' },
      submitted:             { color: 'bg-blue-500',    text: 'Submitted' },
      with_scrutinizer1:     { color: 'bg-blue-600',    text: 'With Scrutinizer 1' },
      with_scrutinizer2:     { color: 'bg-violet-600',  text: 'With Scrutinizer 2' },
      needs_revision:        { color: 'bg-red-500',     text: 'Needs Revision' },
      scrutinizer2_approved: { color: 'bg-emerald-600', text: 'S2 Approved' },
      randomized:            { color: 'bg-amber-500',   text: 'Randomized' },
      with_panel:            { color: 'bg-cyan-600',    text: 'With Panel' },
      with_hod:              { color: 'bg-purple-600',  text: 'With HOD' },
      hod_approved:          { color: 'bg-green-600',   text: 'HOD Approved' },
      reviewed:              { color: 'bg-green-500',   text: 'Reviewed' },
      finalized:             { color: 'bg-purple-500',  text: 'Finalized' },
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
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Header */}
        <div className="mb-8 pb-6 border-b-2 border-ssn-blue">
          <h1 className="text-4xl font-bold text-ssn-dark mb-2">Question Papers</h1>
          <p className="text-lg text-gray-600">
            {statusFilter 
              ? `Showing: ${statusFilter.replace(/_/g, ' ').toUpperCase()}` 
              : 'All question papers in the system'}
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex flex-wrap gap-2 mb-8">
          <button onClick={() => navigate('/papers')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${!statusFilter ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>All Papers</button>

          {/* Faculty filters */}
          {user.role === 'faculty' && (<>
            <button onClick={() => navigate('/papers?status=draft')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${statusFilter === 'draft' ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Draft</button>
            <button onClick={() => navigate('/papers?status=submitted')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${statusFilter === 'submitted' ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Submitted</button>
            <button onClick={() => navigate('/papers?status=needs_revision')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${statusFilter === 'needs_revision' ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Needs Revision</button>
          </>)}

          {/* Scrutinizer filters */}
          {['scrutinizer', 'scrutinizer_1', 'scrutinizer_2'].includes(user.role) && (<>
            <button onClick={() => navigate('/papers?status=with_scrutinizer1')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${statusFilter === 'with_scrutinizer1' ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>S1 Review</button>
            <button onClick={() => navigate('/papers?status=with_scrutinizer2')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${statusFilter === 'with_scrutinizer2' ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>S2 Review</button>
          </>)}

          {/* Panel filters */}
          {user.role === 'panel_member' && (<>
            <button onClick={() => navigate('/papers?status=with_panel')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${statusFilter === 'with_panel' ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Panel Review</button>
            <button onClick={() => navigate('/papers?status=hod_approved')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${statusFilter === 'hod_approved' ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Approved</button>
          </>)}

          {/* HOD filters */}
          {user.role === 'hod' && (<>
            <button onClick={() => navigate('/papers?status=with_hod')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${statusFilter === 'with_hod' ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>For Approval</button>
            <button onClick={() => navigate('/papers?status=hod_approved')} className={`px-4 py-2 rounded-lg font-semibold transition-all text-sm ${statusFilter === 'hod_approved' ? 'bg-ssn-blue text-white shadow-md' : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'}`}>Approved</button>
          </>)}
        </div>

        {/* Papers List */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-2xl text-ssn-blue font-semibold">Loading papers...</div>
          </div>
        ) : papers.length === 0 ? (
          <div className="card p-12 text-center">
            <div className="flex justify-center mb-4">
              <svg className="w-16 h-16 text-ssn-blue" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-ssn-dark mb-2">No Papers Found</h3>
            <p className="text-gray-600 mb-6 text-lg font-normal">
              {user.role === 'faculty' 
                ? "You haven't created any question papers yet." 
                : "No papers available in this category."}
            </p>
            {user.role === 'faculty' && (
              <button
                onClick={() => navigate('/create-paper')}
                className="btn-primary"
              >
                + Create New Paper
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {papers.map((paper) => (
              <div key={paper.id} className="card p-6 hover:shadow-lg transition-shadow border-l-4 border-ssn-blue">
                <div className="flex justify-between items-start gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <h3 className="text-xl font-bold text-ssn-dark">
                        {paper.Course?.courseCode} - {paper.Course?.courseName}
                      </h3>
                      {getStatusBadge(paper.status)}
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm text-gray-700 mb-3">
                      <div>
                        <span className="font-semibold text-gray-800">Exam Type:</span> {paper.examType}
                        {paper.catNumber && ` - ${paper.catNumber}`}
                      </div>
                      <div>
                        <span className="font-semibold text-gray-800">Created By:</span> {paper.creator?.username || 'Unknown'}
                      </div>
                      {paper.examDate && (
                        <div>
                          <span className="font-semibold text-gray-800">Exam Date:</span> {new Date(paper.examDate).toLocaleDateString()}
                        </div>
                      )}
                      <div>
                        <span className="font-semibold text-gray-800">Created:</span> {new Date(paper.createdAt).toLocaleDateString()}
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