import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import api from '../services/api';

const HODDashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [papers, setPapers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaperId, setSelectedPaperId] = useState(null);
  const [comments, setComments] = useState('');
  const [activityLog, setActivityLog] = useState(null);
  const [showActivityLog, setShowActivityLog] = useState(false);

  const styles = `
    .hod-container {
      background: #FAFAFA;
      color: #0A0A0A;
      font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
    }

    .hod-header {
      background: #0A0A0A;
      color: #FAFAFA;
      padding: 2rem;
      border-bottom: 4px solid #F5C400;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .hod-header h1 {
      font-size: 2.5rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.03em;
    }

    .hod-header .subtitle {
      font-size: 0.9rem;
      color: #ABABAB;
      margin-top: 0.5rem;
    }

    .hod-header-right {
      display: flex;
      gap: 1rem;
      align-items: center;
    }

    .logout-btn {
      padding: 0.6rem 1.2rem;
      background: rgba(192, 57, 43, 0.2);
      border: 1px solid rgba(192, 57, 43, 0.5);
      color: #FF6B6B;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
    }

    .logout-btn:hover {
      background: rgba(192, 57, 43, 0.4);
      border-color: #FF6B6B;
    }

    .hod-main {
      max-width: 1400px;
      margin: 0 auto;
      padding: 2rem 1.5rem;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 2rem;
    }

    .stat-card {
      background: white;
      border: 1px solid #E0E0E0;
      border-left: 4px solid #F5C400;
      border-radius: 8px;
      padding: 1.5rem;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06);
    }

    .stat-label {
      font-size: 0.85rem;
      color: #6B6B6B;
      font-weight: 600;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .stat-value {
      font-size: 2rem;
      font-weight: 800;
      color: #0A0A0A;
    }

    .papers-title {
      font-size: 1.8rem;
      font-weight: 800;
      margin-bottom: 1.5rem;
      color: #0A0A0A;
    }

    .papers-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }

    .paper-card {
      background: white;
      border: 1px solid #E0E0E0;
      border-radius: 10px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }

    .paper-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
    }

    .paper-card-header {
      background: #0A0A0A;
      color: white;
      padding: 1rem;
      border-bottom: 2px solid #F5C400;
    }

    .paper-card-title {
      font-size: 1.1rem;
      font-weight: 700;
      margin: 0;
    }

    .paper-card-meta {
      font-size: 0.8rem;
      color: #ABABAB;
      margin-top: 0.4rem;
    }

    .paper-card-body {
      padding: 1.2rem;
    }

    .paper-info {
      margin-bottom: 1rem;
    }

    .paper-info p {
      margin: 0.5rem 0;
      font-size: 0.9rem;
    }

    .paper-info label {
      font-weight: 600;
      color: #0A0A0A;
    }

    .paper-info-value {
      color: #6B6B6B;
    }

    .comment-section {
      background: #FAFAFA;
      border: 1px solid #E0E0E0;
      border-radius: 6px;
      padding: 1rem;
      margin-bottom: 1rem;
    }

    .comment-label {
      font-size: 0.8rem;
      font-weight: 600;
      color: #6B6B6B;
      text-transform: uppercase;
      margin-bottom: 0.5rem;
    }

    .comment-text {
      font-size: 0.9rem;
      color: #3A3A3A;
      line-height: 1.5;
      max-height: 150px;
      overflow-y: auto;
      background: white;
      padding: 0.75rem;
      border-radius: 4px;
      border: 1px solid #D4D4D4;
    }

    .hod-textarea {
      width: 100%;
      background: white;
      border: 1px solid #E0E0E0;
      border-radius: 6px;
      padding: 0.75rem;
      font-family: 'IBM Plex Sans', sans-serif;
      font-size: 0.9rem;
      resize: vertical;
      min-height: 100px;
      outline: none;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }

    .hod-textarea:focus {
      border-color: #F5C400;
      box-shadow: 0 0 0 3px rgba(245, 196, 0, 0.2);
    }

    .button-group {
      display: flex;
      gap: 1rem;
      margin-top: 1rem;
    }

    .btn {
      flex: 1;
      padding: 0.8rem 1.2rem;
      border: none;
      border-radius: 6px;
      font-family: 'IBM Plex Sans', sans-serif;
      font-weight: 600;
      cursor: pointer;
      transition: all 0.2s ease;
      font-size: 0.95rem;
    }

    .btn-approve {
      background: #1B7A3E;
      color: white;
    }

    .btn-approve:hover {
      background: #155a30;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(27, 122, 62, 0.3);
    }

    .btn-reject {
      background: #C0392B;
      color: white;
    }

    .btn-reject:hover {
      background: #a02e22;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(192, 57, 43, 0.3);
    }

    .btn-activity {
      background: #3A3A3A;
      color: white;
    }

    .btn-activity:hover {
      background: #2A2A2A;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
    }

    .btn:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    .empty-state {
      text-align: center;
      padding: 3rem;
      background: white;
      border: 2px dashed #E0E0E0;
      border-radius: 10px;
      color: #6B6B6B;
    }

    .empty-state h2 {
      margin: 0 0 0.5rem;
      color: #3A3A3A;
    }

    .modal-overlay {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.7);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }

    .modal {
      background: white;
      border-radius: 12px;
      max-width: 800px;
      width: 90%;
      max-height: 90vh;
      overflow-y: auto;
      box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
    }

    .modal-header {
      background: #0A0A0A;
      color: white;
      padding: 1.5rem;
      border-bottom: 2px solid #F5C400;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .modal-header h2 {
      margin: 0;
      font-size: 1.3rem;
    }

    .modal-close {
      background: none;
      border: none;
      color: white;
      font-size: 1.5rem;
      cursor: pointer;
    }

    .modal-body {
      padding: 2rem;
    }

    .activity-item {
      display: flex;
      gap: 1rem;
      padding: 1rem;
      border-left: 3px solid #F5C400;
      background: #FAFAFA;
      margin-bottom: 1rem;
      border-radius: 4px;
    }

    .activity-stage {
      font-weight: 600;
      color: #0A0A0A;
      min-width: 100px;
    }

    .activity-details {
      flex: 1;
    }

    .activity-action {
      font-weight: 600;
      color: #1B7A3E;
    }

    .activity-actor {
      font-size: 0.85rem;
      color: #6B6B6B;
      margin-top: 0.3rem;
    }

    .activity-timestamp {
      font-size: 0.8rem;
      color: #ABABAB;
      margin-top: 0.3rem;
    }

    .activity-comments {
      background: white;
      border: 1px solid #E0E0E0;
      border-radius: 4px;
      padding: 0.75rem;
      margin-top: 0.5rem;
      font-size: 0.9rem;
      color: #3A3A3A;
    }

    .loading {
      text-align: center;
      padding: 2rem;
      color: #6B6B6B;
    }

    .spinner {
      display: inline-block;
      width: 40px;
      height: 40px;
      border: 4px solid #E0E0E0;
      border-top-color: #F5C400;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;

  // Fetch papers for HOD
  const fetchPapers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get('/hod/papers');
      if (response.data.success) {
        setPapers(response.data.papers || []);
      }
    } catch (error) {
      console.error('Failed to fetch papers:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPapers();
  }, [fetchPapers]);

  const fetchActivityLog = useCallback(async (paperId) => {
    try {
      const response = await api.get(`/hod/papers/${paperId}/activity-log`);
      if (response.data.success) {
        setActivityLog(response.data);
        setShowActivityLog(true);
      }
    } catch (error) {
      console.error('Failed to fetch activity log:', error);
    }
  }, []);

  const handleApprove = async (paperId) => {
    if (!comments.trim()) {
      alert('Please add approval comments');
      return;
    }

    try {
      const response = await api.post(`/hod/papers/${paperId}/approve`, {
        comments
      });

      if (response.data.success) {
        alert('Paper approved successfully!');
        setSelectedPaperId(null);
        setComments('');
        fetchPapers();
      }
    } catch (error) {
      alert('Failed to approve paper: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleReject = async (paperId) => {
    if (!comments.trim()) {
      alert('Please add rejection comments');
      return;
    }

    try {
      const response = await api.post(`/hod/papers/${paperId}/reject`, {
        comments
      });

      if (response.data.success) {
        alert('Paper rejected and sent back to Panel Member');
        setSelectedPaperId(null);
        setComments('');
        fetchPapers();
      }
    } catch (error) {
      alert('Failed to reject paper: ' + (error.response?.data?.error || error.message));
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <style>{styles}</style>
      <div className="hod-container">
        {/* Header */}
        <div className="hod-header">
          <div>
            <h1>HOD Dashboard</h1>
            <p className="subtitle">Final Approval of Question Papers</p>
          </div>
          <div className="hod-header-right">
            <button className="logout-btn" onClick={handleLogout}>
              ← Logout
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="hod-main">
          {/* Stats */}
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-label">Pending Approval</div>
              <div className="stat-value">{papers.length}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Your Role</div>
              <div className="stat-value" style={{ fontSize: '1.3rem' }}>HOD</div>
            </div>
          </div>

          {/* Papers */}
          <h2 className="papers-title">Papers Awaiting Your Approval</h2>

          {loading ? (
            <div className="loading">
              <div className="spinner" />
              <p>Loading papers...</p>
            </div>
          ) : papers.length === 0 ? (
            <div className="empty-state">
              <h2>No pending papers</h2>
              <p>All papers have been processed. Great job!</p>
            </div>
          ) : (
            <div className="papers-grid">
              {papers.map(paper => (
                <div key={paper.id} className="paper-card">
                  <div className="paper-card-header">
                    <h3 className="paper-card-title">
                      {paper.courseCode} - {paper.examType}
                    </h3>
                    <p className="paper-card-meta">
                      {paper.catNumber} • Paper ID: {paper.id}
                    </p>
                  </div>

                  <div className="paper-card-body">
                    {/* Paper Info */}
                    <div className="paper-info">
                      <p>
                        <label>Course:</label>{' '}
                        <span className="paper-info-value">{paper.courseName}</span>
                      </p>
                      <p>
                        <label>Created By:</label>{' '}
                        <span className="paper-info-value">{paper.createdBy}</span>
                      </p>
                      <p>
                        <label>Created:</label>{' '}
                        <span className="paper-info-value">
                          {new Date(paper.createdAt).toLocaleDateString()}
                        </span>
                      </p>
                    </div>

                    {/* Sections Summary */}
                    <div className="paper-info">
                      <label>Question Sections:</label>
                      <p className="paper-info-value">
                        2M: {paper.sections['2M']?.length || 0} | 6M:{' '}
                        {paper.sections['6M']?.length || 0} | 12M:{' '}
                        {paper.sections['12M']?.length || 0}
                      </p>
                    </div>

                    {/* Panel Comments */}
                    {paper.panelMemberComments && (
                      <div className="comment-section">
                        <div className="comment-label">Panel Member Comments</div>
                        <div className="comment-text">{paper.panelMemberComments}</div>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="button-group">
                      <button
                        className="btn btn-activity"
                        onClick={() => fetchActivityLog(paper.id)}
                      >
                        View History
                      </button>
                      <button
                        className="btn btn-approve"
                        onClick={() =>
                          setSelectedPaperId(selectedPaperId === paper.id ? null : paper.id)
                        }
                      >
                        {selectedPaperId === paper.id ? 'Close' : 'Review'}
                      </button>
                    </div>

                    {/* Review Form */}
                    {selectedPaperId === paper.id && (
                      <div
                        style={{
                          marginTop: '1rem',
                          paddingTop: '1rem',
                          borderTop: '1px solid #E0E0E0'
                        }}
                      >
                        <label style={{ fontWeight: 600, display: 'block', marginBottom: '0.5rem' }}>
                          Your Comments (Required)
                        </label>
                        <textarea
                          className="hod-textarea"
                          placeholder="Enter your approval or rejection comments..."
                          value={comments}
                          onChange={e => setComments(e.target.value)}
                        />

                        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1rem' }}>
                          <button
                            className="btn btn-approve"
                            onClick={() => handleApprove(paper.id)}
                          >
                            ✓ Approve
                          </button>
                          <button
                            className="btn btn-reject"
                            onClick={() => handleReject(paper.id)}
                          >
                            ✕ Reject
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Log Modal */}
        {showActivityLog && activityLog && (
          <div className="modal-overlay" onClick={() => setShowActivityLog(false)}>
            <div className="modal" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <div>
                  <h2>Paper Review History</h2>
                  <p style={{ margin: '0.5rem 0 0', fontSize: '0.9rem', color: '#ABABAB' }}>
                    {activityLog.paper.courseCode} | Current Status: {activityLog.paper.currentStage}
                  </p>
                </div>
                <button className="modal-close" onClick={() => setShowActivityLog(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-body">
                {activityLog.activity.map((item, idx) => (
                  <div key={idx} className="activity-item">
                    <div className="activity-stage">{item.stage}</div>
                    <div className="activity-details">
                      <div className="activity-action">{item.action}</div>
                      <div className="activity-actor">by {item.actor}</div>
                      <div className="activity-timestamp">
                        {new Date(item.timestamp).toLocaleString()}
                      </div>
                      {item.comments && <div className="activity-comments">{item.comments}</div>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default HODDashboard;
