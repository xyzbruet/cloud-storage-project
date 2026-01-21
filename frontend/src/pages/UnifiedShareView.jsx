import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import SharedLinkView from './SharedLinkView';
import SharedFolderView from './SharedFolderView';

export default function UnifiedShareView() {
  const { token } = useParams();
  const [resourceType, setResourceType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    detectResourceType();
  }, [token]);

  const detectResourceType = async () => {
    try {
      setLoading(true);
      
      // Try folder first
      const folderResponse = await fetch(`/api/folders/shared-link/${token}`);
      if (folderResponse.ok) {
        setResourceType('folder');
        setLoading(false);
        return;
      }
      
      // Try file second
      const fileResponse = await fetch(`/api/files/shared-link/${token}`);
      if (fileResponse.ok) {
        setResourceType('file');
        setLoading(false);
        return;
      }
      
      // Neither worked
      setError('Invalid or expired share link');
      setLoading(false);
      
    } catch (err) {
      console.error('Failed to detect resource type:', err);
      setError('Failed to load shared resource');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading shared content...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Link Unavailable</h1>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  // Render the appropriate component
  if (resourceType === 'folder') {
    return <SharedFolderView />;
  }
  
  if (resourceType === 'file') {
    return <SharedLinkView />;
  }

  return null;
}
