export function playNotificationSound(): void {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(698.46, now); // F5
    gain1.gain.setValueAtTime(0.12, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(880, now + 0.1); // A5
    gain2.gain.setValueAtTime(0.15, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.38);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 0.38);
  } catch {
    // Autoplay restrictions before gesture
  }
}

export function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (isNaN(diffSec) || diffSec < 0) return 'Just now';
    if (diffSec < 45) return 'Just now';
    if (diffSec < 90) return '1m ago';
    if (diffSec < 3600) return `${Math.floor(diffSec / 60)}m ago`;
    if (diffSec < 86400) return `${Math.floor(diffSec / 3600)}h ago`;
    if (diffSec < 172800) return 'Yesterday';
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return dateString;
  }
}

export interface NotificationMeta {
  category: 'all' | 'booking' | 'payment' | 'review' | 'system';
  badgeLabel: string;
  badgeClass: string;
  icon: string;
}

export function getNotificationMeta(type: string, message: string): NotificationMeta {
  const upperType = (type || '').toUpperCase();
  const lowerMsg = (message || '').toLowerCase();

  if (upperType.includes('PAYMENT') || lowerMsg.includes('payment') || lowerMsg.includes('paid')) {
    return {
      category: 'payment',
      badgeLabel: 'Payment',
      badgeClass: 'badge-payment',
      icon: '💰',
    };
  }
  if (upperType.includes('REVIEW') || lowerMsg.includes('review') || lowerMsg.includes('rating') || lowerMsg.includes('star')) {
    return {
      category: 'review',
      badgeLabel: 'Review',
      badgeClass: 'badge-review',
      icon: '⭐',
    };
  }
  if (upperType.includes('VERIFICATION') || lowerMsg.includes('verification') || lowerMsg.includes('verified') || lowerMsg.includes('suspended')) {
    return {
      category: 'system',
      badgeLabel: 'Security',
      badgeClass: 'badge-verification',
      icon: '🛡️',
    };
  }
  if (upperType.includes('CANCEL') || lowerMsg.includes('cancel')) {
    return {
      category: 'booking',
      badgeLabel: 'Cancelled',
      badgeClass: 'badge-cancelled',
      icon: '🚫',
    };
  }
  if (upperType.includes('ACCEPT') || lowerMsg.includes('accepted')) {
    return {
      category: 'booking',
      badgeLabel: 'Accepted',
      badgeClass: 'badge-accepted',
      icon: '✅',
    };
  }
  if (upperType.includes('REJECT') || lowerMsg.includes('rejected')) {
    return {
      category: 'booking',
      badgeLabel: 'Declined',
      badgeClass: 'badge-declined',
      icon: '❌',
    };
  }
  if (upperType.includes('COMPLETE') || lowerMsg.includes('completed')) {
    return {
      category: 'booking',
      badgeLabel: 'Completed',
      badgeClass: 'badge-completed',
      icon: '🎉',
    };
  }
  if (upperType.includes('BOOKING') || lowerMsg.includes('booking')) {
    return {
      category: 'booking',
      badgeLabel: 'Booking',
      badgeClass: 'badge-booking',
      icon: '🚜',
    };
  }

  return {
    category: 'system',
    badgeLabel: 'Notice',
    badgeClass: 'badge-system',
    icon: '📢',
  };
}
