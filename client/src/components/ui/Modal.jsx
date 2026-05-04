import { useEffect, useRef } from 'react';
import useFocusTrap from '../../hooks/useFocusTrap';
import { lockScroll, unlockScroll } from '../../utils/scrollLock';

export function Modal({ isOpen, onClose, title, description, children, size = 'md' }) {
  const modalRef = useRef(null);
  useFocusTrap(modalRef, isOpen);

  useEffect(() => {
    if (isOpen) {
      lockScroll();
      return () => unlockScroll();
    }
  }, [isOpen]);

  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      window.addEventListener('keydown', handleEscape);
    }
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center p-4">
        <div
          className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
        <div
          ref={modalRef}
          className={`relative bg-white rounded-lg shadow-xl w-full ${sizes[size]}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={title ? 'modal-title' : undefined}
          aria-describedby={description ? 'modal-description' : undefined}
        >
          {title && (
            <div className="flex items-center justify-between p-4 border-b">
              <h3 id="modal-title" className="text-lg font-semibold">{title}</h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
                aria-label="Tutup"
              >
                ✕
              </button>
            </div>
          )}
          {description && (
            <p id="modal-description" className="sr-only">{description}</p>
          )}
          <div className="p-4">{children}</div>
        </div>
      </div>
    </div>
  );
}
