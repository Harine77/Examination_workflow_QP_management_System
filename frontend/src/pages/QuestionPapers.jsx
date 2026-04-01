import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/authContext';
import api from '../services/api';

const STATUS_META = {
  draft: { color: 'bg-gray-500', text: 'Draft', section: 'Draft Papers' },
  submitted: { color: 'bg-blue-500', text: 'Submitted', section: 'Submitted Papers' },
  with_scrutinizer1: { color: 'bg-blue-600', text: 'With Scrutinizer 1', section: 'With Scrutinizer 1' },
  with_scrutinizer2: { color: 'bg-violet-600', text: 'With Scrutinizer 2', section: 'With Scrutinizer 2' },
  needs_revision: { color: 'bg-red-500', text: 'Needs Revision', section: 'Needs Revision' },
  scrutinizer2_approved: { color: 'bg-emerald-600', text: 'S2 Approved', section: 'Scrutinizer Approved' },
  randomized: { color: 'bg-amber-500', text: 'Randomized', section: 'Randomized Papers' },
  with_panel: { color: 'bg-cyan-600', text: 'With Panel', section: 'Received by Panel' },
  returned_to_faculties: { color: 'bg-teal-600', text: 'Returned to Faculties', section: 'Returned to Faculties' },
  with_hod: { color: 'bg-purple-600', text: 'With HOD', section: 'Received by HOD' },
  hod_approved: { color: 'bg-green-600', text: 'HOD Approved', section: 'Approved by HOD' },
  reviewed: { color: 'bg-green-500', text: 'Reviewed', section: 'Reviewed Papers' },
  finalized: { color: 'bg-purple-500', text: 'Finalized', section: 'Final Approved Papers' },
};

const PANEL_STATUS_ORDER = [
  'with_panel',
  'with_hod',
  'returned_to_faculties',
  'hod_approved',
  'reviewed',
  'finalized',
  'randomized',
];

const HOD_STATUS_ORDER = ['with_hod', 'reviewed', 'hod_approved', 'finalized'];

const FILTERS_BY_ROLE = {
  faculty: ['draft', 'submitted', 'returned_to_faculties', 'reviewed', 'finalized'],
  scrutinizer: ['submitted', 'with_scrutinizer1', 'with_scrutinizer2', 'needs_revision', 'reviewed'],
  scrutinizer_1: ['submitted', 'with_scrutinizer1', 'needs_revision'],
  scrutinizer_2: ['with_scrutinizer2', 'scrutinizer2_approved', 'needs_revision'],
  panel_member: ['with_panel', 'with_hod', 'hod_approved', 'returned_to_faculties', 'randomized'],
  panel: ['with_panel', 'with_hod', 'hod_approved', 'returned_to_faculties', 'randomized'],
  hod: ['with_hod', 'reviewed', 'hod_approved', 'finalized'],
};

const QuestionPapers = () => {
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const statusFilter = searchParams.get('status');
  const isPanel = user.role === 'panel_member';
  const isHod = user.role === 'hod';
  const shouldGroupByStatus = !statusFilter && (isPanel || isHod);
  const availableFilters = FILTERS_BY_ROLE[user.role] || ['draft', 'submitted', 'reviewed', 'finalized'];

  useEffect(() => {
    fetchPapers();
  }, [statusFilter]);

  const fetchPapers = async () => {
    setLoading(true);
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await api.get('/questions/papers', { params });
      setPapers(response.data.data || []);
    } catch (error) {
      toast.error('Failed to fetch question papers');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const config = STATUS_META[status] || { color: 'bg-gray-500', text: status };
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
        reviewComments: comments,
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
        finalizationNotes: notes,
      });
      toast.success('Paper finalized successfully!');
      fetchPapers();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to finalize paper');
    }
  };

  const renderPaperCard = (paper) => (
    <div key={paper.id} className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition-shadow">
      <div className="flex flex-col gap-5 lg:flex-row lg:justify-between lg:items-start">
        <div className="flex-1">
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h3 className="text-xl font-bold text-gray-800">
              {paper.Course?.courseCode} - {paper.Course?.courseName}
            </h3>
            {getStatusBadge(paper.status)}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600 mb-3">
            <div>
              <strong>Exam Type:</strong> {paper.examType}
              {paper.catNumber ? ` - ${paper.catNumber}` : ''}
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

          {paper.reviewComments && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-2">
              <strong className="text-green-700">Review Comments:</strong>
              <p className="text-sm text-gray-700 mt-1">{paper.reviewComments}</p>
              <p className="text-xs text-gray-500 mt-1">Reviewed by: {paper.reviewer?.username}</p>
            </div>
          )}

          {paper.finalizationNotes && (
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
              <strong className="text-purple-700">Finalization Notes:</strong>
              <p className="text-sm text-gray-700 mt-1">{paper.finalizationNotes}</p>
              <p className="text-xs text-gray-500 mt-1">Finalized by: {paper.finalizer?.username}</p>
            </div>
          )}

          {paper.status === 'returned_to_faculties' && (
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-3 mt-2">
              <strong className="text-teal-700">Panel Finalization:</strong>
              <p className="text-sm text-gray-700 mt-1">
                This finalized paper has been shared with all faculties.
                {paper.answerKeyGeneratedAt ? ' The answer key is available in the paper details.' : ''}
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col space-y-2 lg:w-48">
          <button
            onClick={() => handleViewPaper(paper.id)}
            className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
          >
            View Details
          </button>

          {user.role === 'faculty' && paper.createdBy === user.id && paper.status === 'draft' && (
            <button
              onClick={() => handleSubmitPaper(paper.id)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
            >
              Submit for Review
            </button>
          )}

          {(user.role === 'scrutinizer' || user.role === 'scrutinizer_1') && paper.status === 'submitted' && (
            <button
              onClick={() => handleReviewPaper(paper.id)}
              className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg font-semibold text-sm"
            >
              Review Paper
            </button>
          )}

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
  );

  const getGroupedSections = () => {
    const groups = papers.reduce((acc, paper) => {
      const key = paper.status || 'unknown';
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(paper);
      return acc;
    }, {});

    const order = isPanel ? PANEL_STATUS_ORDER : HOD_STATUS_ORDER;
    const orderedSections = order
      .filter((status) => groups[status]?.length)
      .map((status) => ({
        status,
        title: STATUS_META[status]?.section || status,
        items: groups[status],
      }));

    const remainingSections = Object.keys(groups)
      .filter((status) => !order.includes(status))
      .sort()
      .map((status) => ({
        status,
        title: STATUS_META[status]?.section || status,
        items: groups[status],
      }));

    return [...orderedSections, ...remainingSections];
  };

  const renderEmptyState = () => (
    <div className="bg-white rounded-xl shadow-lg p-12 text-center">
      <div className="text-6xl mb-4">Papers</div>
      <h3 className="text-2xl font-bold text-gray-700 mb-2">No Papers Found</h3>
      <p className="text-gray-600 mb-6">
        {user.role === 'faculty'
          ? "You haven't created any question papers yet."
          : 'No papers are available in this category right now.'}
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
  );

  const renderFilterButtons = () => {
    return (
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          onClick={() => navigate('/papers')}
          className={`min-w-[140px] px-4 py-2 rounded-lg font-semibold transition-colors ${
            !statusFilter ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
          }`}
        >
          <span className="inline-flex w-full items-center justify-between gap-2 whitespace-nowrap">
            <span>All Papers</span>
            <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
              !statusFilter ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
            }`}>
              {papers.length}
            </span>
          </span>
        </button>
        {availableFilters.map((status) => (
          <button
            key={status}
            onClick={() => navigate(`/papers?status=${status}`)}
            className={`min-w-[170px] px-4 py-2 rounded-lg font-semibold transition-colors ${
              statusFilter === status ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-100'
            }`}
          >
            <span className="inline-flex w-full items-center justify-between gap-2 whitespace-nowrap">
              <span>{STATUS_META[status]?.text || status}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${
                statusFilter === status ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-600'
              }`}>
                {filterCounts[status] || 0}
              </span>
            </span>
          </button>
        ))}
      </div>
    );
  };

  const groupedSections = shouldGroupByStatus ? getGroupedSections() : [];
  const filterCounts = papers.reduce((acc, paper) => {
    const key = paper.status || 'unknown';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-800 mb-2">Question Papers</h1>
          <p className="text-gray-600">
            {statusFilter
              ? `Showing ${STATUS_META[statusFilter]?.text || statusFilter} papers`
              : shouldGroupByStatus
                ? 'Papers organized by workflow status'
                : 'All question papers in the system'}
          </p>
        </div>

        {renderFilterButtons()}

        {loading ? (
          <div className="text-center py-12">
            <div className="text-2xl text-indigo-600">Loading papers...</div>
          </div>
        ) : papers.length === 0 ? (
          renderEmptyState()
        ) : shouldGroupByStatus ? (
          <div className="space-y-8">
            {groupedSections.map((section) => (
              <section key={section.status} className="space-y-4">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">{section.title}</h2>
                    <p className="text-sm text-gray-500 mt-1">{section.items.length} paper(s)</p>
                  </div>
                  {getStatusBadge(section.status)}
                </div>
                <div className="grid grid-cols-1 gap-6">
                  {section.items.map((paper) => renderPaperCard(paper))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {papers.map((paper) => renderPaperCard(paper))}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuestionPapers;
