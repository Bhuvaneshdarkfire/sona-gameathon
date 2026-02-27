import React from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: 'success' | 'error' | 'info';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, message, type = 'info' }) => {
  if (!isOpen) return null;

  const iconMap = {
    success: { bg: 'bg-green-50', border: 'border-green-200', icon: '✓', iconBg: 'bg-green-500', text: 'text-green-800' },
    error: { bg: 'bg-red-50', border: 'border-red-200', icon: '✕', iconBg: 'bg-red-500', text: 'text-red-800' },
    info: { bg: 'bg-sky', border: 'border-blue-200', icon: 'i', iconBg: 'bg-royal', text: 'text-royal' },
  };

  const style = iconMap[type];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4"
      onClick={onClose}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative w-full max-w-md bg-white rounded-card shadow-card-hover p-8 text-center"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Icon */}
        <div className={`w-14 h-14 mx-auto mb-4 rounded-full ${style.iconBg} flex items-center justify-center`}>
          <span className="text-white text-2xl font-bold">{style.icon}</span>
        </div>

        {/* Content */}
        <h3 className={`font-heading font-bold text-xl mb-2 ${style.text}`}>{title}</h3>
        <p className="text-gray-600 text-sm leading-relaxed mb-6">{message}</p>

        {/* Action */}
        <button
          onClick={onClose}
          className="btn-primary !py-2.5 !px-8"
        >
          Got it
        </button>
      </div>
    </div>
  );
};

export default Modal;