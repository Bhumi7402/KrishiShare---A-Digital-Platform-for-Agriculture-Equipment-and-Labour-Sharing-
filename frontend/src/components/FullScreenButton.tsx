import React, { useState, useEffect } from 'react';

export interface FullScreenButtonProps {
  className?: string;
  showLabel?: boolean;
}

export const FullScreenButton: React.FC<FullScreenButtonProps> = ({
  className = '',
  showLabel = false,
}) => {
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(Boolean(document.fullscreenElement));
    }

    document.addEventListener('fullscreenchange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        } else if ((document.documentElement as unknown as { webkitRequestFullscreen?: () => Promise<void> }).webkitRequestFullscreen) {
          await (document.documentElement as unknown as { webkitRequestFullscreen: () => Promise<void> }).webkitRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as unknown as { webkitExitFullscreen?: () => Promise<void> }).webkitExitFullscreen) {
          await (document as unknown as { webkitExitFullscreen: () => Promise<void> }).webkitExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Could not toggle fullscreen:', err);
    }
  };

  return (
    <button
      type="button"
      className={`fullscreen-toggle-btn ${isFullscreen ? 'is-fullscreen' : ''} ${className}`}
      onClick={toggleFullscreen}
      title={isFullscreen ? 'Exit Full Screen (Esc)' : 'Toggle Full Screen'}
      aria-label={isFullscreen ? 'Exit Full Screen' : 'Toggle Full Screen'}
    >
      {isFullscreen ? (
        <svg
          className="fullscreen-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Inward compress arrows */}
          <path d="M4 14h6v6" />
          <path d="M20 10h-6V4" />
          <path d="M14 10l7-7" />
          <path d="M3 21l7-7" />
        </svg>
      ) : (
        <svg
          className="fullscreen-icon"
          viewBox="0 0 24 24"
          width="18"
          height="18"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          {/* Outward expand arrows */}
          <path d="M15 3h6v6" />
          <path d="M9 21H3v-6" />
          <path d="M21 3l-7 7" />
          <path d="M3 21l7-7" />
        </svg>
      )}
      {showLabel && (
        <span className="fullscreen-btn-label">
          {isFullscreen ? 'Exit Full Screen' : 'Full Screen'}
        </span>
      )}
    </button>
  );
};
