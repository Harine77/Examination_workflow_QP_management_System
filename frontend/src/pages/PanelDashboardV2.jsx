import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/authContext';
import api from '../services/api';

function NotificationCard({ item, onOpen }) {
  const tone = item.type === 'success'
    ? 'border-green-200 bg-green-50 text-green-900'
    : item.type === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
    <button
      onClick={() => onOpen(item.paperId)}
      className={`w-full rounded-xl border p-4 text-left transition hover:shadow-md ${tone}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{item.title}</div>
          <div className="mt-1 text-sm opacity-90">{item.message}</div>
        </div>
        <div className="text-xs opacity-70 whitespace-nowrap">
          {new Date(item.createdAt).toLocaleDateString()}
        </div>
      </div>
    </button>
  );
}

function PaperCard({ paper, comment, onCommentChange, onView, onSubmit, onReturn, busyState }) {
  const canSubmit = paper.status === 'with_panel';
  const canReturn = ['with_panel', 'with_hod', 'hod_approved'].includes(paper.status);
  const canComment = canReturn;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-blue-100">
      <div className="bg-gray-900 text-white p-4 border-b-2 border-blue-500">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-bold">{paper.courseCode} - {paper.examType} {paper.catNumber || ''}</h3>
          {paper.isShuffled && (
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-400 text-green-900">Shuffled</span>
          )}
          <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-white/10">{paper.status}</span>
        </div>
        <p className="text-sm text-gray-300 mt-1">{paper.courseName} · Created by {paper.createdBy}</p>
      </div>

      <div className="p-5">
        <div className="grid grid-cols-3 gap-3 mb-4 text-center text-sm">
          <div className="bg-blue-50 rounded-lg p-3">
            <div className="font-bold text-blue-700">{paper.sections?.['2M']?.length || 0}</div>
            <div className="text-gray-500">2-Mark</div>
          </div>
          <div className="bg-orange-50 rounded-lg p-3">
            <div className="font-bold text-orange-700">{paper.sections?.['6M']?.length || 0}</div>
            <div className="text-gray-500">6-Mark</div>
          </div>
          <div className="bg-purple-50 rounded-lg p-3">
            <div className="font-bold text-purple-700">{paper.sections?.['12M']?.length || 0}</div>
            <div className="text-gray-500">12-Mark</div>
          </div>
        </div>

        {(paper.scrutinizer2Comments || paper.panelMemberComments || paper.hodComments) && (
          <div className="space-y-2 mb-4">
            {paper.scrutinizer2Comments && (
              <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm text-gray-700">
                <span className="font-semibold">Scrutinizer 2:</span> {paper.scrutinizer2Comments}
              </div>
            )}
            {paper.panelMemberComments && (
              <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-3 text-sm text-yellow-900">
                <span className="font-semibold">Panel Comments:</span> {paper.panelMemberComments}
              </div>
            )}
            {paper.hodComments && (
              <div className="rounded-lg border border-purple-200 bg-purple-50 p-3 text-sm text-purple-900">
                <span className="font-semibold">HOD Comments:</span> {paper.hodComments}
              </div>
            )}
          </div>
        )}

        {canComment && (
          <textarea
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-yellow-100"
            rows={3}
            placeholder="Add panel comments for HOD or faculties (optional)..."
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <button
            onClick={onView}
            className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all"
          >
            View Paper
          </button>

          {(canSubmit || canReturn) ? (
            <>
              {canSubmit ? (
                <button
                  onClick={onSubmit}
                  disabled={busyState === 'submit'}
                  className="py-2 px-4 bg-blue-700 hover:bg-blue-800 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {busyState === 'submit' ? 'Submitting...' : 'Submit to HOD'}
                </button>
              ) : (
                <div className="py-2 px-4 rounded-lg border border-dashed border-blue-200 bg-blue-50 text-blue-800 text-sm font-semibold flex items-center justify-center">
                  Already submitted to HOD
                </div>
              )}

              {canReturn ? (
                <button
                  onClick={onReturn}
                  disabled={busyState === 'return'}
                  className="py-2 px-4 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50"
                >
                  {busyState === 'return' ? 'Generating...' : 'Return to Faculties'}
                </button>
              ) : (
                <div className="py-2 px-4 rounded-lg border border-dashed border-teal-200 bg-teal-50 text-teal-800 text-sm font-semibold flex items-center justify-center">
                  Already returned
                </div>
              )}
            </>
          ) : (
            <div className="md:col-span-2 rounded-lg border border-dashed border-gray-200 px-4 py-2 text-sm text-gray-500 flex items-center justify-center">
              Read-only in this stage
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PaperSection({ title, subtitle, papers, cardPropsBuilder }) {
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="text-sm text-gray-500">{papers.length} paper{papers.length === 1 ? '' : 's'}</div>
      </div>

      {papers.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
          No papers in this section right now.
        </div>
      ) : (
        <div className="grid gap-6">
          {papers.map((paper) => (
            <PaperCard key={paper.id} paper={paper} {...cardPropsBuilder(paper)} />
          ))}
        </div>
      )}
    </section>
  );
}

export default function PanelDashboardV2() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [comments, setComments] = useState({});
  const [busy, setBusy] = useState({});
  const [overview, setOverview] = useState({
    pendingReview: [],
    submittedToHod: [],
    returnedToFaculties: [],
    hodApproved: [],
    notifications: [],
  });

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/hod/panel/overview');
      if (response.data.success) {
        setOverview({
          pendingReview: response.data.pendingReview || [],
          submittedToHod: response.data.submittedToHod || [],
          returnedToFaculties: response.data.returnedToFaculties || [],
          hodApproved: response.data.hodApproved || [],
          notifications: response.data.notifications || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch panel overview:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const setBusyState = (paperId, state) => setBusy((prev) => ({ ...prev, [paperId]: state }));

  const handleSubmit = async (paperId) => {
    setBusyState(paperId, 'submit');
    try {
      const response = await api.post(`/hod/panel/papers/${paperId}/submit`, {
        comments: comments[paperId] || '',
      });
      if (response.data.success) {
        alert('Paper submitted to HOD successfully');
        fetchOverview();
      }
    } catch (error) {
      alert('Failed to submit: ' + (error.response?.data?.error || error.message));
    } finally {
      setBusyState(paperId, null);
    }
  };

  const handleReturn = async (paperId) => {
    setBusyState(paperId, 'return');
    try {
      const response = await api.post(`/hod/panel/papers/${paperId}/return-to-faculties`, {
        comments: comments[paperId] || '',
      });
      if (response.data.success) {
        alert('Paper returned to faculties with answer key');
        fetchOverview();
      }
    } catch (error) {
      alert('Failed to return paper: ' + (error.response?.data?.error || error.message));
    } finally {
      setBusyState(paperId, null);
    }
  };

  const stats = [
    { label: 'Pending Review', value: overview.pendingReview.length, color: 'text-blue-700' },
    { label: 'Submitted to HOD', value: overview.submittedToHod.length, color: 'text-blue-600' },
    { label: 'Returned to Faculties', value: overview.returnedToFaculties.length, color: 'text-teal-600' },
    { label: 'HOD Approved', value: overview.hodApproved.length, color: 'text-green-600' },
  ];

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-800 mb-3">Panel Dashboard</h1>
          <p className="text-xl text-gray-600">Track papers across review, HOD submission, and final return-to-faculty stages.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{user?.username}</h3>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">PANEL MEMBER</div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow p-6 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <section className="mb-10">
          <div className="flex items-end justify-between gap-4 mb-4">
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
              <p className="text-sm text-gray-500 mt-1">Recent workflow updates from HOD and the panel queue.</p>
            </div>
          </div>

          {overview.notifications.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
              No notifications yet.
            </div>
          ) : (
            <div className="grid gap-4">
              {overview.notifications.slice(0, 6).map((item) => (
                <NotificationCard key={item.id} item={item} onOpen={(paperId) => navigate(`/papers/${paperId}`)} />
              ))}
            </div>
          )}
        </section>

        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <div className="inline-block w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p>Loading panel overview...</p>
          </div>
        ) : (
          <>
            <PaperSection
              title="Awaiting Panel Review"
              subtitle="These papers still have both panel actions available."
              papers={overview.pendingReview}
              cardPropsBuilder={(paper) => ({
                comment: comments[paper.id] || '',
                onCommentChange: (value) => setComments((prev) => ({ ...prev, [paper.id]: value })),
                onView: () => navigate(`/papers/${paper.id}`),
                onSubmit: () => handleSubmit(paper.id),
                onReturn: () => handleReturn(paper.id),
                busyState: busy[paper.id] || null,
              })}
            />

            <PaperSection
              title="Submitted to HOD"
              subtitle="Papers already moved to HOD are listed here so the panel can keep tracking them."
              papers={overview.submittedToHod}
              cardPropsBuilder={(paper) => ({
                comment: comments[paper.id] || '',
                onCommentChange: () => {},
                onView: () => navigate(`/papers/${paper.id}`),
                onSubmit: () => {},
                onReturn: () => {},
                busyState: null,
              })}
            />

            <PaperSection
              title="Returned to Faculties"
              subtitle="These finalized papers have already gone back to faculty with answer keys."
              papers={overview.returnedToFaculties}
              cardPropsBuilder={(paper) => ({
                comment: comments[paper.id] || '',
                onCommentChange: () => {},
                onView: () => navigate(`/papers/${paper.id}`),
                onSubmit: () => {},
                onReturn: () => {},
                busyState: null,
              })}
            />

            <PaperSection
              title="HOD Approved"
              subtitle="Approved papers can still be returned to faculties with an answer key."
              papers={overview.hodApproved}
              cardPropsBuilder={(paper) => ({
                comment: comments[paper.id] || '',
                onCommentChange: (value) => setComments((prev) => ({ ...prev, [paper.id]: value })),
                onView: () => navigate(`/papers/${paper.id}`),
                onSubmit: () => {},
                onReturn: () => handleReturn(paper.id),
                busyState: busy[paper.id] || null,
              })}
            />
          </>
        )}
      </div>
    </div>
  );
}
