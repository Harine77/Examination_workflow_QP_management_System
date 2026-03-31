import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { useAuth } from '../context/authContext';
import Navbar from '../components/Navbar';
import api from '../services/api';

// ── Status config ─────────────────────────────────────────────────────────────
const STATUS_CFG = {
  draft:                 { label: 'Draft',                  color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB' },
  with_scrutinizer1:     { label: 'With Scrutinizer 1',    color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  with_scrutinizer2:     { label: 'With Scrutinizer 2',    color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  needs_revision:        { label: 'Needs Revision',        color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  scrutinizer2_approved: { label: 'S2 Approved',           color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  randomized:            { label: 'Randomized',            color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
  with_panel:            { label: 'With Panel',            color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
  with_hod:              { label: 'With HOD',              color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
  hod_approved:          { label: 'HOD Approved',          color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  submitted:             { label: 'Submitted',             color: '#2563EB', bg: '#EFF6FF', border: '#BFDBFE' },
  reviewed:              { label: 'Reviewed',              color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
  finalized:             { label: 'Finalized',             color: '#7C3AED', bg: '#F5F3FF', border: '#DDD6FE' },
};

const WORKFLOW = [
  { key: 'draft',                 label: 'Draft' },
  { key: 'with_scrutinizer1',     label: 'Scrutinizer 1' },
  { key: 'with_scrutinizer2',     label: 'Scrutinizer 2' },
  { key: 'scrutinizer2_approved', label: 'S2 Approved' },
  { key: 'with_panel',            label: 'Panel' },
  { key: 'with_hod',              label: 'HOD' },
  { key: 'hod_approved',          label: 'Final Approved' },
];

// ── Sub-components ────────────────────────────────────────────────────────────
function StatusBadge({ status }) {
  const c = STATUS_CFG[status] || { label: status, color: '#6B7280', bg: '#F9FAFB', border: '#D1D5DB' };
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', padding: '4px 14px',
      borderRadius: 8, fontSize: '0.8rem', fontWeight: 700,
      color: c.color, background: c.bg, border: `1.5px solid ${c.border}`,
      letterSpacing: '0.02em',
    }}>
      {c.label}
    </span>
  );
}

function WorkflowTimeline({ status }) {
  const curIdx = WORKFLOW.findIndex(s => s.key === status);
  // for needs_revision, treat as between draft and s1
  const idx = curIdx < 0 ? 0 : curIdx;

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', padding: '1rem 0 0.5rem', gap: 0 }}>
      {WORKFLOW.map((step, i) => {
        const done   = i < idx;
        const active = i === idx;
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'flex-start', flexShrink: 0 }}>
            <div style={{ textAlign: 'center', minWidth: 80 }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', margin: '0 auto 6px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: done ? '#059669' : active ? '#2563EB' : '#E5E7EB',
                color: (done || active) ? '#fff' : '#9CA3AF',
                fontWeight: 700, fontSize: '0.8rem',
                boxShadow: active ? '0 0 0 4px rgba(37,99,235,0.18)' : 'none',
              }}>
                {done ? '✓' : i + 1}
              </div>
              <div style={{
                fontSize: '0.65rem', fontWeight: active ? 700 : 500,
                color: done ? '#059669' : active ? '#2563EB' : '#9CA3AF',
                maxWidth: 72, wordBreak: 'break-word',
              }}>
                {step.label}
              </div>
            </div>
            {i < WORKFLOW.length - 1 && (
              <div style={{
                height: 2, width: 36, flexShrink: 0, marginTop: 16,
                background: i < idx ? '#059669' : '#E5E7EB',
              }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Table style helpers ───────────────────────────────────────────────────────
const th = {
  padding: '0.6rem 0.8rem', fontSize: '0.68rem', fontWeight: 700,
  textTransform: 'uppercase', letterSpacing: '0.08em', color: '#374151',
  textAlign: 'center', whiteSpace: 'nowrap', borderBottom: '2px solid #E5E7EB',
};
const td = { padding: '0.7rem 0.8rem', fontSize: '0.86rem', verticalAlign: 'top', borderBottom: '1px solid #F3F4F6' };

function KlBadge({ level }) {
  if (!level) return <span style={{ color: '#9CA3AF' }}>—</span>;
  return <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>{level}</span>;
}

function CoBadge({ question }) {
  const label = question.CourseOutcome?.coNumber || null;
  if (!label) return <span style={{ color: '#9CA3AF' }}>—</span>;
  return <span style={{ background: '#DCFCE7', color: '#15803D', padding: '2px 8px', borderRadius: 5, fontSize: '0.72rem', fontWeight: 700 }}>{label}</span>;
}

function ReviewCell({ reviews }) {
  if (!reviews || reviews.length === 0) return <span style={{ color: '#9CA3AF', fontSize: '0.75rem' }}>—</span>;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
      {reviews.map((r, i) => {
        const isApproved = r.status === 'APPROVED';
        const roleLabel = r.reviewer_role === 'scrutinizer_1' ? 'S1' : r.reviewer_role === 'scrutinizer_2' ? 'S2' : 'S';
        return (
          <div key={i}>
            <span style={{
              display: 'inline-flex', alignItems: 'center', gap: '0.25rem',
              padding: '0.15rem 0.5rem', borderRadius: 6, fontSize: '0.7rem', fontWeight: 700,
              background: isApproved ? '#DCFCE7' : '#FEF3C7',
              color: isApproved ? '#166534' : '#92400E',
              border: `1px solid ${isApproved ? '#BBF7D0' : '#FDE68A'}`,
            }}>
              <span style={{ fontSize: '0.65rem', opacity: 0.75 }}>{roleLabel}</span>
              {isApproved ? '✓ Approved' : '✎ Suggestion'}
            </span>
            {!isApproved && r.suggestion_text && (
              <p style={{ margin: '0.2rem 0 0', fontSize: '0.75rem', color: '#78350F', fontStyle: 'italic', lineHeight: 1.4 }}>
                "{r.suggestion_text}"
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

function PartTable({ questions, partLabel, bgColor, markDesc, showReviews }) {
  if (!questions.length) return null;
  const hasAnyReview = showReviews && questions.some(q => q.reviews && q.reviews.length > 0);
  return (
    <div style={{ marginBottom: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.75rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 800, color: '#111827', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
          {partLabel}
        </h3>
        <div style={{ flex: 1, height: 1, background: '#E5E7EB' }} />
        <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#6B7280', whiteSpace: 'nowrap' }}>{markDesc}</span>
      </div>
      <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ background: bgColor }}>
              <th style={{ ...th, width: 50 }}>Q.No</th>
              <th style={{ ...th, textAlign: 'left' }}>Question</th>
              <th style={th}>KL</th>
              <th style={th}>CO</th>
              <th style={th}>Marks</th>
              {hasAnyReview && <th style={{ ...th, textAlign: 'left', minWidth: 160 }}>Review</th>}
            </tr>
          </thead>
          <tbody>
            {questions.map((q, i) => {
              const showOr = partLabel === 'Part C' && i > 0 && i % 2 === 1;
              return (
                <tr key={q.id} style={{ background: i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#374151' }}>
                    {showOr && (
                      <div style={{ fontSize: '0.6rem', fontWeight: 800, color: '#7C3AED', textTransform: 'uppercase', marginBottom: 2 }}>OR</div>
                    )}
                    {q.questionNumber}.
                  </td>
                  <td style={{ ...td, lineHeight: 1.65, color: '#1F2937' }}>{q.questionText}</td>
                  <td style={{ ...td, textAlign: 'center' }}><KlBadge level={q.klLevel} /></td>
                  <td style={{ ...td, textAlign: 'center' }}><CoBadge question={q} /></td>
                  <td style={{ ...td, textAlign: 'center', fontWeight: 700, color: '#374151' }}>{q.marks}</td>
                  {hasAnyReview && <td style={{ ...td }}><ReviewCell reviews={q.reviews} /></td>}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Action button style helper ────────────────────────────────────────────────
function ActionBtn({ children, onClick, variant = 'primary', disabled }) {
  const variants = {
    primary: { bg: '#2563EB', color: '#fff',    border: '#2563EB' },
    success: { bg: '#059669', color: '#fff',    border: '#059669' },
    danger:  { bg: '#fff',    color: '#DC2626', border: '#FECACA' },
    warning: { bg: '#fff',    color: '#D97706', border: '#FDE68A' },
  };
  const v = variants[variant] || variants.primary;
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        padding: '0.7rem 1.5rem', borderRadius: 10, fontSize: '0.9rem', fontWeight: 700,
        cursor: disabled ? 'not-allowed' : 'pointer',
        border: `1.5px solid ${v.border}`,
        background: disabled ? '#E5E7EB' : v.bg,
        color: disabled ? '#9CA3AF' : v.color,
        opacity: disabled ? 0.7 : 1,
        transition: 'all 0.18s',
        whiteSpace: 'nowrap',
      }}
    >
      {children}
    </button>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function PaperView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [paper,   setPaper]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [acting,  setActing]  = useState(false);

  // S2 CO/KL verification state
  const [verifying,   setVerifying]   = useState(false);
  const [verifyData,  setVerifyData]  = useState(null);
  const [verifyError, setVerifyError] = useState(null);

  // S2 shuffle state
  const [shuffleGroups,  setShuffleGroups]  = useState([]);
  const [shuffling,      setShuffling]      = useState(false);

  useEffect(() => { fetchPaper(); }, [id]);

  const fetchPaper = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/questions/papers/${id}`);
      const p = res.data.data;
      setPaper(p);
      // If S2 is viewing this paper, pre-load shuffle group info
      if (p.status === 'with_scrutinizer2' && p.CourseId) {
        fetchShuffleGroups(p.CourseId);
      }
    } catch {
      toast.error('Paper not found or access denied');
      navigate(-1);
    } finally {
      setLoading(false);
    }
  };

  const doAction = async (url, body = {}, successMsg) => {
    setActing(true);
    try {
      await api.post(url, body);
      toast.success(successMsg || 'Done!');
      setComment('');
      await fetchPaper();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const runVerification = async () => {
    setVerifying(true);
    setVerifyError(null);
    setVerifyData(null);
    try {
      const res = await api.get(`/scrutinizer/papers/${id}/verify-mapping`);
      setVerifyData(res.data);
    } catch (err) {
      setVerifyError(err.response?.data?.error || 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  const fetchShuffleGroups = async (courseId) => {
    try {
      const res = await api.get('/scrutinizer/approved-papers');
      const groups = res.data.groups || [];
      // Only show the group for this paper's course
      setShuffleGroups(groups.filter(g => g.courseId === courseId));
    } catch (_) {}
  };

  const runShuffle = async (courseId) => {
    if (!window.confirm(
      `This will randomly pick one question per slot from all ${shuffleGroups.find(g=>g.courseId===courseId)?.count || ''} papers for this course and create a single shuffled paper sent directly to the Panel.\n\nProceed?`
    )) return;
    setShuffling(true);
    try {
      const res = await api.post(`/scrutinizer/randomize/${courseId}`);
      toast.success(`✅ ${res.data.message}`);
      await fetchPaper();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Shuffle failed');
    } finally {
      setShuffling(false);
    }
  };

  // ── Render: loading ──────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#F9FAFB' }}>
      <Navbar />
      <div style={{ textAlign: 'center', padding: '8rem 0', color: '#6B7280' }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📄</div>
        <p style={{ fontSize: '1rem' }}>Loading paper…</p>
      </div>
    </div>
  );

  if (!paper) return null;

  // ── Build data ───────────────────────────────────────────────────────────
  const allQs  = paper.Questions || [];
  const partA  = allQs.filter(q => q.part === 'A').sort((a, b) => a.questionNumber - b.questionNumber);
  const partB  = allQs.filter(q => q.part === 'B').sort((a, b) => a.questionNumber - b.questionNumber);
  const partC  = allQs.filter(q => q.part === 'C').sort((a, b) => a.questionNumber - b.questionNumber);

  const EXAM = {
    CAT: { title: `Continuous Assessment Test${paper.catNumber ? ' – ' + paper.catNumber : ''}`, time: '90 Minutes', max: '50 Marks', pA: '4 × 2 = 8 Marks',  pB: '3 × 6 = 18 Marks', pC: '(2 of 4) × 12 = 24 Marks' },
    SAT: { title: `Summative Assessment Test${paper.catNumber  ? ' – ' + paper.catNumber : ''}`, time: '90 Minutes', max: '50 Marks', pA: '4 × 2 = 8 Marks',  pB: '3 × 6 = 18 Marks', pC: '(2 of 4) × 12 = 24 Marks' },
    SEM: { title: 'End Semester Theory Examination',                                              time: '3 Hours',    max: '100 Marks', pA: '5 × 2 = 10 Marks', pB: '5 × 6 = 30 Marks', pC: '(5 of 10) × 12 = 60 Marks' },
  }[paper.examType] || {};

  const role = user?.role;
  const s    = paper.status;

  const isFaculty   = role === 'faculty';
  const isS1        = ['scrutinizer_1', 'scrutinizer'].includes(role) && s === 'with_scrutinizer1';
  const isS2        = ['scrutinizer_2', 'scrutinizer'].includes(role) && s === 'with_scrutinizer2';
  const isPanel     = ['panel_member', 'panel'].includes(role) && ['with_panel', 'randomized'].includes(s);
  const isHOD       = role === 'hod' && s === 'with_hod';
  const showActions = (isFaculty && ['draft','needs_revision'].includes(s)) || isS1 || isS2 || isPanel || isHOD;

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: '#F0F4F8', fontFamily: "'Inter', 'Segoe UI', -apple-system, sans-serif" }}>
      <Navbar />

      <div style={{ maxWidth: 1050, margin: '0 auto', padding: '2rem 1.5rem 6rem' }}>

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '0.5rem',
            background: '#fff', border: '1.5px solid #E5E7EB', borderRadius: 8, padding: '0.5rem 1.1rem',
            fontSize: '0.85rem', color: '#374151', cursor: 'pointer', marginBottom: '1.5rem', fontWeight: 600,
          }}
        >
          ← Back
        </button>

        {/* ── Status / Workflow card ── */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '1.75rem 2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', marginBottom: '1.5rem', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h2 style={{ margin: 0, fontSize: '1.35rem', fontWeight: 800, color: '#0F172A' }}>
                {paper.Course?.courseCode} — {paper.Course?.courseName}
              </h2>
              <p style={{ margin: '0.35rem 0 0', color: '#64748B', fontSize: '0.88rem' }}>
                {EXAM.title}
                {paper.examDate && ` · ${new Date(paper.examDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`}
                {' · '}Created by <strong>{paper.creator?.username}</strong>
                {paper.revisionCount > 0 && ` · Revision #${paper.revisionCount}`}
              </p>
            </div>
            <StatusBadge status={s} />
          </div>

          {/* Needs-revision banner */}
          {s === 'needs_revision' && (
            <div style={{ marginTop: '1rem', background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '0.9rem 1.25rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <span style={{ fontSize: '1.4rem' }}>⚠️</span>
              <div>
                <strong style={{ color: '#DC2626', fontSize: '0.9rem' }}>This paper has been sent back for revision</strong>
                <p style={{ margin: '0.2rem 0 0', color: '#6B7280', fontSize: '0.82rem' }}>Please address the comments below and resubmit.</p>
              </div>
            </div>
          )}

          <WorkflowTimeline status={s} />
        </div>

        {/* ── Review Comments card (if any) ── */}
        {(paper.scrutinizer1Comments || paper.scrutinizer2Comments) && (
          <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 14, padding: '1.25rem 1.5rem', marginBottom: '1.5rem' }}>
            <h4 style={{ margin: '0 0 0.85rem', fontSize: '0.9rem', fontWeight: 800, color: '#92400E', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              💬 Scrutinizer Comments
            </h4>
            {paper.scrutinizer1Comments && (
              <div style={{ marginBottom: paper.scrutinizer2Comments ? '0.85rem' : 0 }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#2563EB', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scrutinizer 1</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#1F2937', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 7, padding: '0.6rem 0.9rem' }}>{paper.scrutinizer1Comments}</p>
              </div>
            )}
            {paper.scrutinizer2Comments && (
              <div>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, color: '#7C3AED', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Scrutinizer 2</span>
                <p style={{ margin: '0.2rem 0 0', fontSize: '0.9rem', color: '#1F2937', background: '#fff', border: '1px solid #E5E7EB', borderRadius: 7, padding: '0.6rem 0.9rem' }}>{paper.scrutinizer2Comments}</p>
              </div>
            )}
          </div>
        )}

        {/* ── Question Paper (Academic Format) ── */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB', overflow: 'hidden', marginBottom: '1.5rem' }}>

          {/* Institution header */}
          <div style={{ background: '#1E3A5F', color: '#fff', padding: '2rem 2rem 1.75rem', textAlign: 'center' }}>
            <div style={{ fontSize: '1.15rem', fontWeight: 800, letterSpacing: '0.04em', marginBottom: '0.3rem' }}>
              SSN COLLEGE OF ENGINEERING, KALAVAKKAM – 603 110
            </div>
            <div style={{ fontSize: '0.82rem', opacity: 0.8, marginBottom: '1.25rem' }}>
              (An Autonomous Institution, Affiliated to Anna University, Chennai)
            </div>

            <div style={{ display: 'inline-block', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)', borderRadius: 10, padding: '0.75rem 2rem' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: 700, letterSpacing: '0.02em' }}>{EXAM.title || paper.examType}</div>
              {paper.examDate && (
                <div style={{ fontSize: '0.8rem', opacity: 0.85, marginTop: '0.3rem' }}>
                  {new Date(paper.examDate).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}
                </div>
              )}
            </div>
          </div>

          {/* Meta grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', borderBottom: '2px solid #E5E7EB' }}>
            {[
              { label: 'Department',  value: 'B.E. / B.Tech.' },
              { label: 'Course Code', value: paper.Course?.courseCode || '—' },
              { label: 'Course Name', value: paper.Course?.courseName || '—' },
              { label: 'Semester',    value: `Semester ${paper.Course?.semester || '—'}` },
              { label: 'Duration',    value: EXAM.time || '—' },
              { label: 'Max. Marks',  value: EXAM.max || '—' },
            ].map(({ label, value }) => (
              <div key={label} style={{ padding: '0.8rem 1.25rem', borderRight: '1px solid #E5E7EB', borderBottom: '1px solid #E5E7EB' }}>
                <div style={{ fontSize: '0.63rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: '#9CA3AF', marginBottom: '0.2rem' }}>{label}</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 600, color: '#111827' }}>{value}</div>
              </div>
            ))}
          </div>

          {/* Instructions */}
          <div style={{ background: '#F8FAFC', borderBottom: '1px solid #E5E7EB', padding: '0.7rem 1.5rem' }}>
            <p style={{ margin: 0, fontSize: '0.79rem', color: '#4B5563', fontStyle: 'italic' }}>
              <strong>Instructions:</strong>&nbsp;
              Answer ALL questions from Part A.&nbsp;
              Answer any questions from Part B as instructed.&nbsp;
              Answer either/or questions in Part C.
            </p>
          </div>

          {/* Questions */}
          <div style={{ padding: '1.5rem' }}>
            {allQs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '3rem', color: '#9CA3AF' }}>
                <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>📭</div>
                <p>No questions have been added to this paper yet.</p>
              </div>
            ) : (
              <>
                <PartTable questions={partA} partLabel="Part A" bgColor="#EFF6FF" markDesc={EXAM.pA} showReviews />
                <PartTable questions={partB} partLabel="Part B" bgColor="#FFF7ED" markDesc={EXAM.pB} showReviews />
                <PartTable questions={partC} partLabel="Part C" bgColor="#F5F3FF" markDesc={EXAM.pC} showReviews />
              </>
            )}
          </div>
        </div>

        {/* ── Action Panel ── */}
        {showActions && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '1.75rem 2rem', boxShadow: '0 1px 4px rgba(0,0,0,0.07)', border: '1px solid #E5E7EB' }}>
            <h3 style={{ margin: '0 0 1.25rem', fontSize: '1rem', fontWeight: 800, color: '#0F172A' }}>
              {isFaculty ? '📤 Submit Paper' : isS1 ? '🔍 Scrutinizer 1 — Review Actions' : isS2 ? '✅ Scrutinizer 2 — CO/KL Verification & Actions' : isPanel ? '📨 Panel Actions' : '🏛️ HOD Actions'}
            </h3>

            {/* ── S2: CO/KL Verification Panel ── */}
            {isS2 && (
              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                  <ActionBtn disabled={verifying} onClick={runVerification} variant="warning">
                    {verifying ? '🔄 Analysing…' : '🔬 Run CO/KL Verification'}
                  </ActionBtn>
                  {verifyData && (
                    <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                      <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                        ✓ {verifyData.summary.validQ}/{verifyData.summary.totalQ} Valid
                      </span>
                      {verifyData.summary.klMismatches > 0 && (
                        <span style={{ background: '#FEF3C7', color: '#92400E', padding: '4px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                          ⚠ {verifyData.summary.klMismatches} KL mismatch{verifyData.summary.klMismatches > 1 ? 'es' : ''}
                        </span>
                      )}
                      {verifyData.summary.coMismatches > 0 && (
                        <span style={{ background: '#FEE2E2', color: '#991B1B', padding: '4px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                          ✗ {verifyData.summary.coMismatches} CO mismatch{verifyData.summary.coMismatches > 1 ? 'es' : ''}
                        </span>
                      )}
                      {verifyData.summary.allValid && (
                        <span style={{ background: '#DCFCE7', color: '#166534', padding: '4px 12px', borderRadius: 8, fontSize: '0.8rem', fontWeight: 700 }}>
                          🎉 All mappings correct!
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {verifyError && (
                  <div style={{ background: '#FEF2F2', border: '1px solid #FECACA', borderRadius: 9, padding: '0.75rem 1rem', color: '#DC2626', fontSize: '0.85rem', marginBottom: '1rem' }}>
                    ⚠ {verifyError}
                  </div>
                )}

                {verifyData && (
                  <div style={{ border: '1px solid #E5E7EB', borderRadius: 10, overflow: 'hidden', marginBottom: '0.5rem' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                      <thead>
                        <tr style={{ background: '#F1F5F9' }}>
                          {['Q.No', 'Question', 'Assigned KL', 'Suggested KL', 'KL', 'Assigned CO', 'Suggested CO', 'CO'].map(h => (
                            <th key={h} style={{ padding: '0.6rem 0.75rem', fontWeight: 700, fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#374151', borderBottom: '2px solid #E5E7EB', whiteSpace: 'nowrap', textAlign: 'center' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {verifyData.questions.map((q, i) => (
                          <tr key={q.id} style={{ background: !q.isValid ? '#FFF7ED' : i % 2 === 0 ? '#fff' : '#FAFAFA' }}>
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', fontWeight: 700, color: '#374151', borderBottom: '1px solid #F3F4F6' }}>
                              {q.part}{q.questionNumber}
                            </td>
                            <td style={{ padding: '0.6rem 0.75rem', maxWidth: 260, lineHeight: 1.5, color: '#1F2937', borderBottom: '1px solid #F3F4F6' }}>
                              <div style={{ overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                                {q.questionText}
                              </div>
                            </td>
                            {/* Assigned KL */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', borderBottom: '1px solid #F3F4F6' }}>
                              <span style={{ background: '#DBEAFE', color: '#1D4ED8', padding: '2px 8px', borderRadius: 5, fontWeight: 700, fontSize: '0.75rem' }}>
                                {q.assigned.kl || '—'}
                              </span>
                            </td>
                            {/* Suggested KL */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', borderBottom: '1px solid #F3F4F6' }}>
                              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
                                <span style={{ background: '#E0E7FF', color: '#3730A3', padding: '2px 8px', borderRadius: 5, fontWeight: 700, fontSize: '0.75rem' }}>
                                  {q.suggested.kl || '—'}
                                </span>
                                {q.suggested.klVerb && (
                                  <span style={{ fontSize: '0.65rem', color: '#6B7280', fontStyle: 'italic' }}>"{q.suggested.klVerb}"</span>
                                )}
                              </div>
                            </td>
                            {/* KL match */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', borderBottom: '1px solid #F3F4F6' }}>
                              {q.klMatch === true  && <span style={{ color: '#059669', fontWeight: 800, fontSize: '1rem' }}>✓</span>}
                              {q.klMatch === false && <span style={{ color: '#DC2626', fontWeight: 800, fontSize: '1rem' }}>✗</span>}
                              {q.klMatch === null  && <span style={{ color: '#9CA3AF' }}>—</span>}
                            </td>
                            {/* Assigned CO */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', borderBottom: '1px solid #F3F4F6' }}>
                              <span style={{ background: '#DCFCE7', color: '#166534', padding: '2px 8px', borderRadius: 5, fontWeight: 700, fontSize: '0.75rem' }}>
                                {q.assigned.co || '—'}
                              </span>
                            </td>
                            {/* Suggested CO */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', borderBottom: '1px solid #F3F4F6' }}>
                              <span style={{ background: '#D1FAE5', color: '#065F46', padding: '2px 8px', borderRadius: 5, fontWeight: 700, fontSize: '0.75rem' }}>
                                {q.suggested.co || '—'}
                              </span>
                            </td>
                            {/* CO match */}
                            <td style={{ padding: '0.6rem 0.75rem', textAlign: 'center', borderBottom: '1px solid #F3F4F6' }}>
                              {q.coMatch === true  && <span style={{ color: '#059669', fontWeight: 800, fontSize: '1rem' }}>✓</span>}
                              {q.coMatch === false && <span style={{ color: '#DC2626', fontWeight: 800, fontSize: '1rem' }}>✗</span>}
                              {q.coMatch === null  && <span style={{ color: '#9CA3AF' }}>—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* ── S2: Shuffle Panel ── */}
            {isS2 && (
              <div style={{ marginBottom: '1.5rem', background: '#F0FDF4', border: '1.5px solid #86EFAC', borderRadius: 12, padding: '1.25rem 1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: '#166534', marginBottom: '0.25rem' }}>
                      🎲 Randomized Shuffle
                    </div>
                    <div style={{ fontSize: '0.82rem', color: '#4B7C5A' }}>
                      {shuffleGroups.length === 0
                        ? 'Only 1 paper exists for this course — need at least 2 to shuffle.'
                        : shuffleGroups.map(g => (
                            <span key={g.courseId}>
                              <strong>{g.courseCode}</strong> — {g.count} paper{g.count > 1 ? 's' : ''} ready
                              {g.count < 2 && <span style={{ color: '#DC2626' }}> (need at least 2)</span>}
                            </span>
                          ))
                      }
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6B7280', marginTop: '0.3rem' }}>
                      Picks one question per slot randomly from all papers → creates one final QP → sends to Panel
                    </div>
                  </div>
                  {shuffleGroups.map(g => (
                    <button
                      key={g.courseId}
                      disabled={!g.readyForRandomization || shuffling}
                      onClick={() => runShuffle(g.courseId)}
                      style={{
                        padding: '0.7rem 1.4rem', borderRadius: 9, fontWeight: 700, fontSize: '0.88rem',
                        border: 'none', cursor: g.readyForRandomization && !shuffling ? 'pointer' : 'not-allowed',
                        background: g.readyForRandomization ? '#16A34A' : '#D1D5DB',
                        color: g.readyForRandomization ? '#fff' : '#9CA3AF',
                        opacity: shuffling ? 0.6 : 1,
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {shuffling ? '🔄 Shuffling…' : `🎲 Shuffle & Send to Panel`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Comment textarea for scrutinizers */}
            {(isS1 || isS2) && (
              <div style={{ marginBottom: '1.25rem' }}>
                <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                  {isS1 ? 'Comments for Scrutinizer 2 (optional)' : 'Final review comments (optional)'}
                </label>
                <textarea
                  value={comment}
                  onChange={e => setComment(e.target.value)}
                  placeholder="Add your review notes here…"
                  rows={3}
                  style={{
                    width: '100%', border: '1.5px solid #D1D5DB', borderRadius: 10,
                    padding: '0.75rem', fontSize: '0.88rem', resize: 'vertical',
                    outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                  }}
                />
              </div>
            )}

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
              {/* Faculty */}
              {isFaculty && (
                <ActionBtn
                  disabled={acting}
                  onClick={() => doAction(`/questions/papers/${paper.id}/submit`, {}, 'Paper submitted to Scrutinizer 1!')}
                  variant="primary"
                >
                  {acting ? 'Submitting…' : '📤 Submit to Scrutinizer 1'}
                </ActionBtn>
              )}

              {/* Scrutinizer 1 */}
              {isS1 && (
                <>
                  <ActionBtn
                    disabled={acting}
                    onClick={() => doAction(`/scrutinizer/papers/${paper.id}/pass-to-s2`, { comments: comment }, 'Paper forwarded to Scrutinizer 2!')}
                    variant="primary"
                  >
                    {acting ? 'Processing…' : '➡️ Pass to Scrutinizer 2'}
                  </ActionBtn>
                  <ActionBtn
                    disabled={acting}
                    onClick={() => {
                      if (!comment.trim()) { toast.warning('Please add comments explaining what needs to be revised.'); return; }
                      doAction(`/scrutinizer/papers/${paper.id}/reject`, { comments: comment }, 'Paper sent back to faculty for revision!');
                    }}
                    variant="danger"
                  >
                    {acting ? 'Processing…' : '↩️ Send Back to Faculty'}
                  </ActionBtn>
                </>
              )}

              {/* Scrutinizer 2 */}
              {isS2 && (
                <>
                  <ActionBtn
                    disabled={acting}
                    onClick={() => doAction(`/scrutinizer/papers/${paper.id}/approve`, { comments: comment }, 'Paper approved — sent to Panel!')}
                    variant="success"
                  >
                    {acting ? 'Processing…' : '✅ Approve & Send to Panel'}
                  </ActionBtn>
                  <ActionBtn
                    disabled={acting}
                    onClick={() => {
                      if (!comment.trim()) { toast.warning('Please add comments explaining what needs to be revised.'); return; }
                      doAction(`/scrutinizer/papers/${paper.id}/reject`, { comments: comment }, 'Paper sent back to faculty for revision!');
                    }}
                    variant="danger"
                  >
                    {acting ? 'Processing…' : '↩️ Send Back to Faculty'}
                  </ActionBtn>
                </>
              )}

              {/* Panel */}
              {isPanel && (
                <>
                  <div style={{ width: '100%', marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                      Comments for HOD (optional)
                    </label>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Add your review notes for HOD…"
                      rows={3}
                      style={{
                        width: '100%', border: '1.5px solid #D1D5DB', borderRadius: 10,
                        padding: '0.75rem', fontSize: '0.88rem', resize: 'vertical',
                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <ActionBtn
                    disabled={acting}
                    onClick={() => doAction(`/hod/panel/papers/${paper.id}/submit`, { comments: comment }, 'Paper forwarded to HOD!')}
                    variant="primary"
                  >
                    {acting ? 'Processing…' : '📨 Approve & Forward to HOD'}
                  </ActionBtn>
                </>
              )}

              {/* HOD */}
              {isHOD && (
                <>
                  <div style={{ width: '100%', marginBottom: '0.75rem' }}>
                    <label style={{ display: 'block', fontSize: '0.83rem', fontWeight: 600, color: '#374151', marginBottom: '0.4rem' }}>
                      Approval Comments (required)
                    </label>
                    <textarea
                      value={comment}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Add your final approval comments…"
                      rows={3}
                      style={{
                        width: '100%', border: '1.5px solid #D1D5DB', borderRadius: 10,
                        padding: '0.75rem', fontSize: '0.88rem', resize: 'vertical',
                        outline: 'none', fontFamily: 'inherit', boxSizing: 'border-box',
                      }}
                    />
                  </div>
                  <ActionBtn
                    disabled={acting}
                    onClick={() => {
                      if (!comment.trim()) { toast.warning('Please add approval comments.'); return; }
                      doAction(`/hod/papers/${paper.id}/approve`, { comments: comment }, 'Paper given final HOD approval!');
                    }}
                    variant="success"
                  >
                    {acting ? 'Processing…' : '🏛️ Final Approval (HOD)'}
                  </ActionBtn>
                  <ActionBtn
                    disabled={acting}
                    onClick={() => {
                      if (!comment.trim()) { toast.warning('Rejection comments are required.'); return; }
                      doAction(`/hod/papers/${paper.id}/reject`, { comments: comment }, 'Paper sent back to Panel Member.');
                    }}
                    variant="danger"
                  >
                    {acting ? 'Processing…' : '↩️ Reject & Send Back'}
                  </ActionBtn>
                </>
              )}
            </div>
          </div>
        )}

        {/* No-action info bar for viewers */}
        {!showActions && (
          <div style={{ background: '#F8FAFC', borderRadius: 14, padding: '1.25rem 1.75rem', border: '1px solid #E5E7EB', color: '#64748B', fontSize: '0.88rem', textAlign: 'center' }}>
            👁️ You are viewing this paper in read-only mode. Current status: <strong>{STATUS_CFG[s]?.label || s}</strong>
          </div>
        )}
      </div>
    </div>
  );
}
