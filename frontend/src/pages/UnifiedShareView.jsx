import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import SharedLinkView from './SharedLinkView';
import SharedFolderView from './SharedFolderView';

// Backend base URL (without /api for public share endpoints)
const BACKEND_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';

export default function UnifiedShareView() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [resourceType, setResourceType] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const detectResourceType = async () => {
    try {
      setLoading(true);
      
      // Public share endpoints don't use /api prefix
      const response = await fetch(`${BACKEND_BASE}/s/${token}`);
      
      if (!response.ok) {
        if (response.status === 404) {
          setError('This link is invalid or has expired');
        } else if (response.status === 403) {
          setError('You do not have permission to access this content');
        } else if (response.status === 400) {
          setError('Invalid share link format');
        } else if (response.status === 500) {
          setError('Server error - The file owner needs to check their server configuration');
        } else {
          setError('Failed to load shared content');
        }
        setLoading(false);
        return;
      }
      
      const data = await response.json();
      const content = data.data || data;
      
      console.log('📦 Received content:', content); // Debug log
      
      // Detect type by checking response structure
      // Folders have subfolders/files arrays, files don't
      if (
        content.subfolders !== undefined || 
        content.files !== undefined ||
        content.isFolder === true ||
        (Array.isArray(content.subfolders) || Array.isArray(content.files))
      ) {
        console.log('✅ Detected as FOLDER');
        setResourceType('folder');
      } else if (content.name && content.size !== undefined) {
        console.log('✅ Detected as FILE');
        setResourceType('file');
      } else {
        console.error('❌ Unable to determine type:', content);
        setError('Unable to determine content type');
      }
      
      setLoading(false);
      
    } catch (err) {
      console.error('Failed to detect resource type:', err);
      setError('Failed to load shared content');
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      detectResourceType();
    } else {
      setError('Invalid share link - no token provided');
      setLoading(false);
    }
  }, [token]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
        <div className="text-center">
          <Loader2 className="w-16 h-16 text-blue-600 animate-spin mx-auto mb-4" />
          <p className="text-lg text-gray-700 font-medium mb-2">Loading shared content...</p>
          <p className="text-sm text-gray-500">Please wait</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="w-10 h-10 text-red-600" />
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 mb-3">
            Link Unavailable
          </h1>
          
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-red-800">{error}</p>
          </div>
          
          <p className="text-gray-600 mb-6">
            This shared link may have expired or been revoked by the owner.
          </p>
          
          <button
            onClick={() => navigate('/login')}
            className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition font-medium flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-5 h-5" />
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  // Render the appropriate component based on detected type
  if (resourceType === 'folder') {
    return <SharedFolderView />;
  }
  
  if (resourceType === 'file') {
    return <SharedLinkView />;
  }

  return null;
}