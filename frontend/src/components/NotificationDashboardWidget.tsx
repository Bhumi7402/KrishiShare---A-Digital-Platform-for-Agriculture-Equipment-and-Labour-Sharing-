import React, { useState } from 'react';
import { Notification, notificationApi } from '../services/api';
import { formatRelativeTime, getNotificationMeta } from '../utils/notificationAudio';

export interface NotificationDashboardWidgetProps {
  notifications: Notification[];
  onNotificationsChange: (notifications: Notification[]) => void;
  onRefresh: () => Promise<void>;
}

export const NotificationDashboardWidget: React.FC<NotificationDashboardWidgetProps> = ({
  notifications,
  onNotificationsChange,
  onRefresh,
}) => {
  const [filter, setFilter] = useState<'all' | 'unread' | 'booking' | 'payment'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setTimeout(() => setIsRefreshing(false), 400);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationApi.markAllRead();
      onNotificationsChange(notifications.map((n) => ({ ...n, read: true })));
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkSingleRead = async (id: number) => {
    try {
      await notificationApi.markRead(id);
      onNotificationsChange(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationApi.delete(id);
      onNotificationsChange(notifications.filter((n) => n.id !== id));
    } catch (e) {
      console.error(e);
    }
  };

  const filtered = notifications.filter((n) => {
    const meta = getNotificationMeta(n.type, n.message);
    if (filter === 'unread' && n.read) return false;
    if (filter === 'booking' && meta.category !== 'booking') return false;
    if (filter === 'payment' && meta.category !== 'payment') return false;
    return true;
  });

  return (
    <section className="insight card notification-widget-card" aria-live="polite">
      <div className="admin-panel-header notif-widget-header">
        <div className="notif-widget-title-group">
          <div className="notif-widget-icon-halo">🔔</div>
          <div>
            <h2 className="notif-widget-heading">Activity & Notification Feed</h2>
            <p className="notif-widget-subheading">
              {unreadCount > 0 ? (
                <span className="notif-unread-text">{unreadCount} new actionable updates</span>
              ) : (
                'All activity is caught up'
              )}
            </p>
          </div>
        </div>

        <div className="notif-widget-header-actions">
          <button
            type="button"
            className={`notif-tool-btn ${isRefreshing ? 'spinning' : ''}`}
            onClick={handleRefresh}
            title="Refresh feed"
          >
            🔄 Refresh
          </button>
          {unreadCount > 0 && (
            <button
              type="button"
              className="secondary notif-mark-all-btn"
              onClick={handleMarkAllRead}
            >
              ✓ Mark all read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="notif-widget-tabs">
        <button
          type="button"
          className={`notif-widget-tab ${filter === 'all' ? 'active' : ''}`}
          onClick={() => setFilter('all')}
        >
          All Activity ({notifications.length})
        </button>
        <button
          type="button"
          className={`notif-widget-tab ${filter === 'unread' ? 'active' : ''}`}
          onClick={() => setFilter('unread')}
        >
          Unread ({unreadCount})
        </button>
        <button
          type="button"
          className={`notif-widget-tab ${filter === 'booking' ? 'active' : ''}`}
          onClick={() => setFilter('booking')}
        >
          Bookings
        </button>
        <button
          type="button"
          className={`notif-widget-tab ${filter === 'payment' ? 'active' : ''}`}
          onClick={() => setFilter('payment')}
        >
          Payments
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="notif-widget-empty">
          <span className="notif-empty-emoji">✨</span>
          <p className="notif-empty-text">
            {filter === 'unread' ? 'No unread notifications' : 'No notifications in this category'}
          </p>
        </div>
      ) : (
        <div className="notif-widget-list">
          {filtered.slice(0, 10).map((notification) => {
            const meta = getNotificationMeta(notification.type, notification.message);
            return (
              <div
                key={notification.id}
                className={`notif-widget-item ${notification.read ? 'is-read' : 'is-unread'}`}
                onClick={() => {
                  if (!notification.read) handleMarkSingleRead(notification.id);
                }}
              >
                <div className={`notif-widget-item-icon ${meta.badgeClass}`}>{meta.icon}</div>

                <div className="notif-widget-item-body">
                  <div className="notif-widget-item-top">
                    <span className={`notification-category-badge ${meta.badgeClass}`}>
                      {meta.badgeLabel}
                    </span>
                    <span
                      className="notif-widget-item-time"
                      title={new Date(notification.createdAt).toLocaleString()}
                    >
                      {formatRelativeTime(notification.createdAt)}
                    </span>
                  </div>
                  <p className="notif-widget-item-msg">{notification.message}</p>
                </div>

                <div className="notif-widget-item-actions" onClick={(e) => e.stopPropagation()}>
                  {!notification.read && (
                    <button
                      type="button"
                      className="notif-btn-pill notif-btn-read"
                      onClick={() => handleMarkSingleRead(notification.id)}
                      title="Mark as read"
                    >
                      ✓ Read
                    </button>
                  )}
                  <button
                    type="button"
                    className="notif-btn-pill notif-btn-delete"
                    onClick={() => handleDelete(notification.id)}
                    title="Dismiss"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
