// src/components/profile/ProfilePictureUpload.jsx
import { useState, useRef, useEffect } from 'react';
import { User, Camera, X } from 'lucide-react';

export default function ProfilePictureUpload({
  currentImage,
  onUpload,
  onRemove,
  disabled
}) {
  const [preview, setPreview] = useState(currentImage);
  const fileInputRef = useRef(null);

  // ✅ FIX 1: keep preview in sync with parent state
  useEffect(() => {
    setPreview(currentImage);
  }, [currentImage]);

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
      onUpload(file, reader.result);

      // ✅ FIX 2: allow selecting same file again
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    };

    reader.readAsDataURL(file);
  };

  const handleRemove = () => {
    setPreview(null);
    onRemove();

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative">
        <div className="w-32 h-32 rounded-full overflow-hidden bg-gray-100 border-4 border-white shadow-lg">
          {preview ? (
            <img src={preview} alt="Profile" onError={(e) => {
  e.currentTarget.src = '';
}} />

          ) : (
            <div className="w-full h-full flex items-center justify-center bg-blue-100">
              <User className="w-16 h-16 text-blue-600" />
            </div>
          )}
        </div>

        {!disabled && (
          <>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="absolute bottom-0 right-0 p-2 bg-blue-600 text-white rounded-full hover:bg-blue-700 shadow-lg transition"
            >
              <Camera className="w-5 h-5" />
            </button>

            {preview && (
              <button
                type="button"
                onClick={handleRemove}
                className="absolute top-0 right-0 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 shadow-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </>
        )}
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />

      <p className="mt-3 text-sm text-gray-500">
        {disabled
          ? 'Click Edit Profile to change photo'
          : 'Click camera icon to upload photo'}
      </p>
    </div>
  );
}
