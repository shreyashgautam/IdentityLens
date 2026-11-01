import React from 'react';

interface ToastProps {
  message: string | null;
  visible: boolean;
}

export const Toast: React.FC<ToastProps> = ({ message, visible }) => {
  if (!visible || !message) return null;

  return (
    <div
      className="toast-notification-banner"
      role="status"
      aria-live="polite"
    >
      <span className="material-symbols-outlined text-[20px] text-white">task_alt</span>
      <span className="toast-text">{message}</span>
    </div>
  );
};

