import React, { useState, useEffect, useRef } from 'react';
import { Notification, notificationApi } from '../services/api';
import {
  formatRelativeTime,
  getNotificationMeta,
  playNotificationSound,
} from '../utils/notificationAudio';

export interface NotificationCenterProps {
  notifications: Notification[];
  onNotificationsChange: (notifications: Notification[]) => void;
  onRefresh: () => Promise<void>;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  notifications,
  onNotificationsChange,
  onRefresh,
  soundEnabled,
  onToggleSound,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unread' | 'booking' | 'payment' | 'other'>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter((n) => !n.read).length;

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

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
      console.error('Failed to mark all read', e);
    }
  };

  const handleMarkSingleRead = async (id: number) => {
    try {
      await notificationApi.markRead(id);
      onNotificationsChange(
        notifications.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (e) {
      console.error('Failed to mark read', e);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await notificationApi.delete(id);
      onNotificationsChange(notifications.filter((n) => n.id !== id));
    } catch (e) {
      console.error('Failed to delete notification', e);
    }
  };

  const handleClearRead = async () => {
    try {
      await notificationApi.clearRead();
      onNotificationsChange(notifications.filter((n) => !n.read));
    } catch (e) {
      console.error('Failed to clear read notifications', e);
    }
  };

  // Filtered notifications
  const filteredNotifications = notifications.filter((n) => {
    const meta = getNotificationMeta(n.type, n.message);
    if (filter === 'unread' && n.read) return false;
    if (filter === 'booking' && meta.category !== 'booking') return false;
    if (filter === 'payment' && meta.category !== 'payment') return false;
    if (filter === 'other' && (meta.category === 'booking' || meta.category === 'payment')) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        n.message.toLowerCase().includes(q) ||
        n.type.toLowerCase().includes(q) ||
        meta.badgeLabel.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="notification-menu" ref={menuRef}>
      <button
        type="button"
        className={`notification-bell ${unreadCount > 0 ? 'has-unread' : ''}`}
        aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
        aria-expanded={isOpen}
        onClick={() => setIsOpen((prev) => !prev)}
        title={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
      >
        <span className="notification-bell-icon" aria-hidden="true">
          🔔
        </span>
        {unreadCount > 0 && (
          <span className="notification-count" aria-live="polite">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="notification-dropdown notification-dropdown-improved"
          role="dialog"
          aria-label="Notifications Panel"
        >
          {/* Header */}
          <div className="notification-header-improved">
            <div className="notification-header-title-box">
              <div className="notification-title-row">
                <span className="notification-title-icon">🔔</span>
                <span className="notification-title-text">Notifications</span>
                {unreadCount > 0 && (
                  <span className="notification-pill-unread">{unreadCount} new</span>
                )}
              </div>
              <span className="notification-header-subtitle">
                {unreadCount > 0 ? `${unreadCount} unread alerts` : 'All caught up!'}
              </span>
            </div>

            <div className="notification-header-tools">
              <button
                type="button"
                className={`notification-tool-btn ${soundEnabled ? 'active' : ''}`}
                onClick={onToggleSound}
                title={soundEnabled ? 'Mute alert sounds' : 'Enable alert sounds'}
                aria-label={soundEnabled ? 'Mute sounds' : 'Enable sounds'}
              >
                {soundEnabled ? '🔊' : '🔇'}
              </button>
              <button
                type="button"
                className={`notification-tool-btn ${isRefreshing ? 'spinning' : ''}`}
                onClick={handleRefresh}
                title="Refresh notifications"
                aria-label="Refresh"
              >
                🔄
              </button>
              <button
                type="button"
                className="notification-tool-btn"
                onClick={() => setIsOpen(false)}
                title="Close"
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="notification-filter-tabs">
            <button
              type="button"
              className={`notification-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All <span className="tab-count">{notifications.length}</span>
            </button>
            <button
              type="button"
              className={`notification-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread <span className="tab-count">{unreadCount}</span>
            </button>
            <button
              type="button"
              className={`notification-tab ${filter === 'booking' ? 'active' : ''}`}
              onClick={() => setFilter('booking')}
            >
              Bookings
            </button>
            <button
              type="button"
              className={`notification-tab ${filter === 'payment' ? 'active' : ''}`}
              onClick={() => setFilter('payment')}
            >
              Payments
            </button>
            <button
              type="button"
              className={`notification-tab ${filter === 'other' ? 'active' : ''}`}
              onClick={() => setFilter('other')}
            >
              System
            </button>
          </div>

          {/* Search bar when there are notifications */}
          {notifications.length > 3 && (
            <div className="notification-search-box">
              <input
                type="text"
                placeholder="Search alerts..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="notification-search-input"
              />
              {searchQuery && (
                <button
                  type="button"
                  className="notification-search-clear"
                  onClick={() => setSearchQuery('')}
                >
                  ✕
                </button>
              )}
            </div>
          )}

          {/* Notification List */}
          <div className="notification-list-improved">
            {filteredNotifications.length === 0 ? (
              <div className="notification-empty-box">
                <div className="notification-empty-icon">🌱</div>
                <p className="notification-empty-title">
                  {searchQuery ? 'No matching alerts' : filter === 'unread' ? 'No unread alerts' : 'No notifications'}
                </p>
                <p className="notification-empty-desc">
                  {searchQuery
                    ? 'Try searching with a different keyword.'
                    : filter === 'unread'
                    ? 'You have caught up with everything!'
                    : 'Activity and booking updates will appear here in real time.'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => {
                const meta = getNotificationMeta(notification.type, notification.message);
                return (
                  <div
                    key={notification.id}
                    className={`notification-card ${notification.read ? 'is-read' : 'is-unread'}`}
                    onClick={() => {
                      if (!notification.read) handleMarkSingleRead(notification.id);
                    }}
                  >
                    <div className="notification-card-icon-col">
                      <div className={`notification-avatar-icon ${meta.badgeClass}`}>
                        {meta.icon}
                      </div>
                    </div>

                    <div className="notification-card-content">
                      <div className="notification-card-top-row">
                        <span className={`notification-category-badge ${meta.badgeClass}`}>
                          {meta.badgeLabel}
                        </span>
                        <span
                          className="notification-time-label"
                          title={new Date(notification.createdAt).toLocaleString()}
                        >
                          {formatRelativeTime(notification.createdAt)}
                        </span>
                      </div>

                      <p className="notification-message-text">{notification.message}</p>

                      <div className="notification-card-bottom-row">
                        {!notification.read && (
                          <span className="notification-unread-indicator">
                            <span className="unread-dot" /> New
                          </span>
                        )}

                        <div
                          className="notification-card-actions"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {!notification.read ? (
                            <button
                              type="button"
                              className="notif-action-btn read-btn"
                              title="Mark as read"
                              onClick={() => handleMarkSingleRead(notification.id)}
                            >
                              ✓ Mark read
                            </button>
                          ) : (
                            <span className="notif-read-status">✓ Read</span>
                          )}

                          <button
                            type="button"
                            className="notif-action-btn delete-btn"
                            title="Dismiss notification"
                            onClick={() => handleDelete(notification.id)}
                          >
                            🗑️
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Footer */}
          <div className="notification-footer-improved">
            <div className="notification-footer-left">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="notif-footer-link notif-mark-all"
                  onClick={handleMarkAllRead}
                >
                  ✓ Mark all read
                </button>
              )}
              {notifications.some((n) => n.read) && (
                <button
                  type="button"
                  className="notif-footer-link notif-clear-read"
                  onClick={handleClearRead}
                >
                  Clear read
                </button>
              )}
            </div>

            <button
              type="button"
              className="notif-footer-link notif-close-btn"
              onClick={() => setIsOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export interface NotificationToastItem {
  id: number;
  type: string;
  message: string;
  createdAt: string;
}

export interface NotificationToastContainerProps {
  toasts: NotificationToastItem[];
  onDismiss: (id: number) => void;
  onOpenNotifications: () => void;
}

export const NotificationToastContainer: React.FC<NotificationToastContainerProps> = ({
  toasts,
  onDismiss,
  onOpenNotifications,
}) => {
  if (toasts.length === 0) return null;

  return (
    <aside
      className="notification-toast-container"
      aria-label="New Notifications"
      role="region"
    >
      {toasts.map((toast) => {
        const meta = getNotificationMeta(toast.type, toast.message);
        return (
          <div
            key={toast.id}
            className="notification-toast-item"
            role="status"
            onClick={onOpenNotifications}
          >
            <div className={`toast-icon-box ${meta.badgeClass}`}>{meta.icon}</div>
            <div className="toast-text-box">
              <div className="toast-header-row">
                <span className="toast-title">{meta.badgeLabel}</span>
                <span className="toast-time">Just now</span>
              </div>
              <p className="toast-message">{toast.message}</p>
            </div>
            <button
              type="button"
              className="toast-close-btn"
              onClick={(e) => {
                e.stopPropagation();
                onDismiss(toast.id);
              }}
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
        );
      })}
    </aside>
  );
};
