import { X, Copy, Mail, Check, Link2, Trash2, AlertCircle, Eye, Edit, ExternalLink, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../services/api';

const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || window.location.origin;

// PermissionControl Component
function PermissionControl({ permission, onChange, disabled = false, size = 'default' }) {
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
    <span className={`inline-flex items-center gap-1 ${sizeClasses[size]} ${config.bgColor} ${config.textColor} rounded-full font-medium border ${config.borderColor}`}>
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
}

// Alert Message Component
function AlertMessage({ type, text, onDismiss }) {
  const styles = {
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    info: 'bg-blue-50 border-blue-200 text-blue-800'
  };

  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg border ${styles[type] || styles.info} animate-in fade-in slide-in-from-top-2 duration-200`}>
      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
      <span className="flex-1 text-sm font-medium">{text}</span>
      {onDismiss && (
        <button
          onClick={onDismiss}
          className="flex-shrink-0 hover:opacity-70 transition-opacity"
          aria-label="Dismiss"
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}

// Loading Skeleton
function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      <div className="h-10 bg-gray-200 rounded"></div>
      <div className="h-20 bg-gray-200 rounded"></div>
      <div className="h-32 bg-gray-200 rounded"></div>
    </div>
  );
}

export default function ShareModal({ file, onClose, onShared, publicLink, hasPublicLink }) {
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('view');
  const [loading, setLoading] = useState(false);
  const [shareLink, setShareLink] = useState(publicLink || '');
  const [copied, setCopied] = useState(false);
  const [sharedUsers, setSharedUsers] = useState([]);
  const [sendEmail, setSendEmail] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [fetchingData, setFetchingData] = useState(true);
  const [linkPermission, setLinkPermission] = useState('view');
  const [updatingPermissions, setUpdatingPermissions] = useState({});

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
    const timer = setTimeout(() => {
      emailInputRef.current?.focus();
    }, 100);
    return () => clearTimeout(timer);
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
  }, [file.id, itemType, itemLabel, showMessage]);

  const checkExistingLink = useCallback(async () => {
    try {
      // ✅ If we already have publicLink from parent, use it directly
      if (publicLink) {
        setShareLink(publicLink);
        setLinkPermission('view');
        return;
      }

      const response = await api.get(`/${itemType}/${file.id}/share-link`);
      
      let shareUrl = null;
      let existingPermission = 'view';

      // Check various response structures - ONLY use backend-provided URLs
      if (response.data?.data?.shareUrl) {
        shareUrl = response.data.data.shareUrl;
        existingPermission = response.data.data.permission || 'view';
      } else if (response.data?.shareUrl) {
        shareUrl = response.data.shareUrl;
        existingPermission = response.data.permission || 'view';
      } else if (response.data?.data?.shareLink) {
        shareUrl = response.data.data.shareLink;
        existingPermission = response.data.data.permission || 'view';
      } else if (response.data?.shareLink) {
        shareUrl = response.data.shareLink;
        existingPermission = response.data.permission || 'view';
      }

      // ✅ IMPORTANT: Only set if backend provided a complete URL
      if (shareUrl) {
        setShareLink(shareUrl);
        setLinkPermission(existingPermission);
      }
    } catch (err) {
      console.log('No existing share link found');
    }
  }, [file.id, itemType, publicLink]);

  useEffect(() => {
    const loadData = async () => {
      setFetchingData(true);
      await Promise.all([fetchSharedUsers(), checkExistingLink()]);
      setFetchingData(false);
    };
    loadData();
  }, [fetchSharedUsers, checkExistingLink]);

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

      let shareUrl = null;

      // Try different possible locations for the share URL - ONLY use backend-provided URLs
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

      // ✅ ONLY set if backend provided a complete URL
      if (shareUrl) {
        setShareLink(shareUrl);
        showMessage('success', 'Share link generated successfully!');
      } else {
        showMessage('error', 'Link generated but URL not found in response. Please contact support.');
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
    setUpdatingPermissions(prev => ({ ...prev, [userId]: true }));

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
    } finally {
      setUpdatingPermissions(prev => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex-1 min-w-0">
            <h2 className="text-2xl font-bold text-gray-900 mb-1">
              Share {isFolder ? 'Folder' : 'File'}
            </h2>
            <p className="text-sm text-gray-600 truncate" title={file.name}>
              {file.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Message Alert */}
        {message.text && (
          <div className="px-6 pt-4">
            <AlertMessage
              type={message.type}
              text={message.text}
              onDismiss={dismissMessage}
            />
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {fetchingData ? (
            <LoadingSkeleton />
          ) : (
            <>
              {/* Share with people section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Share with people
                </h3>

                <div className="flex gap-2">
                  <input
                    ref={emailInputRef}
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
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
                    disabled={loading}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="sendEmailNotif"
                    checked={sendEmail}
                    onChange={(e) => setSendEmail(e.target.checked)}
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
                    disabled={loading}
                  />
                  <label htmlFor="sendEmailNotif" className="text-sm text-gray-700 cursor-pointer">
                    Send email notification
                  </label>
                </div>

                <button
                  onClick={shareWithUser}
                  disabled={loading || !email.trim()}
                  className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  {loading ? 'Sharing...' : `Share ${isFolder ? 'Folder' : 'File'}`}
                </button>
              </div>

              {/* Shared users list */}
              {sharedUsers.length > 0 && (
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-gray-700">
                    People with access ({sharedUsers.length})
                  </h4>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {sharedUsers.map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                      >
                        <div className="w-10 h-10 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold flex-shrink-0">
                          {user.email?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">
                            {user.email}
                          </p>
                          {user.sharedAt && (
                            <p className="text-xs text-gray-500">
                              Shared {new Date(user.sharedAt).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {updatingPermissions[user.id] ? (
                            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                          ) : (
                            <PermissionControl
                              permission={user.permission}
                              onChange={(perm) => updateUserPermission(user.id, perm)}
                              size="small"
                            />
                          )}
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

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white text-gray-500">Or</span>
                </div>
              </div>

              {/* Share link section */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Link2 className="w-5 h-5" />
                  Get shareable link
                </h3>

                {!shareLink ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Link permission:
                      </label>
                      <PermissionControl
                        permission={linkPermission}
                        onChange={setLinkPermission}
                        disabled={loading}
                      />
                    </div>
                    <button
                      onClick={generateShareLink}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      {loading ? 'Generating...' : 'Generate shareable link'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                      <p className="text-sm text-blue-800">
                        Anyone with this link can {linkPermission === 'edit' ? 'edit' : 'view'} the {isFolder ? 'folder' : 'file'}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={shareLink}
                        readOnly
                        className="flex-1 px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-mono"
                        onClick={(e) => e.target.select()}
                      />
                      <button
                        onClick={copyToClipboard}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
                      >
                        {copied ? (
                          <>
                            <Check className="w-4 h-4" />
                            Copied!
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            Copy
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
                    <button
                      onClick={revokeShareLink}
                      disabled={loading}
                      className="w-full px-4 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                      <Trash2 className="w-4 h-4" />
                      Revoke Link
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-900 hover:bg-gray-800 text-white rounded-lg font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
