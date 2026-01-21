// components/common/RenameModal.jsx
import { useState, useEffect } from 'react';
import { X } from 'lucide-react';

export default function RenameModal({ item, onClose, onRename }) {
  const [name, setName] = useState('');

  useEffect(() => {
    if (item) {
      setName(item.name || '');
    }
  }, [item]);

  if (!item) return null;

  const isFolder = item.isFolder || item.mimeType === 'folder';

  const handleSubmit = () => {
    if (name.trim()) {
      onRename(item, name.trim());
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Rename {isFolder ? 'Folder' : 'File'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            New Name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && name.trim()) {
                handleSubmit();
              }
            }}
            placeholder="Enter new name..."
            className="w-full border border-gray-300 px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            autoFocus
          />
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!name.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 transition"
          >
            Rename
          </button>
        </div>
      </div>
    </div>
  );
}