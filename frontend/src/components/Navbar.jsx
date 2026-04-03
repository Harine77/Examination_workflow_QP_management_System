import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import api from '../services/api';
import SSNBrand from './SSNBrand';

const CATEGORY_STYLES = {
  received: 'bg-blue-100 text-blue-700',
  activity: 'bg-emerald-100 text-emerald-700',
  update: 'bg-indigo-100 text-indigo-700',
};

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const storageKey = user ? `qp_notifications_last_seen_${user.role}_${user.id || user.email}` : null;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const getRoleBadgeColor = (role) => {
    switch (role) {
      case 'faculty':
        return 'bg-sky-100 text-sky-800 border-sky-200';
      case 'scrutinizer':
      case 'scrutinizer_1':
      case 'scrutinizer_2':
        return 'bg-emerald-100 text-emerald-800 border-emerald-200';
      case 'panel':
      case 'panel_member':
        return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'hod':
        return 'bg-rose-100 text-rose-800 border-rose-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    let active = true;

    const fetchNotifications = async () => {
      try {
        const response = await api.get('/questions/notifications');
        if (active && response.data.success) {
          setNotifications(response.data.notifications || []);
        }
      } catch (error) {
        console.error('Failed to fetch notifications:', error);
      }
    };

    fetchNotifications();
    const interval = window.setInterval(fetchNotifications, 30000);

    return () => {
      active = false;
      window.clearInterval(interval);
    };
  }, [user]);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const lastSeen = useMemo(() => {
    if (!storageKey) {
      return 0;
    }

    const storedValue = localStorage.getItem(storageKey);
    return storedValue ? Date.parse(storedValue) || 0 : 0;
  }, [storageKey, isOpen, notifications.length]);

  const unreadCount = notifications.filter((item) => Date.parse(item.updatedAt) > lastSeen).length;

  const markAsSeen = () => {
    if (!storageKey || notifications.length === 0) {
      return;
    }

    const latestTimestamp = notifications
      .map((item) => item.updatedAt)
      .filter(Boolean)
      .sort()
      .at(-1);

    if (latestTimestamp) {
      localStorage.setItem(storageKey, latestTimestamp);
    }
  };

  const toggleNotifications = () => {
    const nextOpen = !isOpen;
    setIsOpen(nextOpen);
    if (nextOpen) {
      markAsSeen();
    }
  };

  const handleNotificationClick = (paperId) => {
    markAsSeen();
    setIsOpen(false);
    navigate(`/papers/${paperId}`);
  };

  return (
    <nav className="sticky top-0 z-40 border-b border-blue-100 bg-white/95 backdrop-blur shadow-sm">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div className="flex min-h-[76px] items-center justify-between gap-4">
          <Link to="/" className="min-w-0">
            <SSNBrand light={false} />
          </Link>

          {user && (
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="hidden md:flex items-center gap-5 text-sm font-medium text-slate-600">
                <Link to="/dashboard" className="hover:text-blue-800 transition-colors">Dashboard</Link>
                <Link to="/papers" className="hover:text-blue-800 transition-colors">Question Papers</Link>
              </div>

              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={toggleNotifications}
                  className="relative h-10 w-10 rounded-full border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-200 transition-colors flex items-center justify-center text-slate-700"
                  aria-label="Notifications"
                >
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5" aria-hidden="true">
                    <path d="M15 18H5a1 1 0 0 1-.8-1.6l1.3-1.7V10a6.5 6.5 0 1 1 13 0v4.7l1.3 1.7A1 1 0 0 1 19 18h-4" />
                    <path d="M9.5 18a2.5 2.5 0 0 0 5 0" />
                  </svg>
                  {unreadCount > 0 && <span className="absolute top-1 right-1 h-3 w-3 rounded-full bg-rose-600 ring-2 ring-white" />}
                </button>

                {isOpen && (
                  <div className="absolute right-0 mt-3 w-80 max-w-[calc(100vw-2rem)] bg-white text-gray-800 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
                      <div>
                        <div className="font-semibold text-slate-900">Notifications</div>
                        <div className="text-xs text-slate-500">Workflow updates for your role</div>
                      </div>
                      {unreadCount > 0 && <span className="text-xs font-semibold text-rose-600">{unreadCount} new</span>}
                    </div>

                    <div className="max-h-96 overflow-y-auto">
                      {notifications.length === 0 ? (
                        <div className="px-4 py-6 text-sm text-slate-500">No notifications right now.</div>
                      ) : (
                        notifications.slice(0, 8).map((item) => (
                          <button
                            key={`${item.paperId}-${item.updatedAt}`}
                            onClick={() => handleNotificationClick(item.paperId)}
                            className="w-full px-4 py-3 text-left hover:bg-blue-50 transition-colors border-b border-slate-100 last:border-b-0"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="font-semibold text-sm text-slate-800">{item.title}</div>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${CATEGORY_STYLES[item.category] || 'bg-slate-100 text-slate-600'}`}>
                                    {item.category || 'update'}
                                  </span>
                                </div>
                                <div className="text-xs text-slate-600 mt-1 leading-5">{item.message}</div>
                              </div>
                              <div className="text-[11px] text-slate-400 whitespace-nowrap">{new Date(item.updatedAt).toLocaleDateString()}</div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="hidden lg:flex items-center gap-3">
                <div className="text-right">
                  <div className="font-semibold text-slate-900">{user.username}</div>
                  <div className="text-xs text-slate-500">{user.email}</div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-bold border ${getRoleBadgeColor(user.role)}`}>
                  {user.role.replace('_', ' ').toUpperCase()}
                </span>
              </div>

              <button
                onClick={handleLogout}
                className="border border-slate-200 hover:border-rose-200 bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 px-4 py-2 rounded-xl font-semibold transition-colors"
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
