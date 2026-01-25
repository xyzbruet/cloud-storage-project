import { X, Copy, Mail, Check, Link2, Trash2, AlertCircle, Eye, Edit, ExternalLink } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

// PermissionControl Component
function PermissionControl({ 
  permission, 
  onChange, 
  disabled = false,
  size = 'default' 
}) {
  const sizeClasses = {
    small: 'text-xs px-2 py-1',
    default: 'text-sm px-3 py-2',
    large: 'text-base px-4 py-2.5'
  };

  return (
    <select
      value={permission}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`${sizeClasses[size]} border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors appearance-none cursor-pointer hover:border-blue-400`}
      style={{
        backgroundImage: `url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e")`,
        backgroundPosition: 'right 0.5rem center',
        backgroundRepeat: 'no-repeat',
        backgroundSize: '1.5em 1.5em',
        paddingRight: '2.5rem'
      }}
    >
      <option value="view">👁️ Can view</option>
      <option value="edit">✏️ Can edit</option>
    </select>
  );
}

// PermissionBadge Component
function PermissionBadge({ permission, size = 'default' }) {
  const sizeClasses = {
    small: 'text-[10px] px-1.5 py-0.5',
    default: 'text-xs px-2 py-1',
    large: 'text-sm px-3 py-1.5'
  };

  const iconSizes = {
    small: 'w-2.5 h-2.5',
    default: 'w-3 h-3',
    large: 'w-4 h-4'
  };

  const permissionConfig = {
    view: {
      label: 'View',
      icon: Eye,
      bgColor: 'bg-blue-100',
      textColor: 'text-blue-700',
      borderColor: 'border-blue-200'
    },
    edit: {
      label: 'Edit',
      icon: Edit,
      bgColor: 'bg-green-100',
      textColor: 'text-green-700',
      borderColor: 'border-green-200'
    }
  };

  const config = permissionConfig[permission] || permissionConfig.view;
  const Icon = config.icon;

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full font-medium border ${sizeClasses[size]} ${config.bgColor} ${config.textColor} ${config.borderColor}`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
}

// Alert Message Component
function AlertMessage({ type, text, onDismiss }) {
  return (
    <div className={`mx-6 mt-4 p-3 rounded-lg flex items-start gap-2 ${
      type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 
      type === 'error' ? 'bg-red-50 text-red-800 border border-red-200' : 
      'bg-blue-50 text-blue-800 border border-blue-200'
    }`}>
      <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
      <span className="text-sm flex-1">{text}</span>
      {onDismiss && (
        <button 
          onClick={onDismiss}
          className="flex-shrink-0 hover:opacity-70 transition"
          aria-label="Dismiss message"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

export default function ShareModal({ file, onClose, onShared }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState('');
  const [copied, setCopied] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fetchingData, setFetchingData] = useState(true);
  const [linkPermission, setLinkPermission] = useState('view');
  
  const emailInputRef = useRef(null);
  const messageTimeoutRef = useRef(null);

  // Detect if this is a folder or file
  const isFolder = file?.isFolder || file?.mimeType === 'folder';
  const itemType = isFolder ? 'folders' : 'files';
  const itemLabel = isFolder ? 'folder' : 'file';

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (messageTimeoutRef.current) {
        clearTimeout(messageTimeoutRef.current);
      }
    };
  }, []);

  // Focus email input on mount
  useEffect(() => {
    emailInputRef.current?.focus();
  }, []);

  // Handle escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [onClose]);

  const fetchSharedUsers = useCallback(async () => {
    try {
      const response = await api.get(`/${itemType}/${file.id}/shares`);
      
      const shares = response.data?.data || response.data || [];
      setSharedUsers(Array.isArray(shares) ? shares : []);
    } catch (err) {
      console.error('Failed to fetch shared users:', err);
      if (err.response?.status === 403) {
        showMessage('error', `You do not have permission to view shares for this ${itemLabel}`);
      } else if (err.response?.status === 401) {
        showMessage('error', 'Authentication required. Please log in again.');
      }
    }
  }, [file.id, itemType, itemLabel]);

  const checkExistingLink = useCallback(async () => {
    try {
      const response = await api.get(`/${itemType}/${file.id}/share-link`);
      
      // Handle multiple possible response structures
      let shareUrl = null;
      let existingPermission = 'view';
      
      // Check nested data.data structure (ApiResponse wrapper)
      if (response.data?.data?.shareUrl) {
        shareUrl = response.data.data.shareUrl;
        existingPermission = response.data.data.permission || 'view';
      }
      // Check direct data.shareUrl
      else if (response.data?.shareUrl) {
        shareUrl = response.data.shareUrl;
        existingPermission = response.data.permission || 'view';
      }
      // Check shareLink instead of shareUrl
      else if (response.data?.data?.shareLink) {
        shareUrl = response.data.data.shareLink;
        existingPermission = response.data.data.permission || 'view';
      }
      else if (response.data?.shareLink) {
        shareUrl = response.data.shareLink;
        existingPermission = response.data.permission || 'view';
      }
      
      if (shareUrl) {
        setShareLink(shareUrl);
        setLinkPermission(existingPermission);
      }
    } catch (err) {
      // Silently handle - no existing link is normal
    }
  }, [file.id, itemType]);

  useEffect(() => {
    const loadData = async () => {
      setFetchingData(true);
      await Promise.all([fetchSharedUsers(), checkExistingLink()]);
      setFetchingData(false);
    };
    loadData();
  }, [fetchSharedUsers, checkExistingLink]);

  const showMessage = useCallback((type, text) => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    
    setMessage({ type, text });
    messageTimeoutRef.current = setTimeout(() => {
      setMessage({ type: '', text: '' });
    }, 5000);
  }, []);

  const dismissMessage = useCallback(() => {
    if (messageTimeoutRef.current) {
      clearTimeout(messageTimeoutRef.current);
    }
    setMessage({ type: '', text: '' });
  }, []);

  const validateEmail = (emailStr) => {
    const trimmed = emailStr.trim();
    if (!trimmed) {
      return { valid: false, error: 'Please enter an email address' };
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) {
      return { valid: false, error: 'Please enter a valid email address' };
    }
    
    if (sharedUsers.some(user => user.email?.toLowerCase() === trimmed.toLowerCase())) {
      return { valid: false, error: `This user already has access to the ${itemLabel}` };
    }
    
    return { valid: true, email: trimmed };
  };

  const shareWithUser = async () => {
    const validation = validateEmail(email);
    if (!validation.valid) {
      showMessage('error', validation.error);
      return;
    }

    try {
      setLoading(true);

      await api.post(`/${itemType}/${file.id}/share`, {
        email: validation.email,
        permission,
        sendEmail,
        message: `You have been given ${permission} access to "${file.name}"`
      });

      const savedEmail = validation.email;
      setEmail('');
      setPermission('view');
      setSendEmail(false);

      showMessage(
        'success',
        `${isFolder ? 'Folder' : 'File'} shared with ${savedEmail}${sendEmail ? ' (email sent)' : ''}`
      );

      await fetchSharedUsers();
      if (onShared) onShared();

    } catch (err) {
      console.error(`Exception while sharing ${itemLabel}:`, err);
      
      let errorMessage = `Failed to share ${itemLabel}`;
      
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 403) {
        errorMessage = 'Permission denied. Please check your authentication.';
      } else if (err.response?.status === 401) {
        errorMessage = 'Unauthorized. Please log in again.';
      } else if (err.response?.status === 404) {
        errorMessage = `${isFolder ? 'Folder' : 'File'} not found.`;
      } else if (err.response?.status) {
        errorMessage = `Server error (${err.response.status}). Please try again.`;
      }
      
      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const generateShareLink = async () => {
    try {
      setLoading(true);
      
      const response = await api.post(`/${itemType}/${file.id}/share-link`, {
        permission: linkPermission,
        expiresIn: 30
      });
      
      // Handle multiple response formats
      let shareUrl = null;
      
      // Try different possible locations for the share URL
      if (response.data?.data?.shareUrl) {
        shareUrl = response.data.data.shareUrl;
      } else if (response.data?.shareUrl) {
        shareUrl = response.data.shareUrl;
      } else if (response.shareUrl) {
        shareUrl = response.shareUrl;
      } else if (response.data?.data?.shareLink) {
        shareUrl = response.data.data.shareLink;
      } else if (response.data?.shareLink) {
        shareUrl = response.data.shareLink;
      } else if (response.data?.data?.url) {
        shareUrl = response.data.data.url;
      } else if (response.data?.url) {
        shareUrl = response.data.url;
      }
      
     if (shareUrl) {
        setShareLink(shareUrl);
        showMessage('success', 'Share link generated successfully!');
      } else {
        // Fallback: try to construct URL from token if present
        const token = response.data?.data?.token || response.data?.token;
        if (token) {
          // Use backend URL for share links, not frontend origin
          const BACKEND_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:8080';
          const constructedUrl = `${BACKEND_BASE}/s/${token}`;
          setShareLink(constructedUrl);
          showMessage('success', 'Share link generated successfully!');
        } else {
          showMessage('error', 'Link generated but URL not found in response. Please try again.');
        }
      }
      
      if (onShared) onShared();
    } catch (err) {
      console.error('Failed to generate link:', err);
      showMessage('error', err.response?.data?.message || 'Failed to generate share link');
    } finally {
      setLoading(false);
    }
  };

  const updateUserPermission = async (userId, newPermission) => {
    const userShare = sharedUsers.find(u => u.id === userId);
    if (!userShare) {
      showMessage('error', 'Share record not found');
      return;
    }

    if (userShare.permission === newPermission) {
      return;
    }

    const shareId = userShare.shareId || userShare.id;

    try {
      await api.patch(`/${itemType}/${file.id}/shares/${shareId}`, {
        permission: newPermission
      });

      showMessage('success', 'Permission updated successfully');
      
      setSharedUsers(users => 
        users.map(user => 
          user.id === userId ? { ...user, permission: newPermission } : user
        )
      );
      
      if (onShared) onShared();
    } catch (err) {
      console.error('Failed to update permission:', err);
      
      let errorMessage = 'Failed to update permission';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 403) {
        errorMessage = 'Permission denied.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid request. This share may no longer exist.';
      }
      
      showMessage('error', errorMessage);
      await fetchSharedUsers();
    }
  };

  const removeUserAccess = async (userId, userEmail) => {
    if (!confirm(`Remove access for ${userEmail}?`)) {
      return;
    }

    const userShare = sharedUsers.find(u => u.id === userId);
    if (!userShare) {
      showMessage('error', 'Share record not found');
      return;
    }

    const shareId = userShare.shareId || userShare.id;

    try {
      await api.delete(`/${itemType}/${file.id}/shares/${shareId}`);

      showMessage('success', `Access removed for ${userEmail}`);
      
      setSharedUsers(users => users.filter(user => user.id !== userId));
      
      if (onShared) onShared();
    } catch (err) {
      console.error('Failed to remove access:', err);
      
      let errorMessage = 'Failed to remove access';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 403) {
        errorMessage = 'Permission denied.';
      } else if (err.response?.status === 400) {
        errorMessage = 'Invalid request. This share may no longer exist.';
      }
      
      showMessage('error', errorMessage);
      await fetchSharedUsers();
    }
  };

  const revokeShareLink = async () => {
    if (!confirm('Revoke this share link? Anyone with the link will lose access.')) {
      return;
    }

    try {
      setLoading(true);
      
      await api.delete(`/${itemType}/${file.id}/share-link`);

      setShareLink('');
      showMessage('success', 'Share link revoked successfully');
      
      if (onShared) onShared();
    } catch (err) {
      console.error('Failed to revoke link:', err);
      
      let errorMessage = 'Failed to revoke link';
      if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      } else if (err.response?.status === 403) {
        errorMessage = 'Permission denied.';
      }
      
      showMessage('error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      showMessage('success', 'Link copied to clipboard!');
    } catch (err) {
      showMessage('error', 'Failed to copy to clipboard');
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex-1 min-w-0">
            <h2 className="text-xl font-semibold text-gray-900">
              Share {isFolder ? 'Folder' : 'File'}
            </h2>
            <p className="text-sm text-gray-600 mt-1 truncate" title={file.name}>
              {file.name}
            </p>
          </div>
          <button 
            onClick={onClose} 
            className="p-2 hover:bg-white rounded-lg transition ml-4"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {message.text && (
          <AlertMessage 
            type={message.type} 
            text={message.text} 
            onDismiss={dismissMessage}
          />
        )}

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {fetchingData ? (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-sm text-gray-500">Loading sharing options...</p>
            </div>
          ) : (
            <>
              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Share with people
                </label>
                
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      ref={emailInputRef}
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="Enter email address"
                      className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !loading) {
                          shareWithUser();
                        }
                      }}
                      disabled={loading}
                      aria-label="Email address"
                    />
                    <PermissionControl
                      permission={permission}
                      onChange={setPermission}
                      size="default"
                      disabled={loading}
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="sendEmail"
                      checked={sendEmail}
                      onChange={(e) => setSendEmail(e.target.checked)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                      disabled={loading}
                    />
                    <label htmlFor="sendEmail" className="text-sm text-gray-700 cursor-pointer">
                      Send email notification
                    </label>
                  </div>

                  <button
                    onClick={shareWithUser}
                    disabled={loading || !email.trim()}
                    className="w-full px-4 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-medium shadow-sm"
                  >
                    <Mail className="w-4 h-4" />
                    {loading ? 'Sharing...' : `Share ${isFolder ? 'Folder' : 'File'}`}
                  </button>
                </div>

                {sharedUsers.length > 0 && (
                  <div className="mt-5 space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      People with access ({sharedUsers.length})
                    </p>
                    <div className="space-y-2 max-h-64 overflow-y-auto border border-gray-200 rounded-lg">
                      {sharedUsers.map((user) => (
                        <div 
                          key={user.id} 
                          className="flex items-center justify-between p-3 hover:bg-gray-50 transition first:rounded-t-lg last:rounded-b-lg"
                        >
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0 shadow-sm">
                              {user.email?.[0]?.toUpperCase() || '?'}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {user.email}
                              </p>
                              <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                                <PermissionBadge permission={user.permission} size="small" />
                                {user.sharedAt && (
                                  <>
                                    <span className="text-gray-400">•</span>
                                    <span>Shared {new Date(user.sharedAt).toLocaleDateString()}</span>
                                  </>
                                )}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2 ml-3">
                            <PermissionControl
                              permission={user.permission}
                              onChange={(perm) => updateUserPermission(user.id, perm)}
                              size="small"
                            />
                            <button
                              onClick={() => removeUserAccess(user.id, user.email)}
                              className="p-1.5 text-red-600 hover:bg-red-50 rounded transition"
                              title="Remove access"
                              aria-label={`Remove access for ${user.email}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-3 bg-white text-gray-500 font-medium">Or</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-900 mb-3">
                  Get shareable link
                </label>
                
                {!shareLink ? (
                  <div className="space-y-3">
                    <div className="flex gap-2 items-center">
                      <label className="text-sm text-gray-700 font-medium">Link permission:</label>
                      <PermissionControl
                        permission={linkPermission}
                        onChange={setLinkPermission}
                        size="small"
                        disabled={loading}
                      />
                    </div>
                    <button
                      onClick={generateShareLink}
                      disabled={loading}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition text-gray-600 hover:text-blue-600 disabled:opacity-50 flex items-center justify-center gap-2 font-medium"
                    >
                      <Link2 className="w-5 h-5" />
                      {loading ? 'Generating...' : 'Generate shareable link'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
                      <div className="flex items-start gap-2 mb-3">
                        <Link2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-xs text-blue-800 font-medium">
                            Anyone with this link can {linkPermission === 'edit' ? 'edit' : 'view'} the {isFolder ? 'folder' : 'file'}
                          </p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={shareLink}
                          readOnly
                          className="flex-1 px-3 py-2 bg-white border border-blue-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none"
                          onClick={(e) => e.target.select()}
                        />
                        <button
                          onClick={copyToClipboard}
                          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition flex items-center gap-2 shadow-sm flex-shrink-0"
                          title="Copy link to clipboard"
                        >
                          {copied ? (
                            <>
                              <Check className="w-4 h-4" />
                              <span className="text-sm font-medium hidden sm:inline">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span className="text-sm font-medium hidden sm:inline">Copy</span>
                            </>
                          )}
                        </button>
                        <a
                          href={shareLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-2 bg-white border border-blue-300 hover:bg-blue-50 text-blue-600 rounded-lg transition flex items-center justify-center shadow-sm flex-shrink-0"
                          title="Open link in new tab"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>
                    <button
                      onClick={revokeShareLink}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg transition disabled:opacity-50 flex items-center justify-center gap-2 text-sm font-medium border border-red-200"
                    >
                      <Trash2 className="w-4 h-4" />
                      Revoke Link
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition font-medium"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}