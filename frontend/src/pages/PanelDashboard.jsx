import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import api from '../services/api';
import Navbar from '../components/Navbar';

const PanelDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [submittedPapers, setSubmittedPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ withPanel: 0, submitted: 0 });
  const [comments, setComments] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [showSubmitted, setShowSubmitted] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const [papersRes, statusRes, submittedRes] = await Promise.all([
        api.get('/hod/panel/papers').catch(() => null),
        api.get('/hod/panel/status').catch(() => null),
        api.get('/hod/panel/approved-papers').catch(() => null),
      ]);
      if (papersRes?.data?.success) setPapers(papersRes.data.papers || []);
      if (statusRes?.data?.success) setStats(statusRes.data.summary || {});
      if (submittedRes?.data?.success) setSubmittedPapers(submittedRes.data.papers || []);
    } catch (err) {
      console.error('Failed to fetch panel data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPapers(); }, [fetchPapers]);

  const handleSubmitToHOD = async (paperId) => {
    const comment = comments[paperId] || '';
    setSubmitting(paperId);
    try {
      const res = await api.post(`/hod/panel/papers/${paperId}/submit`, { comments: comment });
      if (res.data.success) {
        alert('Paper submitted to HOD successfully');
        fetchPapers();
      }
    } catch (err) {
      alert('Failed to submit: ' + (err.response?.data?.error || err.message));
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="min-h-screen bg-ssn-light">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">

        {/* Welcome */}
        <div className="text-center mb-12">
          <div className="inline-block bg-ssn-blue text-white rounded-2xl p-5 mb-6">
            <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
            </svg>
          </div>
          <h1 className="text-5xl font-bold text-ssn-dark mb-3">Panel Dashboard</h1>
          <p className="text-xl text-gray-600 font-normal">Review and forward question papers to HOD</p>
        </div>

        {/* User Info */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8 max-w-2xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{user?.username}</h3>
              <p className="text-gray-600 font-normal">{user?.email}</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-ssn-light text-ssn-blue font-bold text-sm">PANEL</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 max-w-4xl mx-auto mb-8">
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-ssn-blue">{stats.withPanel ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1 font-normal">Awaiting Review</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-blue-600">{stats.submitted ?? 0}</div>
            <div className="text-sm text-gray-600 mt-1 font-normal">Submitted to HOD</div>
          </div>
          <div className="bg-white rounded-xl shadow p-6 text-center">
            <div className="text-3xl font-bold text-gray-600">{papers.length}</div>
            <div className="text-sm text-gray-600 mt-1 font-normal">Total Papers</div>
          </div>
        </div>

        {/* Quick Nav */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto mb-10">
          <button onClick={() => navigate('/papers')} className="bg-white border-l-4 border-ssn-blue hover:shadow-lg rounded-xl p-8 shadow transition-all text-left">
            <div className="mb-4 inline-block bg-ssn-light p-3 rounded-lg">
              <svg className="w-8 h-8 text-ssn-blue" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-ssn-dark mb-2">View All Papers</h3>
            <p className="text-gray-600 font-normal">Browse all question papers in the system</p>
          </button>
          <button onClick={() => navigate('/papers?status=with_panel')} className="bg-white border-l-4 border-gray-400 hover:shadow-lg rounded-xl p-8 shadow transition-all text-left">
            <div className="mb-4 inline-block bg-gray-100 p-3 rounded-lg">
              <svg className="w-8 h-8 text-gray-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
              </svg>
            </div>
            <h3 className="text-2xl font-bold text-ssn-dark mb-2">Papers Awaiting Review</h3>
            <p className="text-gray-600 font-normal">Open randomized final papers and forward to HOD</p>
          </button>
        </div>

        {/* Pending Papers */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Papers Assigned to Panel</h2>

          {loading ? (
            <div className="text-center py-12 text-gray-500">
              <div className="inline-block w-10 h-10 border-4 border-ssn-blue border-t-transparent rounded-full animate-spin mb-3" />
              <p className="font-normal">Loading papers...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="bg-white rounded-xl shadow p-10 text-center text-gray-500 border-2 border-dashed border-gray-200">
              <p className="text-lg font-semibold">No papers assigned yet</p>
              <p className="text-sm mt-1">Papers will appear here once Scrutinizer 2 sends them to the panel.</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {papers.map(paper => (
                <div key={paper.id} className="bg-white rounded-xl shadow-lg overflow-hidden">
                  <div className="bg-gray-900 text-white p-4 border-b-2 border-yellow-400">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-bold">{paper.courseCode} - {paper.examType} {paper.catNumber}</h3>
                      {paper.isShuffled && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-400 text-green-900">Shuffled</span>
                      )}
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{paper.courseName} · Created by {paper.createdBy}</p>
                  </div>
                  <div className="p-5">
                    <div className="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
                      <div className="bg-blue-50 rounded-lg p-3">
                        <div className="font-bold text-blue-700">{paper.sections?.['2M']?.length || 0}</div>
                        <div className="text-gray-500">2-Mark Qs</div>
                      </div>
                      <div className="bg-orange-50 rounded-lg p-3">
                        <div className="font-bold text-orange-700">{paper.sections?.['6M']?.length || 0}</div>
                        <div className="text-gray-500">6-Mark Qs</div>
                      </div>
                      <div className="bg-purple-50 rounded-lg p-3">
                        <div className="font-bold text-purple-700">{paper.sections?.['12M']?.length || 0}</div>
                        <div className="text-gray-500">12-Mark Qs</div>
                      </div>
                    </div>
                    {paper.scrutinizer2Comments && (
                      <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-4 text-sm text-gray-700">
                        <span className="font-semibold">Scrutinizer 2 Notes:</span> {paper.scrutinizer2Comments}
                      </div>
                    )}
                    {paper.hodComments && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 text-sm text-red-700">
                        <span className="font-semibold">⚠ HOD Returned:</span> {paper.hodComments}
                      </div>
                    )}
                    <textarea
                      className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
                      rows={3}
                      placeholder="Add comments for HOD (optional)..."
                      value={comments[paper.id] || ''}
                      onChange={e => setComments(prev => ({ ...prev, [paper.id]: e.target.value }))}
                    />
                    <div className="flex gap-3 mt-3">
                      <button onClick={() => navigate(`/papers/${paper.id}`)} className="flex-1 py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all">
                        View Paper
                      </button>
                      <button
                        onClick={() => handleSubmitToHOD(paper.id)}
                        disabled={submitting === paper.id}
                        className="flex-1 py-2 px-4 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                      >
                        {submitting === paper.id ? 'Submitting...' : '→ Submit to HOD'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Submitted Papers — collapsible */}
        <div className="max-w-4xl mx-auto mt-12">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-gray-800">Papers Submitted to HOD</h2>
              <span className="px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-sm font-bold">
                {submittedPapers.length} total
              </span>
            </div>
            <button
              onClick={() => { setShowSubmitted(v => !v); setExpandedId(null); }}
              className="flex items-center gap-2 px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold text-sm transition-all shadow"
            >
              {showSubmitted ? '▲ Hide Papers' : '▼ View Submitted Papers'}
            </button>
          </div>

          {showSubmitted && (
            !loading && submittedPapers.length === 0 ? (
              <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400 border-2 border-dashed border-gray-200">
                <p className="text-base font-semibold">No submitted papers yet</p>
              </div>
            ) : (
              <div className="grid gap-3">
                {submittedPapers.map(paper => {
                  const isApproved = paper.status === 'hod_approved';
                  const isOpen = expandedId === paper.id;
                  return (
                    <div key={paper.id} className="bg-white rounded-xl shadow overflow-hidden">
                      {/* Compact row */}
                      <button
                        onClick={() => setExpandedId(isOpen ? null : paper.id)}
                        className={`w-full text-left p-4 flex items-center justify-between gap-4 transition-colors ${isApproved ? 'hover:bg-green-50' : 'hover:bg-blue-50'}`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <span className={`w-8 h-8 flex-shrink-0 rounded-full flex items-center justify-center font-bold text-sm ${isApproved ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isApproved ? '✓' : '⏳'}
                          </span>
                          <div className="min-w-0">
                            <p className="font-bold text-gray-800 truncate">
                              {paper.courseCode} — {paper.examType} {paper.catNumber}
                              {paper.isShuffled && <span className="ml-2 text-xs font-normal text-green-600">🎲 Shuffled</span>}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {paper.courseName} · by {paper.createdBy} · {new Date(paper.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className={`hidden sm:inline px-3 py-1 rounded-full text-xs font-bold ${isApproved ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                            {isApproved ? 'HOD Approved' : 'With HOD'}
                          </span>
                          <span className="text-gray-400 text-lg">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </button>

                      {/* Expanded details */}
                      {isOpen && (
                        <div className="border-t border-gray-100 p-5">
                          <div className="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
                            <div className="bg-blue-50 rounded-lg p-3">
                              <div className="font-bold text-blue-700">{paper.sections?.['2M']?.length || 0}</div>
                              <div className="text-gray-500">2-Mark Qs</div>
                            </div>
                            <div className="bg-orange-50 rounded-lg p-3">
                              <div className="font-bold text-orange-700">{paper.sections?.['6M']?.length || 0}</div>
                              <div className="text-gray-500">6-Mark Qs</div>
                            </div>
                            <div className="bg-purple-50 rounded-lg p-3">
                              <div className="font-bold text-purple-700">{paper.sections?.['12M']?.length || 0}</div>
                              <div className="text-gray-500">12-Mark Qs</div>
                            </div>
                          </div>
                          {paper.examDate && (
                            <p className="text-sm text-gray-500 mb-3">
                              Exam date: {new Date(paper.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                            </p>
                          )}
                          {paper.panelMemberComments && (
                            <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3 text-sm text-gray-700">
                              <span className="font-semibold">Your Notes:</span> {paper.panelMemberComments}
                            </div>
                          )}
                          {paper.hodComments && (
                            <div className={`rounded-lg p-3 mb-3 text-sm border ${isApproved ? 'bg-green-50 border-green-200 text-green-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
                              <span className="font-semibold">HOD Comments:</span> {paper.hodComments}
                            </div>
                          )}
                          <button
                            onClick={() => navigate(`/papers/${paper.id}`)}
                            className="w-full py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all"
                          >
                            View Full Paper
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          )}
        </div>

      </div>
    </div>
  );
};

export default PanelDashboard;
