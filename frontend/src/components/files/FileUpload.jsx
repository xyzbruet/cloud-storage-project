import { useState } from 'react'
import { useDropzone } from 'react-dropzone'
import { Upload, CheckCircle, AlertCircle } from 'lucide-react'
import { fileService } from '../../services/fileService'

export default function FileUpload({ folderId, onUploadComplete }) {
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({})
  const [uploadedFiles, setUploadedFiles] = useState([])
  const [errors, setErrors] = useState([])

  const onDrop = async (acceptedFiles) => {
    setUploading(true)
    setErrors([])

    for (const file of acceptedFiles) {
      try {
        setUploadProgress(prev => ({ ...prev, [file.name]: 0 }))

        await fileService.uploadFile(
          file,
          folderId,
          (progress) => {
            setUploadProgress(prev => ({
              ...prev,
              [file.name]: progress
            }))
          }
        )

        setUploadedFiles(prev => [...prev, file.name])
        setUploadProgress(prev => ({ ...prev, [file.name]: 100 }))
      } catch (error) {
        setErrors(prev => [
          ...prev,
          { file: file.name, error: error.message || 'Upload failed' }
        ])
      }
    }

    setUploading(false)

    if (onUploadComplete) {
      onUploadComplete()
    }

    setTimeout(() => {
      setUploadProgress({})
      setUploadedFiles([])
      setErrors([])
    }, 3000)
  }

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    maxSize: 104857600 // 100MB
  })

  return (
    <div className="space-y-4">
      {/* DROP ZONE */}
      <div
        {...getRootProps()}
        className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-blue-500 bg-blue-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
      >
        <input {...getInputProps()} />
        <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
        {isDragActive ? (
          <p className="text-blue-600">Drop files here...</p>
        ) : (
          <>
            <p className="text-gray-700 font-medium">
              Drag & drop files here, or click to select
            </p>
            <p className="text-sm text-gray-500">
              Max file size: 100MB
            </p>
          </>
        )}
      </div>

      {/* UPLOAD PROGRESS */}
      {Object.keys(uploadProgress).length > 0 && (
        <div className="space-y-2">
          {Object.entries(uploadProgress).map(([filename, progress]) => (
            <div key={filename} className="bg-white rounded-lg border p-3">
              <div className="flex justify-between mb-1">
                <span className="text-sm truncate">{filename}</span>
                {progress === 100 ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <span className="text-sm">{progress}%</span>
                )}
              </div>
              <div className="w-full bg-gray-200 h-2 rounded">
                <div
                  className="bg-blue-600 h-2 rounded"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ERRORS */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((err, idx) => (
            <div key={idx} className="bg-red-50 border border-red-200 p-3 rounded flex">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <div>
                <p className="text-sm font-medium text-red-700">{err.file}</p>
                <p className="text-xs text-red-600">{err.error}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
