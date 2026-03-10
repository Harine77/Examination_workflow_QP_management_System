// ScrutinizerFinalPaper.jsx
// Second Scrutinizer Dashboard - Green/Black Theme
// Route: /scrutinizer-final-paper
// Fetches 3 approved papers and generates a shuffled final paper

import { useState, useEffect, useCallback } from 'react';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/scrutinizer';

// ─── STYLES (GREEN/BLACK THEME) ───────────────────────────────────────────────
const G = `
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=IBM+Plex+Sans:wght@300;400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');

*, *::before, *::after { box-sizing: border-box; margin:0; padding:0; }

:root {
  --black:  #0A0A0A;
  --grey1:  #1A1A1A;
  --grey2:  #3A3A3A;
  --grey3:  #6B6B6B;
  --grey4:  #ABABAB;
  --grey5:  #D4D4D4;
  --grey6:  #EFEFEF;
  --white:  #FAFAFA;
  --green:  #10B981;
  --green2: #059669;
  --green3: #D1FAE5;
  --green4: #ECFDF5;
  --border: #E0E0E0;
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.14);
}

.sfp { font-family:'IBM Plex Sans', sans-serif; background:var(--white); color:var(--black); min-height:100vh; }

/* ── NAVBAR ── */
.sfp-nav {
  position: sticky; top:0; z-index:200;
  background: var(--black);
  border-bottom: 3px solid var(--green);
  height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2rem;
}
.sfp-nav-brand {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem; font-weight: 800;
  color: var(--white); letter-spacing: -0.01em;
}
.sfp-nav-brand span { color: var(--green); }
.sfp-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--green);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700; color: var(--black);
  cursor: pointer;
}

/* ── LAYOUT ── */
.sfp-main { max-width: 1400px; margin: 0 auto; padding: 2rem 1.5rem 5rem; }

/* ── HEADER ── */
.sfp-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}
.sfp-header-left h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800; line-height: 1; letter-spacing: -0.03em;
}
.sfp-header-left p { color: var(--grey3); font-size: 0.9rem; margin-top: 0.4rem; font-weight: 300; }
.sfp-header-accent {
  width: 48px; height: 6px;
  background: var(--green);
  margin-top: 0.75rem;
}

/* ── SYNC BUTTON ── */
.sfp-sync-btn {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 0.6rem;
  background: var(--green);
  color: white;
  border: none;
  border-radius: 8px;
  padding: 0.75rem 1.5rem;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 2px 8px rgba(16,185,129,0.3);
  white-space: nowrap;
}
.sfp-sync-btn:hover:not(:disabled) {
  background: var(--green2);
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 6px 20px rgba(16,185,129,0.4);
}
.sfp-sync-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

/* ── SYNC RESULT ── */
.sfp-sync-result {
  margin: 1rem 0 2rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  font-size: 0.85rem;
  font-weight: 500;
  border: 1px solid;
}
.sfp-sync-result.success {
  background: var(--green3);
  color: var(--green2);
  border-color: var(--green);
}
.sfp-sync-result.error {
  background: #FEE2E2;
  color: #991B1B;
  border-color: #EF4444;
}

/* ── SECTION LABEL ── */
.sfp-section-label {
  display: flex; align-items: center; gap: 1rem;
  font-size: 0.68rem; font-weight: 600;
  letter-spacing: 0.15em; text-transform: uppercase; color: var(--grey3);
  margin-bottom: 1.25rem;
}
.sfp-section-label::after { content:''; flex:1; height:1px; background:var(--border); }

/* ── FINAL PAPER CARD ── */
.sfp-final-card {
  background: var(--white);
  border: 2px solid var(--green);
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 3rem;
  box-shadow: var(--shadow-lg);
}
.sfp-final-header {
  background: linear-gradient(135deg, var(--green), var(--green2));
  color: white;
  padding: 1.5rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}
.sfp-final-icon { font-size: 2rem; }
.sfp-final-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  font-weight: 800;
}
.sfp-final-body {
  padding: 2rem;
}

/* ── SOURCE PAPERS GRID ── */
.sfp-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

/* ── PAPER CARD ── */
.sfp-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  box-shadow: var(--shadow);
  transition: all 0.25s ease;
}
.sfp-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-2px);
}
.sfp-card-accent {
  height: 4px;
  background: var(--green);
}
.sfp-card-head {
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid var(--grey6);
}
.sfp-card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1rem; font-weight: 700; color: var(--black);
}
.sfp-card-body {
  padding: 1rem 1.25rem;
}

/* ── QUESTION SECTIONS ── */
.sfp-sec-head {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.64rem; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--grey3);
  margin: 0.75rem 0 0.5rem;
}
.sfp-sec-tag {
  display: inline-block; padding: 1px 7px; border-radius: 3px;
  font-size: 0.62rem; font-weight: 600;
}
.tag-2m  { background: #DBEAFE; color: #1E40AF; }
.tag-6m  { background: #FEF3C7; color: #92400E; }
.tag-12m { background: #E9D5FF; color: #6B21A8; }

.sfp-q-row {
  display: flex; align-items: flex-start; gap: 0.6rem;
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.4rem;
  transition: all 0.2s ease;
  border: 2px solid transparent;
}
.sfp-q-row:hover { background: var(--green4); }
.sfp-q-row.used {
  background: var(--green3);
  border-color: var(--green);
  box-shadow: 0 2px 8px rgba(16,185,129,0.2);
}

.sfp-qno {
  flex-shrink: 0;
  width: 36px; height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: var(--white);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.68rem; font-weight: 600;
  color: var(--grey2);
  display: flex; align-items: center; justify-content: center;
}
.sfp-q-row.used .sfp-qno {
  background: var(--green);
  color: white;
  border-color: var(--green);
  font-weight: 700;
}

.sfp-q-text { font-size: 0.82rem; color: var(--grey2); line-height: 1.55; flex:1; }
.sfp-q-row.used .sfp-q-text { color: var(--black); font-weight: 500; }

.sfp-q-badge {
  flex-shrink: 0;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  background: var(--green);
  color: white;
  letter-spacing: 0.03em;
}

/* ── LOADER ── */
.sfp-loader {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding: 5rem 0; gap:1rem; color:var(--grey3);
}
.sfp-spin {
  width:36px; height:36px; border-radius:50%;
  border:3px solid var(--grey6); border-top-color:var(--green);
  animation:spin 0.7s linear infinite;
}
@keyframes spin { to{transform:rotate(360deg)} }

/* ── ERROR ── */
.sfp-error {
  background: #FEE2E2;
  border: 1px solid #EF4444;
  border-radius: 12px;
  padding: 2rem;
  text-align: center;
}
.sfp-error h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1.5rem;
  color: #991B1B;
  margin-bottom: 0.5rem;
}
.sfp-error p { color: #7F1D1D; }

@media(max-width:900px){
  .sfp-grid { grid-template-columns:1fr; }
  .sfp-header { flex-direction:column; align-items:flex-start; gap:1rem; }
}
`;

// ─── SHUFFLING LOGIC ──────────────────────────────────────────────────────────
function generateFinalPaper(papers) {
  if (papers.length !== 3) return null;

  const finalPaper = { '2M': [], '6M': [], '12M': [] };
  const usedQuestions = {};

  ['2M', '6M', '12M'].forEach(section => {
    const maxCount = Math.max(...papers.map(p => p.sections[section]?.length || 0));

    for (let i = 0; i < maxCount; i++) {
      const candidates = papers
        .map(p => p.sections[section]?.[i])
        .filter(Boolean);

      if (candidates.length > 0) {
        const chosen = candidates[Math.floor(Math.random() * candidates.length)];
        finalPaper[section].push(chosen);
        usedQuestions[`${chosen.paper_title}||${chosen.question_no}`] = true;
      }
    }
  });

  return { finalPaper, usedQuestions };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function QuestionRow({ q, isUsed }) {
  return (
    <div className={`sfp-q-row ${isUsed ? 'used' : ''}`}>
      <div className="sfp-qno">{q.question_no}</div>
      <div className="sfp-q-text">{q.question}</div>
      {isUsed && <div className="sfp-q-badge">USED</div>}
    </div>
  );
}

function SectionBlock({ label, questions, usedQuestions }) {
  const cls = label === '2M' ? 'tag-2m' : label === '6M' ? 'tag-6m' : 'tag-12m';
  const marks = label === '2M' ? '2 Marks' : label === '6M' ? '6 Marks' : '12 Marks (Either/Or)';
  
  if (!questions.length) return null;

  return (
    <div style={{ marginBottom: '1rem' }}>
      <div className="sfp-sec-head">
        <span className={`sfp-sec-tag ${cls}`}>§ {marks}</span>
      </div>
      {questions.map((q, idx) => {
        const isUsed = usedQuestions?.[`${q.paper_title}||${q.question_no}`] || false;
        return <QuestionRow key={idx} q={q} isUsed={isUsed} />;
      })}
    </div>
  );
}

function SourcePaperCard({ paper, usedQuestions }) {
  return (
    <div className="sfp-card">
      <div className="sfp-card-accent" />
      <div className="sfp-card-head">
        <div className="sfp-card-title">{paper.paper_title}</div>
      </div>
      <div className="sfp-card-body">
        {['2M', '6M', '12M'].map(sec => (
          <SectionBlock
            key={sec}
            label={sec}
            questions={paper.sections[sec] || []}
            usedQuestions={usedQuestions}
          />
        ))}
      </div>
    </div>
  );
}

function FinalPaperCard({ finalPaper }) {
  return (
    <div className="sfp-final-card">
      <div className="sfp-final-header">
        <div className="sfp-final-icon">📄</div>
        <div>
          <div className="sfp-final-title">Final Generated Question Paper</div>
          <div style={{ fontSize: '0.85rem', opacity: 0.9, marginTop: '0.25rem' }}>
            Shuffled from 3 approved papers
          </div>
        </div>
      </div>
      <div className="sfp-final-body">
        {['2M', '6M', '12M'].map(sec => (
          <SectionBlock
            key={sec}
            label={sec}
            questions={finalPaper[sec] || []}
            usedQuestions={{}}
          />
        ))}
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
export default function ScrutinizerFinalPaper() {
  const [papers, setPapers] = useState([]);
  const [finalPaper, setFinalPaper] = useState(null);
  const [usedQuestions, setUsedQuestions] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/approved-papers/random-three`);
      const data = await res.json();

      if (!data.success) {
        setError(data.error || 'Failed to fetch approved papers');
        return;
      }

      if (data.papers.length < 3) {
        setError('Not enough approved papers. Need at least 3 approved papers to generate final paper.');
        return;
      }

      setPapers(data.papers);

      const result = generateFinalPaper(data.papers);
      if (result) {
        setFinalPaper(result.finalPaper);
        setUsedQuestions(result.usedQuestions);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSyncToDb = useCallback(async () => {
    if (!finalPaper) return;

    setSyncing(true);
    setSyncResult(null);

    try {
      // Flatten all questions from final paper
      const allQuestions = [
        ...finalPaper['2M'].map(q => ({ ...q, source_paper_title: q.paper_title })),
        ...finalPaper['6M'].map(q => ({ ...q, source_paper_title: q.paper_title })),
        ...finalPaper['12M'].map(q => ({ ...q, source_paper_title: q.paper_title })),
      ];

      const sourcePapers = papers.map(p => p.paper_title);
      const timestamp = new Date().toISOString().split('T')[0];
      const finalPaperTitle = `Final_Paper_${timestamp}`;

      const res = await fetch(`${API}/save-final-paper`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          final_paper_title: finalPaperTitle,
          questions: allQuestions,
          source_papers: sourcePapers,
        }),
      });

      const data = await res.json();

      if (data.success) {
        setSyncResult({
          success: true,
          message: `✓ ${data.message}. Saved to table "final_paper".`,
        });
      } else {
        setSyncResult({
          success: false,
          message: `✗ ${data.error || 'Failed to sync'}`,
        });
      }
    } catch (err) {
      setSyncResult({
        success: false,
        message: `✗ ${err.message}`,
      });
    } finally {
      setSyncing(false);
    }
  }, [finalPaper, papers]);

  useEffect(() => { fetchData(); }, [fetchData]);

  return (
    <>
      <style>{G}</style>
      <div className="sfp">
        <nav className="sfp-nav">
          <div className="sfp-nav-brand">Final Paper <span>Generator</span></div>
          <div className="sfp-avatar">S</div>
        </nav>

        <div className="sfp-main">
          <div className="sfp-header">
            <div className="sfp-header-left">
              <h1>Final Paper Generation</h1>
              <div className="sfp-header-accent" />
              <p>Shuffled question paper from approved sources</p>
            </div>
            {!loading && !error && finalPaper && (
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  className="sfp-sync-btn"
                  style={{ background: 'var(--grey2)', color: 'white' }}
                  onClick={fetchData}
                  disabled={syncing}
                >
                  🔄 Regenerate
                </button>
                <button
                  className="sfp-sync-btn"
                  onClick={handleSyncToDb}
                  disabled={syncing}
                >
                  {syncing ? 'Syncing...' : '⬆ Sync to DB'}
                </button>
              </div>
            )}
          </div>

          {syncResult && (
            <div className={`sfp-sync-result ${syncResult.success ? 'success' : 'error'}`}>
              {syncResult.message}
            </div>
          )}

          {loading ? (
            <div className="sfp-loader">
              <div className="sfp-spin" />
              <span>Loading approved papers…</span>
            </div>
          ) : error ? (
            <div className="sfp-error">
              <h3>⚠ Error</h3>
              <p>{error}</p>
              <button
                onClick={fetchData}
                style={{
                  marginTop: '1rem',
                  padding: '0.5rem 1.5rem',
                  background: 'var(--green)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Retry
              </button>
            </div>
          ) : (
            <>
              {finalPaper && <FinalPaperCard finalPaper={finalPaper} />}

              <div className="sfp-section-label">Source Papers (Used questions highlighted)</div>
              <div className="sfp-grid">
                {papers.map(paper => (
                  <SourcePaperCard
                    key={paper.paper_title}
                    paper={paper}
                    usedQuestions={usedQuestions}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}