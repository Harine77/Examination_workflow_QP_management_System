import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';

const API = (import.meta.env.VITE_API_URL || 'http://localhost:5000/api') + '/scrutinizer';

// ─── MOCK DATA (matches your real DB schema) ──────────────────────────────────
const MOCK = [
  {
    paper_title: 'Paper 1',
    status: 'IN_PROGRESS',
    progress: { total: 11, approved: 4, suggested: 1, reviewed: 5 },
    sections: {
      '2M': [
        { id:1, paper_title:'Paper 1', section:'2M', question_no:'1', marks:2, question:'Define a stack and list its two primary operations.', review_status:'APPROVED' },
        { id:2, paper_title:'Paper 1', section:'2M', question_no:'2', marks:2, question:'What is the difference between an array and a linked list?', review_status:'APPROVED' },
        { id:3, paper_title:'Paper 1', section:'2M', question_no:'3', marks:2, question:'State the time complexity of binary search.', review_status:'SUGGESTED', review_suggestion:'Rephrase to ask for derivation, not just the answer.' },
        { id:4, paper_title:'Paper 1', section:'2M', question_no:'4', marks:2, question:'Define a complete binary tree.', review_status:null },
      ],
      '6M': [
        { id:5, paper_title:'Paper 1', section:'6M', question_no:'5', marks:6, question:'Explain insertion and deletion in a doubly linked list with diagrams.', review_status:'APPROVED' },
        { id:6, paper_title:'Paper 1', section:'6M', question_no:'6', marks:6, question:'Describe the working of quicksort algorithm with an example.', review_status:'APPROVED' },
        { id:7, paper_title:'Paper 1', section:'6M', question_no:'7', marks:6, question:'Explain graph traversal: BFS and DFS with examples.', review_status:null },
      ],
      '12M': [
        { id:8,  paper_title:'Paper 1', section:'12M', question_no:'8a', marks:12, question:'Discuss AVL tree implementation with rotations and time complexity analysis.', review_status:null },
        { id:9,  paper_title:'Paper 1', section:'12M', question_no:'8b', marks:12, question:'Explain B-Trees and B+ Trees. Compare their structure and database indexing use cases.', review_status:null },
        { id:10, paper_title:'Paper 1', section:'12M', question_no:'9a', marks:12, question:"Implement Dijkstra's shortest path algorithm. Trace through an example and analyse complexity.", review_status:null },
        { id:11, paper_title:'Paper 1', section:'12M', question_no:'9b', marks:12, question:'Explain dynamic programming with 0/1 Knapsack. Derive the recurrence and trace with an example.', review_status:null },
      ],
    },
  },
  {
    paper_title: 'Paper 2',
    status: 'PENDING',
    progress: { total: 11, approved: 0, suggested: 0, reviewed: 0 },
    sections: {
      '2M': [
        { id:12, paper_title:'Paper 2', section:'2M', question_no:'1', marks:2, question:'What is a process? How does it differ from a program?', review_status:null },
        { id:13, paper_title:'Paper 2', section:'2M', question_no:'2', marks:2, question:'Define thrashing in operating systems.', review_status:null },
        { id:14, paper_title:'Paper 2', section:'2M', question_no:'3', marks:2, question:'What is a semaphore? Name its two operations.', review_status:null },
        { id:15, paper_title:'Paper 2', section:'2M', question_no:'4', marks:2, question:'Distinguish between preemptive and non-preemptive scheduling.', review_status:null },
      ],
      '6M': [
        { id:16, paper_title:'Paper 2', section:'6M', question_no:'5', marks:6, question:'Explain virtual memory and demand paging with page fault handling.', review_status:null },
        { id:17, paper_title:'Paper 2', section:'6M', question_no:'6', marks:6, question:"Describe the Banker's Algorithm for deadlock avoidance with an example.", review_status:null },
        { id:18, paper_title:'Paper 2', section:'6M', question_no:'7', marks:6, question:'Compare FCFS, SJF, and Round Robin CPU scheduling with examples.', review_status:null },
      ],
      '12M': [
        { id:19, paper_title:'Paper 2', section:'12M', question_no:'8a', marks:12, question:'Explain memory management: paging, segmentation, and segmented paging. Compare advantages.', review_status:null },
        { id:20, paper_title:'Paper 2', section:'12M', question_no:'8b', marks:12, question:'Describe the producer-consumer problem with semaphore solution and race condition explanation.', review_status:null },
        { id:21, paper_title:'Paper 2', section:'12M', question_no:'9a', marks:12, question:'Discuss file system structure. Explain FAT, inode-based, and journaling file systems.', review_status:null },
        { id:22, paper_title:'Paper 2', section:'12M', question_no:'9b', marks:12, question:'Explain deadlock detection and recovery using resource allocation graph.', review_status:null },
      ],
    },
  },
  {
    paper_title: 'Paper 3',
    status: 'PENDING',
    progress: { total: 11, approved: 0, suggested: 0, reviewed: 0 },
    sections: {
      '2M': [
        { id:23, paper_title:'Paper 3', section:'2M', question_no:'1', marks:2, question:'Define tuple.', review_status:null },
        { id:24, paper_title:'Paper 3', section:'2M', question_no:'2', marks:2, question:'What is a candidate key?', review_status:null },
        { id:25, paper_title:'Paper 3', section:'2M', question_no:'3', marks:2, question:'Define relation.', review_status:null },
        { id:26, paper_title:'Paper 3', section:'2M', question_no:'4', marks:2, question:'What is DDL?', review_status:null },
      ],
      '6M': [
        { id:27, paper_title:'Paper 3', section:'6M', question_no:'5', marks:6, question:'Explain relational algebra operations.', review_status:null },
        { id:28, paper_title:'Paper 3', section:'6M', question_no:'6', marks:6, question:'Explain aggregate functions in SQL.', review_status:null },
        { id:29, paper_title:'Paper 3', section:'6M', question_no:'7', marks:6, question:'Discuss views and their advantages.', review_status:null },
      ],
      '12M': [
        { id:30, paper_title:'Paper 3', section:'12M', question_no:'8a', marks:12, question:'Explain distributed databases.', review_status:null },
        { id:31, paper_title:'Paper 3', section:'12M', question_no:'8b', marks:12, question:'Explain data warehousing concepts.', review_status:null },
        { id:32, paper_title:'Paper 3', section:'12M', question_no:'9a', marks:12, question:'Explain query optimization techniques.', review_status:null },
        { id:33, paper_title:'Paper 3', section:'12M', question_no:'9b', marks:12, question:'Explain NoSQL databases.', review_status:null },
      ],
    },
  },
];

// ─── STYLES ───────────────────────────────────────────────────────────────────
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
  --yellow: #F5C400;
  --yello2: #FFD740;
  --yello3: #FFF3B0;
  --yello4: #FFFBEA;
  --red:    #C0392B;
  --green:  #1B7A3E;
  --border: #E0E0E0;
  --shadow: 0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
  --shadow-lg: 0 8px 40px rgba(0,0,0,0.14);
}

.sd { font-family:'IBM Plex Sans', sans-serif; background:var(--white); color:var(--black); min-height:100vh; }

/* ── NAVBAR ── */
.sd-nav {
  position: sticky; top:0; z-index:200;
  background: var(--black);
  border-bottom: 3px solid var(--yellow);
  height: 60px;
  display: flex; align-items: center; justify-content: space-between;
  padding: 0 2rem;
}
.sd-nav-brand {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem; font-weight: 800;
  color: var(--white); letter-spacing: -0.01em;
}
.sd-nav-brand span { color: var(--yellow); }
.sd-nav-right { display: flex; align-items: center; gap: 1.5rem; }
.sd-nav-pill {
  display: flex; gap: 4px;
  background: rgba(255,255,255,0.08);
  border-radius: 6px; padding: 4px;
}
.sd-nav-tab {
  padding: 5px 14px; border-radius: 4px;
  font-size: 0.78rem; font-weight: 500;
  cursor: pointer; transition: all 0.2s ease;
  background: transparent; border: none; color: var(--grey4);
}
.sd-nav-tab:hover { color: var(--white); }
.sd-nav-tab.active {
  background: var(--yellow); color: var(--black); font-weight: 600;
}
.sd-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--yellow);
  display: flex; align-items: center; justify-content: center;
  font-size: 0.75rem; font-weight: 700; color: var(--black);
  cursor: pointer;
}

/* ── LAYOUT ── */
.sd-main { max-width: 1380px; margin: 0 auto; padding: 2rem 1.5rem 5rem; }

/* ── HEADER STRIP ── */
.sd-header {
  border-bottom: 1px solid var(--border);
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  display: flex; align-items: flex-end; justify-content: space-between;
}
.sd-header-left h1 {
  font-family: 'Playfair Display', serif;
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 800; line-height: 1; letter-spacing: -0.03em;
}
.sd-header-left p { color: var(--grey3); font-size: 0.9rem; margin-top: 0.4rem; font-weight: 300; }
.sd-header-accent {
  width: 48px; height: 6px;
  background: var(--yellow);
  margin-top: 0.75rem;
}
.sd-compare-btn {
  display: flex; align-items: center; gap: 0.5rem;
  background: var(--yellow); color: var(--black);
  border: none; border-radius: 6px;
  padding: 0.65rem 1.3rem;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.85rem; font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 2px 8px rgba(245,196,0,0.4);
}
.sd-compare-btn:hover { transform: translateY(-2px) scale(1.03); box-shadow: 0 6px 20px rgba(245,196,0,0.5); }

/* ── STAT CARDS ── */
.sd-stats {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 2rem;
}
.sd-stat {
  background: var(--white);
  padding: 1.4rem 1.5rem;
  transition: background 0.2s ease;
}
.sd-stat:hover { background: var(--yello4); }
.sd-stat-label {
  font-size: 0.68rem; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--grey3); margin-bottom: 0.5rem;
}
.sd-stat-val {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 2.2rem; font-weight: 500; line-height: 1;
  color: var(--black);
}
.sd-stat-val.yellow { color: var(--yellow); }
.sd-stat-val.green  { color: var(--green);  }
.sd-stat-val.red    { color: var(--red);    }
.sd-stat-sub { font-size: 0.73rem; color: var(--grey3); margin-top: 0.35rem; }

/* ── SECTION LABEL ── */
.sd-section-label {
  display: flex; align-items: center; gap: 1rem;
  font-size: 0.68rem; font-weight: 600;
  letter-spacing: 0.15em; text-transform: uppercase; color: var(--grey3);
  margin-bottom: 1.25rem;
}
.sd-section-label::after { content:''; flex:1; height:1px; background:var(--border); }

/* ── PAPER GRID ── */
.sd-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 1.5rem;
}

/* ── PAPER CARD ── */
.sd-card {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 10px;
  overflow: hidden;
  transition: box-shadow 0.25s ease, transform 0.25s ease;
  cursor: grab;
}
.sd-card:active { cursor: grabbing; }
.sd-card:hover {
  box-shadow: var(--shadow-lg);
  transform: translateY(-3px);
}
.sd-card.drag-over {
  border-color: var(--yellow);
  box-shadow: 0 0 0 2px var(--yellow);
}

/* Card top accent bar */
.sd-card-accent {
  height: 4px;
}
.accent-pending    { background: var(--grey5); }
.accent-in_progress { background: linear-gradient(90deg, var(--yellow) 0%, var(--yello2) 100%); }
.accent-approved   { background: var(--green); }
.accent-needs_revision { background: var(--red); }

.sd-card-head {
  padding: 1.1rem 1.25rem 0.9rem;
  border-bottom: 1px solid var(--grey6);
  display: flex; align-items: flex-start; justify-content: space-between; gap: 0.75rem;
}
.sd-card-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.05rem; font-weight: 700; color: var(--black); line-height: 1.2;
}
.sd-card-sub { font-size: 0.73rem; color: var(--grey3); margin-top: 0.2rem; font-weight: 300; }

/* Status badge */
.sd-status {
  display: inline-flex; align-items: center; gap: 0.3rem;
  padding: 3px 10px; border-radius: 4px;
  font-size: 0.65rem; font-weight: 600; letter-spacing: 0.06em;
  text-transform: uppercase; white-space: nowrap; flex-shrink: 0;
  border: 1px solid;
}
.status-pending      { background:#F5F5F5; color:var(--grey3); border-color:var(--grey5); }
.status-in_progress  { background:var(--yello3); color:#7A5F00; border-color:#E5B800; }
.status-approved     { background:#E8F5EE; color:var(--green); border-color:#A5D6B8; }
.status-needs_revision { background:#FDEEEE; color:var(--red); border-color:#F0AAAA; }

/* Progress */
.sd-progress-wrap { padding: 0.75rem 1.25rem; border-bottom: 1px solid var(--grey6); }
.sd-progress-meta { display:flex; justify-content:space-between; font-size:0.7rem; color:var(--grey3); margin-bottom:0.35rem; }
.sd-progress-meta span:last-child { font-family:'IBM Plex Mono',monospace; font-weight:500; color:var(--black); }
.sd-bar { height:3px; background:var(--grey6); border-radius:3px; overflow:hidden; }
.sd-bar-fill {
  height:100%; border-radius:3px;
  background: var(--yellow);
  transition: width 1s cubic-bezier(0.65,0,0.35,1);
}

/* Sections inside card */
.sd-card-body { padding: 1rem 1.25rem; }
.sd-sec-head {
  display: flex; align-items: center; gap: 0.5rem;
  font-size: 0.64rem; font-weight: 600; letter-spacing: 0.12em;
  text-transform: uppercase; color: var(--grey3);
  margin: 0.75rem 0 0.5rem;
}
.sd-sec-tag {
  display: inline-block; padding: 1px 7px; border-radius: 3px;
  font-size: 0.62rem; font-weight: 600;
}
.tag-2m  { background: #EEF4FF; color: #2B5CC8; }
.tag-6m  { background: #FFF4E6; color: #B34700; }
.tag-12m { background: #F4EEFF; color: #6B2FC0; }

.sd-q-row {
  display: flex; align-items: flex-start; gap: 0.6rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--grey6);
  transition: background 0.15s ease;
  margin: 0 -1.25rem; padding-left: 1.25rem; padding-right: 1.25rem;
}
.sd-q-row:last-child { border-bottom: none; }
.sd-q-row:hover { background: var(--yello4); }

.sd-qno-btn {
  flex-shrink: 0;
  width: 34px; height: 26px;
  border-radius: 4px;
  border: 1px solid var(--border);
  background: var(--white);
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem; font-weight: 500;
  color: var(--grey2);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  display: flex; align-items: center; justify-content: center;
}
.sd-qno-btn:hover {
  background: var(--yellow); border-color: var(--yellow);
  color: var(--black); transform: scale(1.12);
  box-shadow: 0 2px 8px rgba(245,196,0,0.5);
}
.sd-qno-btn.r-approved  { border-color: var(--green); color: var(--green); background: #E8F5EE; }
.sd-qno-btn.r-suggested { border-color: var(--red);   color: var(--red);   background: #FDEEEE; }

.sd-q-text { font-size: 0.8rem; color: var(--grey2); line-height: 1.5; flex:1; }
.sd-q-icon { flex-shrink:0; font-size:0.8rem; width:16px; text-align:center; margin-top:2px; }

/* Card footer */
.sd-card-footer {
  padding: 0.75rem 1.25rem;
  border-top: 1px solid var(--grey6);
  display: flex; gap: 0.5rem;
}
.sd-btn {
  flex:1; padding: 0.5rem 0.75rem; border-radius: 5px;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.75rem; font-weight: 600;
  cursor: pointer; border: 1px solid;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  display: flex; align-items: center; justify-content: center; gap: 0.3rem;
}
.sd-btn:hover { transform: scale(1.03); }
.sd-btn-approve {
  background: var(--black); color: var(--white); border-color: var(--black);
}
.sd-btn-approve:hover { background: var(--grey1); box-shadow: 0 4px 12px rgba(0,0,0,0.25); }
.sd-btn-compare {
  background: var(--white); color: var(--black); border-color: var(--border);
}
.sd-btn-compare:hover { border-color: var(--yellow); background: var(--yello4); }

/* ── PIPELINE VIEW ── */
.sd-pipeline { display: grid; grid-template-columns: repeat(3,1fr); gap: 1rem; margin-bottom: 2rem; }
.sd-pipe-col { border: 1px solid var(--border); border-radius: 10px; overflow: hidden; }
.sd-pipe-head {
  padding: 0.85rem 1rem;
  font-size: 0.7rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  display: flex; align-items: center; justify-content: space-between;
  border-bottom: 1px solid var(--border);
}
.pipe-approved   .sd-pipe-head { background: #E8F5EE; color: var(--green); }
.pipe-unapproved .sd-pipe-head { background: #FDEEEE; color: var(--red); }
.pipe-pending    .sd-pipe-head { background: var(--grey6); color: var(--grey3); }
.sd-pipe-body { padding: 0.75rem 1rem; }
.sd-pipe-item {
  font-size: 0.8rem; color: var(--grey2);
  padding: 0.5rem 0.75rem; border-radius: 5px;
  border: 1px solid var(--border); background: var(--white);
  margin-bottom: 0.4rem;
}
.sd-pipe-item:last-child { margin-bottom: 0; }
.sd-pipe-empty { font-size: 0.75rem; color: var(--grey4); font-style: italic; padding: 0.5rem 0; }
.sd-pipe-badge {
  background: var(--black); color: var(--white);
  border-radius: 50px; font-size: 0.62rem; font-weight: 700;
  width: 20px; height: 20px; display:flex; align-items:center; justify-content:center;
}

/* ── STATUS TABLE ── */
.sd-table-wrap {
  border: 1px solid var(--border); border-radius: 10px; overflow: hidden;
}
.sd-table { width:100%; border-collapse:collapse; }
.sd-table th {
  background: var(--black); color: var(--white);
  font-size: 0.65rem; font-weight: 600; letter-spacing: 0.1em; text-transform: uppercase;
  padding: 0.75rem 1rem; text-align: left;
}
.sd-table th:first-child { color: var(--yellow); }
.sd-table td {
  padding: 0.8rem 1rem; font-size: 0.8rem; border-bottom: 1px solid var(--grey6);
  vertical-align: middle;
}
.sd-table tr:last-child td { border-bottom: none; }
.sd-table tr:nth-child(even) td { background: #FCFCFC; }
.sd-table tr:hover td { background: var(--yello4); }
.sd-table td:first-child { font-weight: 500; }
.sd-mono { font-family: 'IBM Plex Mono', monospace; font-size: 0.78rem; }

/* ── COMPARE MODAL ── */
.sd-backdrop {
  position: fixed; inset: 0; z-index: 500;
  background: rgba(10,10,10,0.65);
  backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center;
  padding: 1.5rem;
  animation: bdIn 0.2s ease;
}
@keyframes bdIn { from{opacity:0} to{opacity:1} }

.sd-modal {
  background: var(--white);
  border: 1px solid var(--border);
  border-radius: 12px;
  width: 100%; max-width: 1080px;
  max-height: 90vh;
  display: flex; flex-direction: column;
  overflow: hidden;
  box-shadow: 0 40px 100px rgba(0,0,0,0.3);
  animation: modIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes modIn {
  from{ opacity:0; transform:scale(0.92) translateY(16px); }
  to{   opacity:1; transform:scale(1)    translateY(0); }
}

.sd-modal-top {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid var(--border);
  display: flex; align-items: center; justify-content: space-between;
  background: var(--black);
  flex-shrink: 0;
}
.sd-modal-title {
  font-family: 'Playfair Display', serif;
  font-size: 1.1rem; font-weight: 700; color: var(--white);
}
.sd-modal-title span { color: var(--yellow); }
.sd-modal-sub { font-size: 0.73rem; color: var(--grey4); margin-top: 0.15rem; }
.sd-modal-x {
  width: 32px; height: 32px; border-radius: 6px;
  border: 1px solid rgba(255,255,255,0.15);
  background: rgba(255,255,255,0.08);
  color: var(--grey4); font-size: 1rem;
  cursor: pointer; display:flex; align-items:center; justify-content:center;
  transition: all 0.2s ease;
}
.sd-modal-x:hover { background: rgba(255,80,80,0.2); color: #FF6B6B; border-color:rgba(255,80,80,0.3); }

.sd-modal-body {
  flex:1; overflow-y: auto; padding: 1.5rem;
  scrollbar-width: thin; scrollbar-color: var(--grey5) transparent;
}

/* Q nav bar inside modal */
.sd-qnav { display:flex; align-items:center; gap:0.75rem; margin-bottom:1rem; }
.sd-qnav-arrow {
  padding: 0.4rem 1rem; border-radius: 5px;
  border: 1px solid var(--border); background: var(--white);
  font-size: 0.78rem; font-weight: 500; cursor: pointer; color: var(--black);
  transition: all 0.2s ease;
}
.sd-qnav-arrow:hover:not(:disabled) { border-color: var(--yellow); background: var(--yello4); }
.sd-qnav-arrow:disabled { opacity: 0.3; cursor: not-allowed; }
.sd-qnav-center {
  flex:1; text-align:center;
  font-family: 'Playfair Display', serif;
  font-size: 1rem; font-weight: 700;
}
.sd-qno-pills { display:flex; flex-wrap:wrap; gap:0.35rem; margin-bottom:1.25rem; }
.sd-qpill {
  padding: 3px 10px; border-radius: 4px; border: 1px solid var(--border);
  background: var(--white); font-family: 'IBM Plex Mono', monospace;
  font-size: 0.68rem; font-weight: 500; cursor: pointer; color: var(--grey2);
  transition: all 0.18s ease;
}
.sd-qpill:hover { border-color: var(--yellow); background: var(--yello4); }
.sd-qpill.active { background: var(--black); color: var(--white); border-color: var(--black); }
.sd-qpill.done   { background: #E8F5EE; color: var(--green); border-color: #A5D6B8; }
.sd-qpill.flagged{ background: #FDEEEE; color: var(--red);   border-color: #F0AAAA; }

/* 3-column compare */
.sd-cols { display:grid; grid-template-columns:repeat(3,1fr); gap:1rem; }
.sd-col {
  border: 1px solid var(--border); border-radius: 8px; overflow: hidden;
  transition: box-shadow 0.2s ease;
}
.sd-col:hover { box-shadow: 0 4px 20px rgba(0,0,0,0.1); }
.sd-col-top {
  padding: 0.9rem 1rem;
  background: var(--black); border-bottom: 1px solid var(--border);
}
.sd-col-title { font-family:'Playfair Display',serif; font-size:0.9rem; font-weight:700; color:var(--white); }
.sd-col-sub   { font-size:0.68rem; color:var(--grey4); margin-top:0.15rem; }
.sd-col-q { padding:1rem; font-size:0.82rem; color:var(--grey1); line-height:1.65; min-height:110px; }
.sd-col-actions { padding:0.9rem 1rem; border-top:1px solid var(--grey6); display:flex; flex-direction:column; gap:0.5rem; }

.sd-action-pair { display:flex; gap:0.4rem; }
.sd-mini-btn {
  flex:1; padding:0.45rem 0; border-radius:5px; border:1px solid;
  font-family:'IBM Plex Sans',sans-serif; font-size:0.73rem; font-weight:600;
  cursor:pointer; transition:all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  display:flex; align-items:center; justify-content:center; gap:0.25rem;
}
.sd-mini-btn:hover { transform:scale(1.05); }
.btn-approve { background:var(--black); color:var(--white); border-color:var(--black); }
.btn-approve:hover { background:#2A2A2A; box-shadow:0 3px 10px rgba(0,0,0,0.3); }
.btn-suggest { background:var(--white); color:var(--red); border-color:var(--red); }
.btn-suggest:hover { background:#FDEEEE; }
.btn-send { background:var(--yellow); color:var(--black); border-color:var(--yellow); font-weight:700; }
.btn-send:hover { background:var(--yello2); box-shadow:0 3px 10px rgba(245,196,0,0.5); }
.btn-revise { background:var(--white); color:var(--grey3); border-color:var(--border); font-size:0.68rem; }
.btn-revise:hover { border-color:var(--yellow); background:var(--yello4); }

.sd-textarea {
  width:100%; background:var(--grey6); border:1px solid var(--border);
  border-radius:5px; color:var(--black); resize:vertical; min-height:68px;
  font-family:'IBM Plex Sans',sans-serif; font-size:0.78rem;
  padding:0.5rem 0.75rem; outline:none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease;
}
.sd-textarea:focus { border-color:var(--yellow); box-shadow:0 0 0 3px rgba(245,196,0,0.2); }
.sd-textarea::placeholder { color:var(--grey4); }

.sd-already {
  padding:0.45rem 0.6rem; border-radius:5px; font-size:0.73rem; font-weight:500;
}
.sd-already.approved { background:#E8F5EE; color:var(--green); }
.sd-already.suggested { background:#FDEEEE; color:var(--red); }
.sd-already-note { font-size:0.68rem; font-weight:400; opacity:0.8; margin-top:0.2rem; font-style:italic; }

/* ── TOAST ── */
.sd-toasts {
  position:fixed; bottom:1.5rem; right:1.5rem; z-index:999;
  display:flex; flex-direction:column; gap:0.5rem; pointer-events:none;
}
.sd-toast {
  background:var(--black); color:var(--white);
  border-radius:7px; padding:0.7rem 1.1rem;
  font-size:0.8rem; display:flex; align-items:center; gap:0.6rem;
  border-left: 4px solid var(--yellow);
  box-shadow:0 8px 24px rgba(0,0,0,0.25);
  animation: toastIn 0.35s cubic-bezier(0.34,1.56,0.64,1);
}
.sd-toast.err { border-left-color: var(--red); }
@keyframes toastIn { from{opacity:0;transform:translateX(80px)} to{opacity:1;transform:translateX(0)} }

/* ── SYNC BUTTON PANEL ── */
.sd-sync-panel {
  border: 2px dashed var(--border);
  border-radius: 10px;
  padding: 1.5rem 1.75rem;
  margin-bottom: 2rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.5rem;
  background: var(--yello4);
  transition: border-color 0.2s ease;
}
.sd-sync-panel:hover { border-color: var(--yellow); }
.sd-sync-panel-left h3 {
  font-family: 'Playfair Display', serif;
  font-size: 1rem; font-weight: 700; color: var(--black);
}
.sd-sync-panel-left p {
  font-size: 0.78rem; color: var(--grey3); margin-top: 0.25rem; font-weight: 300;
}
.sd-sync-btn {
  flex-shrink: 0;
  display: flex; align-items: center; gap: 0.6rem;
  background: var(--black); color: var(--white);
  border: none; border-radius: 7px;
  padding: 0.75rem 1.6rem;
  font-family: 'IBM Plex Sans', sans-serif;
  font-size: 0.85rem; font-weight: 600;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.34,1.56,0.64,1);
  box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  white-space: nowrap;
}
.sd-sync-btn:hover:not(:disabled) {
  background: var(--grey1);
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 6px 20px rgba(0,0,0,0.3);
}
.sd-sync-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
.sd-sync-btn.syncing { background: var(--grey2); }
.sd-sync-result {
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  border-radius: 6px;
  font-size: 0.8rem; font-weight: 500;
  border: 1px solid;
}
.sd-sync-result.success { background: #E8F5EE; color: var(--green); border-color: #A5D6B8; }
.sd-sync-result.error   { background: #FDEEEE; color: var(--red);   border-color: #F0AAAA; }
.sd-sync-progress {
  margin-top: 0.75rem;
  font-size: 0.75rem; color: var(--grey3);
}
.sd-sync-progress-bar { height: 3px; background: var(--grey6); border-radius: 3px; overflow:hidden; margin-top:0.3rem; }
.sd-sync-progress-fill {
  height: 100%; border-radius: 3px;
  background: var(--yellow);
  transition: width 0.3s ease;
}

/* ── LOADER ── */
.sd-loader {
  display:flex; flex-direction:column; align-items:center; justify-content:center;
  padding: 5rem 0; gap:1rem; color:var(--grey3);
}
.sd-spin {
  width:36px; height:36px; border-radius:50%;
  border:3px solid var(--grey6); border-top-color:var(--yellow);
  animation:spin 0.7s linear infinite;
}
@keyframes spin { to{transform:rotate(360deg)} }

@media(max-width:900px){
  .sd-cols { grid-template-columns:1fr; }
  .sd-grid { grid-template-columns:1fr; }
  .sd-stats { grid-template-columns:repeat(2,1fr); }
  .sd-pipeline { grid-template-columns:1fr; }
  .sd-nav-pill { display:none; }
  .sd-header { flex-direction:column; align-items:flex-start; gap:1rem; }
}
`;

// ─── UTILITIES ────────────────────────────────────────────────────────────────
const ALL_Q = ['1','2','3','4','5','6','7','8a','8b','9a','9b'];

const statusMeta = {
  PENDING:        { label:'Pending',        cls:'status-pending',       accent:'accent-pending' },
  IN_PROGRESS:    { label:'In Progress',    cls:'status-in_progress',   accent:'accent-in_progress' },
  APPROVED:       { label:'Approved',       cls:'status-approved',      accent:'accent-approved' },
  NEEDS_REVISION: { label:'Needs Revision', cls:'status-needs_revision', accent:'accent-needs_revision' },
};

// ─── TOAST HOOK ───────────────────────────────────────────────────────────────
function useToast() {
  const [toasts, setToasts] = useState([]);
  const push = useCallback((msg, err = false) => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, err }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);
  return { toasts, push };
}

// ─── COMPONENTS ───────────────────────────────────────────────────────────────

function QuestionRow({ q, revMap, onCompare }) {
  const rev = revMap[`${q.paper_title}||${q.question_no}`];
  const rCls = rev?.status === 'APPROVED' ? 'r-approved' : rev?.status === 'SUGGESTED' ? 'r-suggested' : '';
  return (
    <div className="sd-q-row">
      <button
        className={`sd-qno-btn ${rCls}`}
        onClick={() => onCompare(q.question_no)}
        title="Compare across all papers"
      >
        {q.question_no}
      </button>
      <div className="sd-q-text">{q.question}</div>
      <div className="sd-q-icon">
        {rev?.status === 'APPROVED'  && <span style={{color:'var(--green)',fontWeight:700}}>✓</span>}
        {rev?.status === 'SUGGESTED' && <span style={{color:'var(--red)'}}>!</span>}
      </div>
    </div>
  );
}

function PaperCard({ paper, revMap, onCompare, onBulkApprove, onDrag }) {
  const prog = paper.progress || { total:0,approved:0,suggested:0,reviewed:0 };
  const pct  = prog.total ? Math.round((prog.reviewed/prog.total)*100) : 0;
  const sm   = statusMeta[paper.status] || statusMeta.PENDING;
  const [dragOver, setDragOver] = useState(false);

  return (
    <div
      className={`sd-card ${dragOver ? 'drag-over' : ''}`}
      draggable
      onDragStart={e => onDrag.start(e, paper.paper_title)}
      onDragOver={e => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onDrop={e => { setDragOver(false); onDrag.drop(e, paper.paper_title); }}
    >
      <div className={`sd-card-accent ${sm.accent}`} />

      <div className="sd-card-head">
        <div>
          <div className="sd-card-title">{paper.paper_title}</div>
          <div className="sd-card-sub">
            {prog.total} questions · {prog.approved} approved · {prog.suggested} flagged
          </div>
        </div>
        <span className={`sd-status ${sm.cls}`}>{sm.label}</span>
      </div>

      <div className="sd-progress-wrap">
        <div className="sd-progress-meta">
          <span>Review progress</span>
          <span className="sd-mono">{prog.reviewed}/{prog.total}</span>
        </div>
        <div className="sd-bar">
          <div className="sd-bar-fill" style={{ width:`${pct}%` }} />
        </div>
      </div>

      <div className="sd-card-body">
        {['2M','6M','12M'].map(sec => {
          const qs = paper.sections[sec];
          if (!qs?.length) return null;
          return (
            <div key={sec}>
              <div className="sd-sec-head">
                <span className={`sd-sec-tag ${sec==='2M'?'tag-2m':sec==='6M'?'tag-6m':'tag-12m'}`}>
                  {sec}
                </span>
                {sec==='2M'?'2-Mark Questions':sec==='6M'?'6-Mark Questions':'12-Mark Either / Or'}
              </div>
              {qs.map(q => (
                <QuestionRow key={q.id} q={q} revMap={revMap} onCompare={onCompare} />
              ))}
            </div>
          );
        })}
      </div>

      <div className="sd-card-footer">
        <button className="sd-btn sd-btn-approve" onClick={() => onBulkApprove(paper.paper_title)}>
          ✓ Approve All
        </button>
        <button className="sd-btn sd-btn-compare" onClick={() => onCompare('1')}>
          ⇄ Compare View
        </button>
      </div>
    </div>
  );
}

function CompareModal({ papers, revMap, onClose, onSave, initQ }) {
  const [curQ, setCurQ]         = useState(initQ || '1');
  const [sug, setSug]           = useState({});
  const [showTA, setShowTA]     = useState({});
  const [saving, setSaving]     = useState({});

  const qIdx = ALL_Q.indexOf(curQ);

  const getRev = (pt, qno) => revMap[`${pt}||${qno}`];

  const handleApprove = async (pt, qno) => {
    const k = `${pt}||${qno}`;
    setSaving(s => ({...s,[k]:true}));
    await onSave(pt, qno, 'APPROVED', null);
    setSaving(s => ({...s,[k]:false}));
    setShowTA(s => ({...s,[k]:false}));
  };

  const handleSuggest = async (pt, qno) => {
    const k = `${pt}||${qno}`;
    const txt = (sug[k]||'').trim();
    if (!txt) { setShowTA(s => ({...s,[k]:true})); return; }
    setSaving(s => ({...s,[k]:true}));
    await onSave(pt, qno, 'SUGGESTED', txt);
    setSaving(s => ({...s,[k]:false}));
    setShowTA(s => ({...s,[k]:false}));
  };

  return (
    <div className="sd-backdrop" onClick={e => e.target===e.currentTarget && onClose()}>
      <div className="sd-modal">
        {/* Header */}
        <div className="sd-modal-top">
          <div>
            <div className="sd-modal-title">
              Question <span>Comparison</span> Mode
            </div>
            <div className="sd-modal-sub">
              Side-by-side review of Q{curQ} across all {papers.length} papers
            </div>
          </div>
          <button className="sd-modal-x" onClick={onClose}>✕</button>
        </div>

        <div className="sd-modal-body">
          {/* Navigation */}
          <div className="sd-qnav">
            <button className="sd-qnav-arrow" disabled={qIdx<=0} onClick={()=>setCurQ(ALL_Q[qIdx-1])}>← Prev</button>
            <div className="sd-qnav-center">Q{curQ} &nbsp;·&nbsp; {qIdx+1} of {ALL_Q.length}</div>
            <button className="sd-qnav-arrow" disabled={qIdx>=ALL_Q.length-1} onClick={()=>setCurQ(ALL_Q[qIdx+1])}>Next →</button>
          </div>

          {/* Pills */}
          <div className="sd-qno-pills">
            {ALL_Q.map(qno => {
              const allDone    = papers.every(p => !!getRev(p.paper_title, qno));
              const hasFlagged = papers.some(p => getRev(p.paper_title, qno)?.status === 'SUGGESTED');
              return (
                <button
                  key={qno}
                  className={`sd-qpill ${curQ===qno?'active':hasFlagged?'flagged':allDone?'done':''}`}
                  onClick={() => setCurQ(qno)}
                >
                  {qno}
                </button>
              );
            })}
          </div>

          {/* 3-column grid */}
          <div className="sd-cols">
            {papers.map(paper => {
              const allQ = Object.values(paper.sections).flat();
              const q    = allQ.find(x => x.question_no === curQ);
              const rev  = getRev(paper.paper_title, curQ);
              const k    = `${paper.paper_title}||${curQ}`;
              const isSaving = saving[k];
              const isTA = showTA[k];

              return (
                <div key={paper.paper_title} className="sd-col">
                  <div className="sd-col-top">
                    <div className="sd-col-title">{paper.paper_title}</div>
                    <div className="sd-col-sub">
                      {q ? `Section ${q.section} · ${q.marks} marks` : 'Not present'}
                    </div>
                  </div>

                  <div className="sd-col-q">
                    {q
                      ? q.question
                      : <em style={{color:'var(--grey4)'}}>This question does not exist in this paper.</em>
                    }
                  </div>

                  {q && (
                    <div className="sd-col-actions">
                      {/* Current review status */}
                      {rev && !isTA && (
                        <div className={`sd-already ${rev.status==='APPROVED'?'approved':'suggested'}`}>
                          {rev.status==='APPROVED' ? '✓ Approved' : '! Flagged for revision'}
                          {rev.suggestion_text && (
                            <div className="sd-already-note">"{rev.suggestion_text}"</div>
                          )}
                        </div>
                      )}

                      {/* Action buttons */}
                      {(!rev || isTA) && (
                        <>
                          {isTA && (
                            <textarea
                              className="sd-textarea"
                              placeholder="Describe the required changes for this question..."
                              value={sug[k]||''}
                              onChange={e => setSug(s=>({...s,[k]:e.target.value}))}
                              autoFocus
                            />
                          )}
                          <div className="sd-action-pair">
                            <button className="sd-mini-btn btn-approve" disabled={isSaving}
                              onClick={() => handleApprove(paper.paper_title, curQ)}>
                              {isSaving ? '…' : '✓ Approve'}
                            </button>
                            {isTA
                              ? <button className="sd-mini-btn btn-send" disabled={isSaving}
                                  onClick={() => handleSuggest(paper.paper_title, curQ)}>
                                  {isSaving ? '…' : '↑ Send'}
                                </button>
                              : <button className="sd-mini-btn btn-suggest" disabled={isSaving}
                                  onClick={() => handleSuggest(paper.paper_title, curQ)}>
                                  ✏ Suggest
                                </button>
                            }
                          </div>
                        </>
                      )}

                      {rev && !isTA && (
                        <button className="sd-mini-btn btn-revise"
                          onClick={() => setShowTA(s=>({...s,[k]:true}))}>
                          ↺ Change Decision
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PipelineView({ papers }) {
  const approved   = papers.filter(p => p.status === 'APPROVED');
  const unapproved = papers.filter(p => p.status === 'NEEDS_REVISION');
  const pending    = papers.filter(p => p.status === 'PENDING' || p.status === 'IN_PROGRESS');

  return (
    <div className="sd-pipeline">
      <div className="sd-pipe-col pipe-approved">
        <div className="sd-pipe-head">
          Approved Papers
          <span className="sd-pipe-badge">{approved.length}</span>
        </div>
        <div className="sd-pipe-body">
          {approved.length===0
            ? <div className="sd-pipe-empty">No papers fully approved yet.</div>
            : approved.map(p => (
                <div key={p.paper_title} className="sd-pipe-item">
                  <span style={{color:'var(--green)',fontWeight:700,marginRight:'0.4rem'}}>✓</span>
                  {p.paper_title}
                  <div style={{fontSize:'0.68rem',color:'var(--grey3)',marginTop:'0.15rem'}}>
                    All {p.progress.total} questions approved
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      <div className="sd-pipe-col pipe-unapproved">
        <div className="sd-pipe-head">
          Needs Revision
          <span className="sd-pipe-badge" style={{background:'var(--red)'}}>{unapproved.length}</span>
        </div>
        <div className="sd-pipe-body">
          {unapproved.length===0
            ? <div className="sd-pipe-empty">No papers flagged.</div>
            : unapproved.map(p => (
                <div key={p.paper_title} className="sd-pipe-item">
                  <span style={{color:'var(--red)',fontWeight:700,marginRight:'0.4rem'}}>!</span>
                  {p.paper_title}
                  <div style={{fontSize:'0.68rem',color:'var(--grey3)',marginTop:'0.15rem'}}>
                    {p.progress.suggested} suggestion(s) · {p.progress.approved} approved
                  </div>
                </div>
              ))
          }
        </div>
      </div>

      <div className="sd-pipe-col pipe-pending">
        <div className="sd-pipe-head">
          Pending / In Progress
          <span className="sd-pipe-badge" style={{background:'var(--grey3)'}}>{pending.length}</span>
        </div>
        <div className="sd-pipe-body">
          {pending.length===0
            ? <div className="sd-pipe-empty">None.</div>
            : pending.map(p => (
                <div key={p.paper_title} className="sd-pipe-item">
                  {p.paper_title}
                  <div style={{fontSize:'0.68rem',color:'var(--grey3)',marginTop:'0.15rem'}}>
                    {p.progress.reviewed}/{p.progress.total} reviewed
                  </div>
                </div>
              ))
          }
        </div>
      </div>
    </div>
  );
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
function ScrutinizerDashboard() {
  const [papers,  setPapers]  = useState([]);
  const [revMap,  setRevMap]  = useState({});       // "paper||qno" → review obj
  const [loading, setLoading] = useState(true);
  const [tab,     setTab]     = useState('papers'); // 'papers' | 'pipeline'
  const [modal,   setModal]   = useState(null);     // { initQ }
  const [order,   setOrder]   = useState([]);
  const { toasts, push }      = useToast();
  const dragRef = useRef(null);

  // ── Fetch ──────────────────────────────────────────────────────────────────
  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [pRes, rRes] = await Promise.all([
        fetch(`${API}/papers`).then(r=>r.json()).catch(()=>null),
        fetch(`${API}/reviews`).then(r=>r.json()).catch(()=>null),
      ]);

      if (pRes?.success) {
        setPapers(pRes.papers);
        setOrder(pRes.papers.map(p => p.paper_title));
        // build revMap from embedded review_status on each question
        const rm = {};
        for (const paper of pRes.papers) {
          for (const qs of Object.values(paper.sections)) {
            for (const q of qs) {
              if (q.review_status) {
                rm[`${q.paper_title}||${q.question_no}`] = {
                  status: q.review_status,
                  suggestion_text: q.review_suggestion || null,
                };
              }
            }
          }
        }
        if (rRes?.success) {
          for (const r of rRes.reviews) {
            rm[`${r.paper_title}||${r.question_no}`] = r;
          }
        }
        setRevMap(rm);
      } else {
        // Demo mode
        setPapers(MOCK);
        setOrder(MOCK.map(p => p.paper_title));
        const rm = {};
        for (const paper of MOCK) {
          for (const qs of Object.values(paper.sections)) {
            for (const q of qs) {
              if (q.review_status) {
                rm[`${q.paper_title}||${q.question_no}`] = {
                  status: q.review_status,
                  suggestion_text: q.review_suggestion || null,
                };
              }
            }
          }
        }
        setRevMap(rm);
        push('Demo mode — connect backend for live data', true);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  // ── Save review ────────────────────────────────────────────────────────────
  const handleSave = useCallback(async (paperTitle, questionNo, status, suggestionText) => {
    const k = `${paperTitle}||${questionNo}`;

    // Optimistic update
    setRevMap(prev => ({ ...prev, [k]: { status, suggestion_text: suggestionText } }));

    setPapers(prev => prev.map(p => {
      if (p.paper_title !== paperTitle) return p;
      const allQs    = Object.values(p.sections).flat();
      const newMap   = { ...revMap, [k]: { status } };
      const reviewed = allQs.filter(q => newMap[`${q.paper_title}||${q.question_no}`]).length;
      const approved = allQs.filter(q => newMap[`${q.paper_title}||${q.question_no}`]?.status === 'APPROVED').length;
      const suggested= allQs.filter(q => newMap[`${q.paper_title}||${q.question_no}`]?.status === 'SUGGESTED').length;
      const newStatus= approved===p.progress.total?'APPROVED':suggested>0?'NEEDS_REVISION':reviewed>0?'IN_PROGRESS':'PENDING';
      return { ...p, status: newStatus, progress: { ...p.progress, reviewed, approved, suggested } };
    }));

    try {
      await fetch(`${API}/review`, {
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ paper_title:paperTitle, question_no:questionNo, status, suggestion_text:suggestionText }),
      });
    } catch { /* demo */ }

    push(status==='APPROVED' ? `Q${questionNo} approved` : `Suggestion saved for Q${questionNo}`);
  }, [revMap, push]);

  // ── Bulk approve ───────────────────────────────────────────────────────────
  const handleBulkApprove = useCallback(async (paperTitle) => {
    const paper = papers.find(p => p.paper_title === paperTitle);
    if (!paper) return;
    const allQs = Object.values(paper.sections).flat();
    const newRM = { ...revMap };
    allQs.forEach(q => { newRM[`${q.paper_title}||${q.question_no}`] = { status:'APPROVED', suggestion_text:null }; });
    setRevMap(newRM);
    setPapers(prev => prev.map(p => p.paper_title===paperTitle
      ? { ...p, status:'APPROVED', progress:{...p.progress, reviewed:p.progress.total, approved:p.progress.total, suggested:0} }
      : p
    ));
    try {
      await fetch(`${API}/review/bulk`, {
        method:'POST', headers:{'Content-Type':'application/json'},
        body: JSON.stringify({ paper_title:paperTitle, status:'APPROVED' }),
      });
    } catch { /* demo */ }
    push(`All questions in ${paperTitle} approved`);
  }, [papers, revMap, push]);

  // ── Sync all in-memory reviews → DB ───────────────────────────────────────
  const [syncing,    setSyncing]    = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  const handleSyncToDb = useCallback(async () => {
    const entries = Object.entries(revMap);
    if (entries.length === 0) {
      setSyncResult({ ok: false, message: 'No review decisions found. Approve or suggest on some questions first, then sync.' });
      return;
    }
    setSyncing(true);
    setSyncResult({ ok: null, done: 0, total: entries.length });
    let done = 0, failed = 0;

    for (const [key, rev] of entries) {
      const [paper_title, question_no] = key.split('||');
      try {
        const res = await fetch(`${API}/review`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            paper_title,
            question_no,
            status: rev.status,
            suggestion_text: rev.suggestion_text || null,
          }),
        });
        const data = await res.json();
        if (data.success) done++; else failed++;
      } catch { failed++; }
      setSyncResult({ ok: null, done, total: entries.length });
    }

    setSyncing(false);
    if (failed === 0) {
      setSyncResult({
        ok: true,
        message: `✓ ${done} decision${done !== 1 ? 's' : ''} written to database. approved_papers and unapproved_papers updated automatically.`,
        done, total: entries.length,
      });
      push(`${done} decisions synced to database`);
      setTimeout(() => fetchAll(), 900);
    } else {
      setSyncResult({
        ok: false,
        message: `Partial sync: ${done} saved, ${failed} failed. Is your backend running at ${API}?`,
        done, total: entries.length,
      });
    }
  }, [revMap, push, fetchAll]);

  // ── Drag & drop reorder ────────────────────────────────────────────────────
  const drag = {
    start: (e, title) => { dragRef.current = title; },
    drop:  (e, overTitle) => {
      if (!dragRef.current || dragRef.current===overTitle) return;
      const from = order.indexOf(dragRef.current);
      const to   = order.indexOf(overTitle);
      const next = [...order];
      next.splice(from,1); next.splice(to,0,dragRef.current);
      setOrder(next);
      dragRef.current = null;
    },
  };

  const orderedPapers = order.map(t => papers.find(p => p.paper_title===t)).filter(Boolean);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const totalQ    = papers.reduce((s,p) => s+(p.progress?.total||0), 0);
  const reviewedQ = papers.reduce((s,p) => s+(p.progress?.reviewed||0), 0);
  const approvedP = papers.filter(p => p.status==='APPROVED').length;
  const flaggedP  = papers.filter(p => p.status==='NEEDS_REVISION').length;

  const navigate = useNavigate();
  const { logout } = useAuth();
  
  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <>
      <style>{G}</style>
      <div className="sd">

        {/* NAVBAR */}
        <nav className="sd-nav">
          <div className="sd-nav-brand">Paper<span>Scrutiny</span></div>
          <div className="sd-nav-right">
            <div className="sd-nav-pill">
              <button className={`sd-nav-tab ${tab==='papers'?'active':''}`}   onClick={() => setTab('papers')}>Papers</button>
              <button className={`sd-nav-tab ${tab==='pipeline'?'active':''}`} onClick={() => setTab('pipeline')}>Pipeline</button>
            </div>
            <button 
              onClick={handleLogout}
              style={{
                background: 'rgba(255, 255, 255, 0.1)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                color: 'var(--grey4)',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = 'rgba(192, 57, 43, 0.3)';
                e.target.style.color = '#FF6B6B';
                e.target.style.borderColor = 'rgba(192, 57, 43, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = 'rgba(255, 255, 255, 0.1)';
                e.target.style.color = 'var(--grey4)';
                e.target.style.borderColor = 'rgba(255, 255, 255, 0.2)';
              }}
            >
              ← Logout
            </button>
            <div className="sd-avatar">S</div>
          </div>
        </nav>

        <div className="sd-main">

          {/* HEADER */}
          <div className="sd-header">
            <div className="sd-header-left">
              <h1>Scrutinizer<br/>Dashboard</h1>
              <div className="sd-header-accent" />
              <p>Review · Compare · Approve question papers</p>
            </div>
            <button className="sd-compare-btn" onClick={() => setModal({ initQ:'1' })}>
              ⇄ Open Compare Mode
            </button>
          </div>

          {/* STATS */}
          <div className="sd-stats">
            <div className="sd-stat">
              <div className="sd-stat-label">Total Papers</div>
              <div className="sd-stat-val">{papers.length}</div>
              <div className="sd-stat-sub">In the system</div>
            </div>
            <div className="sd-stat">
              <div className="sd-stat-label">Fully Approved</div>
              <div className="sd-stat-val green">{approvedP}</div>
              <div className="sd-stat-sub">Stored in approved_papers</div>
            </div>
            <div className="sd-stat">
              <div className="sd-stat-label">Needs Revision</div>
              <div className="sd-stat-val red">{flaggedP}</div>
              <div className="sd-stat-sub">Stored in unapproved_papers</div>
            </div>
            <div className="sd-stat">
              <div className="sd-stat-label">Questions Reviewed</div>
              <div className="sd-stat-val yellow">{reviewedQ}</div>
              <div className="sd-stat-sub">of {totalQ} total</div>
            </div>
          </div>

          {/* CONTENT */}
          {loading ? (
            <div className="sd-loader">
              <div className="sd-spin" />
              <span>Loading papers…</span>
            </div>
          ) : tab === 'papers' ? (
            <>
              <div className="sd-section-label">
                Question Papers — click any question number to compare · drag to reorder
              </div>
              <div className="sd-grid">
                {orderedPapers.map(paper => (
                  <PaperCard
                    key={paper.paper_title}
                    paper={paper}
                    revMap={revMap}
                    onCompare={qno => setModal({ initQ: qno })}
                    onBulkApprove={handleBulkApprove}
                    onDrag={drag}
                  />
                ))}
              </div>
            </>
          ) : (
            <>
              {/* ── SYNC PANEL ── */}
              <div className="sd-sync-panel">
                <div className="sd-sync-panel-left">
                  <h3>&#x2B06; Push Reviews to Database</h3>
                  <p>
                    {Object.keys(revMap).length} decision{Object.keys(revMap).length !== 1 ? 's' : ''} ready to sync
                    &nbsp;&middot;&nbsp; Approved papers &rarr; <code>approved_papers</code>
                    &nbsp;&middot;&nbsp; Flagged papers &rarr; <code>unapproved_papers</code>
                  </p>
                  {syncResult && (
                    <>
                      <div className={`sd-sync-result ${syncResult.ok === true ? 'success' : syncResult.ok === false ? 'error' : ''}`}>
                        {syncResult.ok === null
                          ? `Syncing… ${syncResult.done} of ${syncResult.total}`
                          : syncResult.message
                        }
                      </div>
                      {syncResult.ok === null && (
                        <div className="sd-sync-progress">
                          <div className="sd-sync-progress-bar">
                            <div className="sd-sync-progress-fill"
                              style={{ width: `${Math.round((syncResult.done / syncResult.total) * 100)}%` }} />
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
                <button
                  className={`sd-sync-btn ${syncing ? 'syncing' : ''}`}
                  onClick={handleSyncToDb}
                  disabled={syncing}
                >
                  {syncing ? 'Syncing…' : '⬆ Sync to DB'}
                </button>
              </div>

              <div className="sd-section-label">Review Pipeline</div>
              <PipelineView papers={papers} />

              <div className="sd-section-label">Paper Summary</div>
              <div className="sd-table-wrap">
                <table className="sd-table">
                  <thead>
                    <tr>
                      <th>Paper</th>
                      <th>Status</th>
                      <th>Total Q</th>
                      <th>Approved</th>
                      <th>Flagged</th>
                      <th>Remaining</th>
                      <th>Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {papers.map(p => {
                      const prog = p.progress || {};
                      const pct  = prog.total ? Math.round((prog.reviewed/prog.total)*100) : 0;
                      const sm   = statusMeta[p.status] || statusMeta.PENDING;
                      return (
                        <tr key={p.paper_title}>
                          <td>{p.paper_title}</td>
                          <td><span className={`sd-status ${sm.cls}`}>{sm.label}</span></td>
                          <td className="sd-mono">{prog.total}</td>
                          <td className="sd-mono" style={{color:'var(--green)',fontWeight:600}}>{prog.approved}</td>
                          <td className="sd-mono" style={{color:'var(--red)',fontWeight:600}}>{prog.suggested}</td>
                          <td className="sd-mono" style={{color:'var(--grey3)'}}>{prog.total-prog.reviewed}</td>
                          <td>
                            <div style={{display:'flex',alignItems:'center',gap:'0.6rem'}}>
                              <div className="sd-bar" style={{flex:1,height:5}}>
                                <div className="sd-bar-fill" style={{width:`${pct}%`}} />
                              </div>
                              <span className="sd-mono" style={{fontSize:'0.72rem',minWidth:'2.5rem',textAlign:'right'}}>
                                {pct}%
                              </span>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* MODAL */}
        {modal && papers.length > 0 && (
          <CompareModal
            papers={papers}
            revMap={revMap}
            initQ={modal.initQ}
            onClose={() => setModal(null)}
            onSave={handleSave}
          />
        )}

        {/* TOASTS */}
        <div className="sd-toasts">
          {toasts.map(t => (
            <div key={t.id} className={`sd-toast ${t.err?'err':''}`}>
              <span>{t.err ? '⚠' : '✓'}</span> {t.msg}
            </div>
          ))}
        </div>

      </div>
    </>
  );
}

export default ScrutinizerDashboard;