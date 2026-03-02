import React, { useState, useEffect } from 'react';
import DashboardLayout from '../../components/DashboardLayout';
import { notificationService } from '../../services';
import { Bell, Check, Trash2, Mail, MailOpen } from 'lucide-react';

export default function StudentNotifications() {
  const [notifications, setNotifications] = useState([]);
  const [tab, setTab] = useState('all');
  const [loading, setLoading] = useState(true);

  const fetchNotifications = () => {
    setLoading(true);
    notificationService.list({}).then((d) => {
      setNotifications(Array.isArray(d) ? d : []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => { fetchNotifications(); }, []);

  const handleMarkRead = async (id) => {
    try {
      await notificationService.markRead(id);
      setNotifications((prev) => prev.map((n) => n.id === id ? { ...n, read: true } : n));
    } catch {}
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationService.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  };

  const handleDelete = async (id) => {
    try {
      await notificationService.delete(id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {}
  };

  const filtered = notifications.filter((n) => {
    if (tab === 'unread') return !n.read;
    if (tab === 'read') return n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  const formatDate = (d) => {
    try {
      const date = new Date(d);
      const now = new Date();
      const diff = now - date;
      if (diff < 60000) return 'Just now';
      if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
      if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
      return date.toLocaleDateString();
    } catch { return d; }
  };

  const typeIcon = (type) => {
    const colors = { exam: 'text-indigo-500', result: 'text-green-500', assignment: 'text-purple-500', system: 'text-gray-500' };
    return colors[type] || 'text-gray-500';
  };

  return (
    <DashboardLayout role="student">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Notifications</h1>
          {unreadCount > 0 && <p className="text-sm text-gray-500">{unreadCount} unread</p>}
        </div>
        {unreadCount > 0 && (
          <button onClick={handleMarkAllRead} className="flex items-center space-x-1 px-4 py-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg hover:bg-indigo-50">
            <Check className="w-4 h-4" /> <span>Mark all read</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 mb-6">
        {['all', 'unread', 'read'].map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize ${tab === t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 border'}`}>
            {t} {t === 'unread' && unreadCount > 0 && `(${unreadCount})`}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Bell className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="font-medium">No {tab !== 'all' ? tab : ''} notifications</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((n) => (
            <div key={n.id} className={`bg-white rounded-xl shadow-sm border p-4 flex items-start space-x-4 transition ${!n.read ? 'border-l-4 border-l-indigo-500' : ''}`}>
              <div className={`mt-0.5 ${typeIcon(n.type)}`}>
                {n.read ? <MailOpen className="w-5 h-5" /> : <Mail className="w-5 h-5" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`text-sm ${!n.read ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{n.title}</p>
                    <p className="text-sm text-gray-500 mt-0.5">{n.message}</p>
                  </div>
                  <span className="text-xs text-gray-400 whitespace-nowrap">{formatDate(n.createdAt)}</span>
                </div>
                {n.type && <span className="inline-block mt-2 px-2 py-0.5 bg-gray-100 text-gray-500 text-xs rounded">{n.type}</span>}
              </div>
              <div className="flex items-center space-x-1">
                {!n.read && (
                  <button onClick={() => handleMarkRead(n.id)} className="p-1.5 text-gray-400 hover:text-indigo-600 rounded" title="Mark as read">
                    <Check className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => handleDelete(n.id)} className="p-1.5 text-gray-400 hover:text-red-600 rounded" title="Delete">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
