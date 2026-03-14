# ☁️ Cloud Storage Frontend

A Google Drive-inspired cloud storage web app built with **React + Vite + Tailwind CSS**.

> 🚀 **Live Demo:** https://cloud-storage-project-tau.vercel.app

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React.js |
| Build Tool | Vite |
| Styling | Tailwind CSS |
| State Management | Zustand (authStore, fileStore) |
| HTTP Client | Axios |
| Deployment | Vercel |

---

## ✨ Features

- 🔐 **Auth** — Email/Password + Google OAuth2 + OTP verification
- 📁 **My Drive** — File & folder management
- 📤 **Drag & Drop Upload** — Upload files instantly
- 📋 **Copy & Paste Upload** — Ctrl+V to upload images
- 🔗 **File & Folder Sharing** — Share with Viewer/Editor roles
- 🌐 **Public Share Links** — Shareable links with expiry
- ⭐ **Starred Files**
- 🗑️ **Trash & Restore**
- 🔍 **Search Files**
- 📊 **Storage Indicator** — 5GB free
- 🌐 **Grid & List View**
- 👤 **User Profile** — Profile picture, settings
- 📱 **Mobile Responsive** — Bottom navigation

---

## 📁 Project Structure

```
frontend/src/
├── components/
│   ├── auth/
│   │   ├── Login.jsx
│   │   ├── Register.jsx
│   │   ├── OTPInput.jsx
│   │   ├── GoogleButton.jsx
│   │   └── ProtectedRoute.jsx
│   ├── common/
│   │   ├── Button.jsx
│   │   ├── FileCard.jsx
│   │   ├── FileContextMenu.jsx
│   │   ├── FilterBar.jsx
│   │   ├── Input.jsx
│   │   ├── Modal.jsx
│   │   ├── RenameModal.jsx
│   │   └── UploadMenu.jsx
│   ├── files/
│   │   ├── FileItem.jsx
│   │   ├── FileList.jsx
│   │   ├── FileUpload.jsx
│   │   ├── MoveModal.jsx
│   │   └── ViewToggle.jsx
│   ├── folders/
│   │   ├── Breadcrumb.jsx
│   │   └── FolderTree.jsx
│   ├── layout/
│   │   ├── Layout.jsx
│   │   ├── Navbar.jsx
│   │   ├── Sidebar.jsx
│   │   └── MobileBottomNav.jsx
│   ├── profile/
│   │   ├── UserProfile.jsx
│   │   ├── ProfilePictureUpload.jsx
│   │   └── OTPVerification.jsx
│   └── share/
│       ├── ShareModal.jsx
│       └── PermissionControl.jsx
├── hooks/
│   ├── useAuth.js
│   ├── useFiles.js
│   ├── useUpload.js
│   ├── useFileOperations.js
│   ├── useFileFilter.js
│   └── useViewPreferences.js
├── pages/
│   ├── Dashboard.jsx
│   ├── MyDrive.jsx
│   ├── SharedWithMe.jsx
│   ├── SharedByMe.jsx
│   ├── SharedFolderView.jsx
│   ├── SharedLinkView.jsx
│   ├── UnifiedShareView.jsx
│   ├── Starred.jsx
│   ├── Trash.jsx
│   └── SearchResults.jsx
├── services/
│   ├── api.js
│   ├── authService.js
│   ├── fileService.js
│   ├── folderService.js
│   ├── dashboardService.js
│   └── storageService.js
├── store/
│   ├── authStore.js
│   └── fileStore.js
├── utils/
│   ├── formatters.js
│   └── validators.js
├── App.jsx
└── main.jsx
```

---

## ⚙️ Environment Variables

```env
VITE_API_BASE_URL=https://cloud-storage-project-vigj.onrender.com
VITE_GOOGLE_CLIENT_ID=your_google_client_id
```

---

## 🏃 Run Locally

```bash
git clone https://github.com/xyzbruet/cloud-storage-project.git
cd cloud-storage-project/frontend
npm install
npm run dev
```

---

## 📦 Deployment

- Deployed on **Vercel**
- Auto-deploys on every `git push` to `main`

---

## 📸 Screenshots

### My Drive
![My Drive](https://cloud-storage-project-tau.vercel.app)

---

## 👨‍💻 Author

**Mahendra Vaidya**  
[GitHub](https://github.com/xyzbruet) • [LinkedIn](https://www.linkedin.com/in/mahendra-vaidya/)
