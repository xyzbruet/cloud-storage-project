export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export const validatePassword = (password) => {
  return password.length >= 6
}

export const validateFileSize = (file, maxSizeMB = 100) => {
  const maxSize = maxSizeMB * 1024 * 1024 // Convert to bytes
  return file.size <= maxSize
}

export const validateFileName = (fileName) => {
  // No special characters except dots, dashes, underscores
  const re = /^[a-zA-Z0-9._-]+$/
  return re.test(fileName)
}

export const getAllowedFileTypes = () => {
  return [
    // Images
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // Documents
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    // Text
    'text/plain',
    'text/csv',
    'text/html',
    'text/css',
    'application/javascript',
    'application/json',
    // Archives
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
    // Media
    'video/mp4',
    'video/mpeg',
    'video/quicktime',
    'audio/mpeg',
    'audio/mp3',
    'audio/wav',
  ]
}
