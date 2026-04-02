import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import api from '../services/api';

const STATUS_LABEL = {
  with_panel:   { text: 'With Panel',   bg: 'bg-cyan-100',   dot: 'bg-cyan-500',   txt: 'text-cyan-700' },
  with_hod:     { text: 'With HOD',     bg: 'bg-purple-100', dot: 'bg-purple-500', txt: 'text-purple-700' },
  hod_approved: { text: 'HOD Approved', bg: 'bg-green-100',  dot: 'bg-green-500',  txt: 'text-green-700' },
};

const typeColor = (type) => ({
  success: 'border-l-green-500',
  warning: 'border-l-yellow-500',
  info:    'border-l-blue-400',
}[type] || 'border-l-gray-300');

// Each notification is uniquely identified by paperId + status
// so if a paper moves from with_hod → hod_approved it becomes a NEW notification
function notifKey(n) {
  return `${n.paperId}::${n.status}`;
}

function getReadKeys(userId) {
  try {
    return new Set(JSON.parse(localStorage.getItem(`notif_read_${userId}`) || '[]'));
  } catch { return new Set(); }
}

function saveReadKeys(userId, keys) {
  localStorage.setItem(`notif_read_${userId}`, JSON.stringify([...keys]));
}

export default function NotificationBell() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [readKeys, setReadKeys] = useState(() => getReadKeys(user?.id));
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(null);
  const ref = useRef(null);
  const navigate = useNavigate();

  const fetchNotifications = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/notifications');
      if (res.data.success) setNotifications(res.data.notifications || []);
    } catch (_) {}
    finally { setLoading(false); }
  }, []);

  // Poll every 30s
  useEffect(() => {
    fetchNotifications();
    const t = setInterval(fetchNotifications, 30000);
    return () => clearInterval(t);
  }, [fetchNotifications]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // When bell is opened → mark all current notifications as read
  const handleOpen = () => {
    const next = !open;
    setOpen(next);
    if (next) {
      fetchNotifications();
      // Mark all as read
      const newKeys = new Set(readKeys);
      notifications.forEach(n => newKeys.add(notifKey(n)));
      setReadKeys(newKeys);
      saveReadKeys(user?.id, newKeys);
      setExpanded(null);
    }
  };

  const unreadCount = notifications.filter(n => !readKeys.has(notifKey(n))).length;

  return (
    <div className="relative" ref={ref}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        className="relative p-2 rounded-full hover:bg-white/20 transition-colors"
        title="Notifications"
      >
        <span className="text-xl">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 mt-2 w-96 bg-white rounded-2xl shadow-2xl border border-gray-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 bg-gray-900 text-white">
            <div className="flex items-center gap-2">
              <span>🔔</span>
              <span className="font-bold text-sm">Paper Status Updates</span>
            </div>
            <div className="flex items-center gap-2">
              {loading && <span className="text-xs text-gray-400 animate-pulse">Refreshing…</span>}
              <span className="px-2 py-0.5 rounded-full bg-indigo-600 text-xs font-bold">
                {notifications.length}
              </span>
            </div>
          </div>

          {/* List */}
          <div className="max-h-[420px] overflow-y-auto divide-y divide-gray-100">
            {notifications.length === 0 ? (
              <div className="py-10 text-center text-gray-400">
                <div className="text-3xl mb-2">📭</div>
                <p className="text-sm">No updates yet</p>
              </div>
            ) : (
              notifications.map(n => {
                const sl = STATUS_LABEL[n.status] || { text: n.status, bg: 'bg-gray-100', dot: 'bg-gray-400', txt: 'text-gray-600' };
                const isOpen = expanded === notifKey(n);
                const isUnread = !readKeys.has(notifKey(n));

                return (
                  <div key={notifKey(n)} className={`border-l-4 ${typeColor(n.type)} ${isUnread ? 'bg-indigo-50' : 'bg-white'}`}>
                    <button
                      onClick={() => setExpanded(isOpen ? null : notifKey(n))}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex items-start gap-2">
                          {/* Unread dot */}
                          {isUnread && (
                            <span className="mt-1.5 w-2 h-2 flex-shrink-0 rounded-full bg-indigo-500" />
                          )}
                          <div className="min-w-0">
                            <p className={`text-sm truncate ${isUnread ? 'font-bold text-gray-900' : 'font-medium text-gray-700'}`}>
                              {n.label}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{n.courseName}</p>
                            <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${sl.bg} ${sl.txt}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${sl.dot}`} />
                            {sl.text}
                          </span>
                          <span className="text-xs text-gray-400">
                            {new Date(n.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}
                          </span>
                          <span className="text-gray-400 text-xs">{isOpen ? '▲' : '▼'}</span>
                        </div>
                      </div>
                    </button>

                    {/* Expanded details */}
                    {isOpen && (
                      <div className="px-4 pb-3 bg-gray-50 border-t border-gray-100">
                        {n.hodComments && (
                          <div className="mt-2 p-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-700">
                            <span className="font-semibold text-purple-700">HOD Comments: </span>{n.hodComments}
                          </div>
                        )}
                        {n.scrutinizer2Comments && (
                          <div className="mt-2 p-2 rounded-lg bg-white border border-gray-200 text-xs text-gray-700">
                            <span className="font-semibold text-blue-700">S2 Comments: </span>{n.scrutinizer2Comments}
                          </div>
                        )}
                        <button
                          onClick={() => { navigate(`/papers/${n.paperId}`); setOpen(false); }}
                          className="mt-2 w-full py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition-colors"
                        >
                          View Paper →
                        </button>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <button
              onClick={fetchNotifications}
              className="text-xs text-indigo-600 hover:underline font-semibold"
            >
              Refresh
            </button>
            {notifications.length > 0 && (
              <button
                onClick={() => {
                  const newKeys = new Set(notifications.map(notifKey));
                  setReadKeys(newKeys);
                  saveReadKeys(user?.id, newKeys);
                }}
                className="text-xs text-gray-400 hover:text-gray-600 hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
