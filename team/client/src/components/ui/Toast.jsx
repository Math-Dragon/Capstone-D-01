import { useState, createContext, useContext } from 'react';

const ToastContext = createContext();

let toastCounter = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'info', duration = 3000) => {
    const id = ++toastCounter;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} removeToast={removeToast} />
    </ToastContext.Provider>
  );
}

function ToastContainer({ toasts, removeToast }) {
  const types = {
    success: 'bg-green-600',
    error: 'bg-red-600',
    warning: 'bg-yellow-600',
    info: 'bg-blue-600',
  };

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-50 w-[calc(100%-2rem)] max-w-sm space-y-2 sm:w-auto"
      aria-live="polite"
      aria-atomic="true"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role="status"
          className={`${types[toast.type]} text-white px-4 py-3 rounded-lg shadow-lg flex items-center justify-between gap-3 min-w-0 sm:min-w-[300px] transition-all duration-200`}
        >
          <span className="text-sm font-medium">{toast.message}</span>
          <button
            type="button"
            onClick={() => removeToast(toast.id)}
            className="shrink-0 rounded p-1 text-white hover:text-gray-200 focus:outline-none focus:ring-2 focus:ring-white/80"
            aria-label={`Tutup notifikasi: ${toast.message}`}
          >
            <span aria-hidden="true">x</span>
          </button>
        </div>
      ))}
    </div>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
}
