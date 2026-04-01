import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { useAuth } from '../context/authContext';
import api from '../services/api';

function NotificationCard({ item, onOpen }) {
  const tone = item.type === 'success'
    ? 'border-green-200 bg-green-50 text-green-900'
    : 'border-blue-200 bg-blue-50 text-blue-900';

  return (
    <button onClick={() => onOpen(item.paperId)} className={`w-full rounded-xl border p-4 text-left transition hover:shadow-md ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="font-semibold">{item.title}</div>
          <div className="mt-1 text-sm opacity-90">{item.message}</div>
        </div>
        <div className="text-xs opacity-70 whitespace-nowrap">{new Date(item.createdAt).toLocaleDateString()}</div>
      </div>
    </button>
  );
}

function HODPaperCard({ paper, reviewValue, onReviewChange, onView, onApprove, onReject, acting }) {
  const isPending = paper.status === 'with_hod';

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden border border-purple-100">
      <div className="bg-gray-900 text-white p-4 border-b-2 border-purple-400">
        <div className="flex items-center gap-2 flex-wrap">
          <h3 className="text-lg font-bold">{paper.courseCode} - {paper.examType} {paper.catNumber || ''}</h3>
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

        {(paper.panelMemberComments || paper.hodComments) && (
          <div className="space-y-2 mb-4">
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

        {isPending && (
          <textarea
            value={reviewValue}
            onChange={(e) => onReviewChange(e.target.value)}
            rows={3}
            placeholder="Enter approval or rejection comments..."
            className="w-full border border-gray-200 rounded-lg p-3 text-sm resize-none focus:outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
          />
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
          <button onClick={onView} className="py-2 px-4 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg font-semibold text-sm transition-all">
            View Paper
          </button>
          {isPending ? (
            <>
              <button onClick={onApprove} disabled={acting === 'approve'} className="py-2 px-4 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50">
                {acting === 'approve' ? 'Approving...' : 'Approve'}
              </button>
              <button onClick={onReject} disabled={acting === 'reject'} className="py-2 px-4 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold text-sm transition-all disabled:opacity-50">
                {acting === 'reject' ? 'Rejecting...' : 'Reject to Panel'}
              </button>
            </>
          ) : (
            <div className="md:col-span-2 rounded-lg border border-dashed border-gray-200 px-4 py-2 text-sm text-gray-500 flex items-center justify-center">
              Finalized paper
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, children, count }) {
  return (
    <section className="mb-10">
      <div className="flex items-end justify-between gap-4 mb-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">{title}</h2>
          <p className="text-sm text-gray-500 mt-1">{subtitle}</p>
        </div>
        <div className="text-sm text-gray-500">{count} paper{count === 1 ? '' : 's'}</div>
      </div>
      {children}
    </section>
  );
}

export default function HODDashboardV2() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({ pendingApproval: [], approvedPapers: [], notifications: [] });
  const [comments, setComments] = useState({});
  const [busy, setBusy] = useState({});

  const fetchOverview = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/hod/overview');
      if (response.data.success) {
        setOverview({
          pendingApproval: response.data.pendingApproval || [],
          approvedPapers: response.data.approvedPapers || [],
          notifications: response.data.notifications || [],
        });
      }
    } catch (error) {
      console.error('Failed to fetch HOD overview:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
  }, [fetchOverview]);

  const handleApprove = async (paperId) => {
    const comment = comments[paperId]?.trim();
    if (!comment) {
      alert('Please add approval comments');
      return;
    }

    setBusy((prev) => ({ ...prev, [paperId]: 'approve' }));
    try {
      const response = await api.post(`/hod/papers/${paperId}/approve`, { comments: comment });
      if (response.data.success) {
        alert('Paper approved successfully');
        fetchOverview();
      }
    } catch (error) {
      alert('Failed to approve paper: ' + (error.response?.data?.error || error.message));
    } finally {
      setBusy((prev) => ({ ...prev, [paperId]: null }));
    }
  };

  const handleReject = async (paperId) => {
    const comment = comments[paperId]?.trim();
    if (!comment) {
      alert('Please add rejection comments');
      return;
    }

    setBusy((prev) => ({ ...prev, [paperId]: 'reject' }));
    try {
      const response = await api.post(`/hod/papers/${paperId}/reject`, { comments: comment });
      if (response.data.success) {
        alert('Paper rejected back to panel');
        fetchOverview();
      }
    } catch (error) {
      alert('Failed to reject paper: ' + (error.response?.data?.error || error.message));
    } finally {
      setBusy((prev) => ({ ...prev, [paperId]: null }));
    }
  };

  const stats = [
    { label: 'Pending Approval', value: overview.pendingApproval.length, color: 'text-blue-700' },
    { label: 'Approved Papers', value: overview.approvedPapers.length, color: 'text-green-600' },
    { label: 'Notifications', value: overview.notifications.length, color: 'text-purple-600' },
  ];

  return (
    <div className="min-h-screen dashboard-bg">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-bold text-gray-800 mb-3">HOD Dashboard</h1>
          <p className="text-xl text-gray-600">Review pending papers, approve final submissions, and track completed approvals.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg p-6 mb-8 max-w-3xl mx-auto">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h3 className="text-xl font-bold text-gray-800">{user?.username}</h3>
              <p className="text-gray-600">{user?.email}</p>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 rounded-full bg-blue-100 text-blue-800 font-bold border border-blue-200">HOD</div>
              <button onClick={() => { logout(); navigate('/login'); }} className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-semibold">
                Logout
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-10">
          {stats.map((stat) => (
            <div key={stat.label} className="bg-white rounded-2xl shadow p-6 text-center">
              <div className={`text-3xl font-bold ${stat.color}`}>{stat.value}</div>
              <div className="text-sm text-gray-600 mt-1">{stat.label}</div>
            </div>
          ))}
        </div>

        <Section title="Notifications" subtitle="New submissions and recently approved papers." count={overview.notifications.length}>
          {overview.notifications.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
              No notifications right now.
            </div>
          ) : (
            <div className="grid gap-4">
              {overview.notifications.slice(0, 6).map((item) => (
                <NotificationCard key={item.id} item={item} onOpen={(paperId) => navigate(`/papers/${paperId}`)} />
              ))}
            </div>
          )}
        </Section>

        {loading ? (
          <div className="text-center py-16 text-gray-500">
            <div className="inline-block w-12 h-12 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mb-4" />
            <p>Loading HOD overview...</p>
          </div>
        ) : (
          <>
            <Section title="Pending Papers" subtitle="These papers are waiting for your approval." count={overview.pendingApproval.length}>
              {overview.pendingApproval.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
                  No pending approvals.
                </div>
              ) : (
                <div className="grid gap-6">
                  {overview.pendingApproval.map((paper) => (
                    <HODPaperCard
                      key={paper.id}
                      paper={paper}
                      reviewValue={comments[paper.id] || ''}
                      onReviewChange={(value) => setComments((prev) => ({ ...prev, [paper.id]: value }))}
                      onView={() => navigate(`/papers/${paper.id}`)}
                      onApprove={() => handleApprove(paper.id)}
                      onReject={() => handleReject(paper.id)}
                      acting={busy[paper.id] || null}
                    />
                  ))}
                </div>
              )}
            </Section>

            <Section title="Approved Papers" subtitle="These papers have already been approved by you." count={overview.approvedPapers.length}>
              {overview.approvedPapers.length === 0 ? (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-white p-8 text-center text-gray-500">
                  No approved papers yet.
                </div>
              ) : (
                <div className="grid gap-6">
                  {overview.approvedPapers.map((paper) => (
                    <HODPaperCard
                      key={paper.id}
                      paper={paper}
                      reviewValue=""
                      onReviewChange={() => {}}
                      onView={() => navigate(`/papers/${paper.id}`)}
                      onApprove={() => {}}
                      onReject={() => {}}
                      acting={null}
                    />
                  ))}
                </div>
              )}
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
