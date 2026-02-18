import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';

const ScrutinizerMainDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const styles = `
    .scrutinizer-container {
      background: #FAFAFA;
      color: #0A0A0A;
      font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      min-height: 100vh;
    }

    .scrutinizer-header {
      background: #0A0A0A;
      color: #FAFAFA;
      padding: 4rem 2rem;
      text-align: center;
      border-bottom: 4px solid #F5C400;
    }

    .scrutinizer-header h1 {
      font-size: 3.5rem;
      font-weight: 800;
      margin: 0 0 0.5rem;
      letter-spacing: -0.03em;
    }

    .scrutinizer-header .subtitle {
      font-size: 1.2rem;
      color: #ABABAB;
      margin: 0.5rem 0 0;
      font-weight: 300;
    }

    .scrutinizer-accent {
      width: 60px;
      height: 5px;
      background: #F5C400;
      margin: 1rem auto 0;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 3rem 2rem;
    }

    .user-card {
      background: #FAFAFA;
      border: 1px solid #E0E0E0;
      border-left: 4px solid #F5C400;
      border-radius: 10px;
      padding: 2rem;
      margin-bottom: 3rem;
      max-width: 500px;
      margin-left: auto;
      margin-right: auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .user-info {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .user-details h3 {
      font-size: 1.3rem;
      font-weight: 700;
      margin: 0 0 0.3rem;
      color: #0A0A0A;
    }

    .user-details p {
      color: #6B6B6B;
      margin: 0;
      font-size: 0.95rem;
    }

    .user-badge {
      background: #0A0A0A;
      color: #F5C400;
      padding: 0.5rem 1.2rem;
      border-radius: 6px;
      font-weight: 700;
      font-size: 0.8rem;
    }

    .cards-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(350px, 1fr));
      gap: 2rem;
      margin-bottom: 3rem;
    }

    .card {
      background: #FAFAFA;
      border: 2px solid #E0E0E0;
      border-radius: 10px;
      padding: 2.5rem;
      cursor: pointer;
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      text-align: left;
      color: inherit;
      font-family: inherit;
      border-top: 4px solid #F5C400;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
    }

    .card:hover {
      transform: translateY(-6px);
      box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
      border-color: #F5C400;
    }

    .card-icon {
      font-size: 3.5rem;
      margin-bottom: 1rem;
      display: inline-block;
    }

    .card h3 {
      font-size: 1.4rem;
      font-weight: 700;
      margin: 0 0 0.5rem;
      color: #0A0A0A;
    }

    .card p {
      color: #6B6B6B;
      margin: 0;
      font-size: 0.95rem;
      line-height: 1.6;
    }

    .stats-section {
      background: #FAFAFA;
      border: 1px solid #E0E0E0;
      border-left: 4px solid #F5C400;
      border-radius: 10px;
      padding: 2rem;
      margin-bottom: 3rem;
      max-width: 1000px;
      margin-left: auto;
      margin-right: auto;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .stats-title {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 2rem;
      color: #0A0A0A;
    }

    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 1.5rem;
    }

    .stat-box {
      padding: 1.5rem;
      border-radius: 8px;
      text-align: center;
      border: 1px solid #E0E0E0;
    }

    .stat-box.yellow {
      background: #FFF3B0;
      border-color: #F5C400;
    }

    .stat-box.green {
      background: #E8F5EE;
      border-color: #1B7A3E;
    }

    .stat-box.blue {
      background: #E3F2FD;
      border-color: #1976D2;
    }

    .stat-box.red {
      background: #FDEEEE;
      border-color: #C0392B;
    }

    .stat-value {
      font-size: 2.2rem;
      font-weight: 700;
      margin-bottom: 0.5rem;
      font-family: 'IBM Plex Mono', monospace;
    }

    .stat-label {
      font-size: 0.85rem;
      color: #3A3A3A;
      font-weight: 600;
    }

    .info-banner {
      background: linear-gradient(135deg, #1A1A1A 0%, #0A0A0A 100%);
      color: #FAFAFA;
      border-radius: 10px;
      padding: 2.5rem;
      max-width: 1000px;
      margin-left: auto;
      margin-right: auto;
      border-left: 4px solid #F5C400;
    }

    .info-banner h3 {
      font-size: 1.5rem;
      font-weight: 700;
      margin: 0 0 1.5rem;
    }

    .info-banner ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }

    .info-banner li {
      padding: 0.6rem 0;
      padding-left: 2rem;
      position: relative;
      line-height: 1.6;
    }

    .info-banner li::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: #F5C400;
      font-weight: 700;
    }
  `;

  return (
    <div className="scrutinizer-container">
      <style>{styles}</style>
      <Navbar />

      {/* Header */}
      <div className="scrutinizer-header">
        <h1>Scrutinizer Dashboard</h1>
        <div className="scrutinizer-accent"></div>
        <p className="subtitle">Review, approve, and manage question papers with precision</p>
      </div>

      {/* Main Content */}
      <div className="container">
        {/* User Card */}
        <div className="user-card">
          <div className="user-info">
            <div className="user-details">
              <h3>{user?.username}</h3>
              <p>{user?.email}</p>
            </div>
            <div className="user-badge">SCRUTINIZER</div>
          </div>
        </div>

        {/* Action Cards */}
        <div className="cards-grid">
          <button
            onClick={() => navigate('/scrutinizer-all-papers')}
            className="card"
          >
            <div className="card-icon">📋</div>
            <h3>View All Papers</h3>
            <p>Browse and review all question papers currently in the system</p>
          </button>

          <button
            onClick={() => navigate('/scrutinizer-review')}
            className="card"
          >
            <div className="card-icon">✍️</div>
            <h3>Papers for Review</h3>
            <p>Access papers pending your scrutinizer feedback and review</p>
          </button>

          <button
            onClick={() => navigate('/scrutinizer-reviews')}
            className="card"
          >
            <div className="card-icon">✓</div>
            <h3>My Reviews</h3>
            <p>View and manage all your review decisions and feedback history</p>
          </button>
        </div>

        {/* Statistics */}
        <div className="stats-section">
          <h2 className="stats-title">Review Statistics</h2>
          <div className="stats-grid">
            <div className="stat-box yellow">
              <div className="stat-value">0</div>
              <div className="stat-label">Total Papers</div>
            </div>
            <div className="stat-box green">
              <div className="stat-value">0</div>
              <div className="stat-label">Approved</div>
            </div>
            <div className="stat-box blue">
              <div className="stat-value">0</div>
              <div className="stat-label">In Review</div>
            </div>
            <div className="stat-box red">
              <div className="stat-value">0</div>
              <div className="stat-label">Flagged</div>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="info-banner">
          <h3>Scrutinizer Responsibilities</h3>
          <ul>
            <li>Review question papers submitted by faculty members</li>
            <li>Approve questions that meet academic and quality standards</li>
            <li>Provide detailed suggestions for improvement when needed</li>
            <li>Ensure alignment with course outcomes and learning objectives</li>
            <li>Maintain consistency and quality across all course materials</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default ScrutinizerMainDashboard;
