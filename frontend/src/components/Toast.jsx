import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import { createContext, useContext, useState, useCallback } from 'react';

// Toast Context
const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return context;
};

// Toast Provider Component
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, []);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const toast = {
    success: (message, duration) => addToast(message, 'success', duration),
    error: (message, duration) => addToast(message, 'error', duration),
    warning: (message, duration) => addToast(message, 'warning', duration),
    info: (message, duration) => addToast(message, 'info', duration),
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

// Toast Container Component
function ToastContainer({ toasts, onRemove }) {
  return (
    <div className="fixed top-20 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map(toast => (
        <Toast key={toast.id} toast={toast} onRemove={onRemove} />
      ))}
    </div>
  );
}

// Individual Toast Component
function Toast({ toast, onRemove }) {
  const icons = {
    success: <CheckCircle className="w-5 h-5 text-green-500" />,
    error: <XCircle className="w-5 h-5 text-red-500" />,
    warning: <AlertCircle className="w-5 h-5 text-yellow-500" />,
    info: <Info className="w-5 h-5 text-blue-500" />
  };

  const colors = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div className={`pointer-events-auto flex items-center gap-3 min-w-[320px] max-w-md px-4 py-3 rounded-lg border shadow-lg animate-slide-in ${colors[toast.type]}`}>
      {icons[toast.type]}
      <p className="flex-1 text-sm font-medium">{toast.message}</p>
      <button
        onClick={() => onRemove(toast.id)}
        className="hover:opacity-70 transition"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

// Confirmation Modal Context
const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) {
    throw new Error('useConfirm must be used within ConfirmProvider');
  }
  return context;
};

// Confirmation Modal Provider
export function ConfirmProvider({ children }) {
  const [confirmState, setConfirmState] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger',
    onConfirm: () => {},
    onCancel: () => {}
  });

  const confirm = useCallback((options) => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        title: options.title || 'Confirm Action',
        message: options.message || 'Are you sure?',
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        type: options.type || 'danger',
        onConfirm: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setConfirmState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {confirmState.isOpen && (
        <ConfirmModal {...confirmState} />
      )}
    </ConfirmContext.Provider>
  );
}

// Confirmation Modal Component
function ConfirmModal({ title, message, confirmText, cancelText, type, onConfirm, onCancel }) {
  const typeStyles = {
    danger: {
      icon: <AlertCircle className="w-12 h-12 text-red-500" />,
      confirmBtn: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      iconBg: 'bg-red-100'
    },
    warning: {
      icon: <AlertCircle className="w-12 h-12 text-yellow-500" />,
      confirmBtn: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      iconBg: 'bg-yellow-100'
    },
    info: {
      icon: <Info className="w-12 h-12 text-blue-500" />,
      confirmBtn: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      iconBg: 'bg-blue-100'
    }
  };

  const style = typeStyles[type] || typeStyles.danger;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-scale-in" onClick={(e) => e.stopPropagation()}>
        <div className="p-6">
          <div className={`mx-auto flex items-center justify-center h-16 w-16 rounded-full ${style.iconBg} mb-4`}>
            {style.icon}
          </div>
          
          <h3 className="text-xl font-bold text-gray-900 text-center mb-2">
            {title}
          </h3>
          
          <p className="text-gray-600 text-center mb-6">
            {message}
          </p>

          <div className="flex gap-3">
            <button
              onClick={onCancel}
              className="flex-1 px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-medium rounded-lg transition focus:outline-none focus:ring-2 focus:ring-gray-300"
            >
              {cancelText}
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 px-4 py-2.5 text-white font-medium rounded-lg transition focus:outline-none focus:ring-2 ${style.confirmBtn}`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Add these CSS animations to your global CSS or Tailwind config
const styles = `
@keyframes slide-in {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

@keyframes fade-in {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes scale-in {
  from {
    transform: scale(0.9);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}

.animate-slide-in {
  animation: slide-in 0.3s ease-out;
}

.animate-fade-in {
  animation: fade-in 0.2s ease-out;
}

.animate-scale-in {
  animation: scale-in 0.3s ease-out;
}
`;

// Export a component that injects styles
export function ToastStyles() {
  return <style>{styles}</style>;
}

// Example usage component
export function ExampleUsage() {
  const toast = useToast();
  const confirm = useConfirm();

  const handleDelete = async () => {
    const confirmed = await confirm({
      title: 'Delete File',
      message: 'Are you sure you want to delete this file? This action cannot be undone.',
      confirmText: 'Delete',
      cancelText: 'Cancel',
      type: 'danger'
    });

    if (confirmed) {
      toast.success('File deleted successfully!');
    }
  };

  const handleUpload = async () => {
    toast.info('Uploading file...');
    // Simulate upload
    setTimeout(() => {
      toast.success('File uploaded successfully!');
    }, 2000);
  };

  return (
    <div className="p-8 space-y-4">
      <h1 className="text-2xl font-bold mb-4">Toast & Confirm Examples</h1>
      
      <div className="space-x-2">
        <button onClick={() => toast.success('Success message!')} className="px-4 py-2 bg-green-600 text-white rounded">
          Success Toast
        </button>
        <button onClick={() => toast.error('Error message!')} className="px-4 py-2 bg-red-600 text-white rounded">
          Error Toast
        </button>
        <button onClick={() => toast.warning('Warning message!')} className="px-4 py-2 bg-yellow-600 text-white rounded">
          Warning Toast
        </button>
        <button onClick={() => toast.info('Info message!')} className="px-4 py-2 bg-blue-600 text-white rounded">
          Info Toast
        </button>
      </div>

      <div className="space-x-2 pt-4">
        <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded">
          Delete Confirm
        </button>
        <button onClick={handleUpload} className="px-4 py-2 bg-blue-600 text-white rounded">
          Upload with Toast
        </button>
      </div>
    </div>
  );
}