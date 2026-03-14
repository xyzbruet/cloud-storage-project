# ☁️ Cloud Storage Backend

A production-ready cloud storage backend inspired by Google Drive, built with **Java 17 + Spring Boot 3.2**.

> 🚀 **Live API:** https://cloud-storage-project-vigj.onrender.com

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Language | Java 17 |
| Framework | Spring Boot 3.2.0 |
| Security | Spring Security + JWT + Google OAuth2 |
| Database | PostgreSQL (Neon.tech) |
| ORM | Spring Data JPA + Hibernate |
| Storage | AWS S3 / Local |
| Email | Gmail SMTP |
| Build Tool | Maven |
| Deployment | Render |

---

## ✨ Features

- 🔐 **Authentication** — Email/Password + Google OAuth2 + OTP Verification
- 📁 **Folder Management** — Nested folders, rename, move, delete
- 📤 **File Upload & Download** — Drag & Drop, Copy-Paste upload
- 🔗 **File & Folder Sharing** — Role-based access (Viewer / Editor)
- 🌐 **Public Share Links** — With expiry
- ⭐ **Starred Files**
- 🗑️ **Trash & Restore** — Soft delete
- 🔍 **Search & Filters**
- 👤 **User Profile** — Profile picture upload
- 📊 **Dashboard** — Storage stats

---

## 📁 Project Structure

```
backend/src/main/java/com/cloudstorage/
├── controller/
│   ├── AuthController.java
│   ├── DashboardController.java
│   ├── FileController.java
│   ├── FolderController.java
│   ├── HealthController.java
│   ├── ShareLinkController.java
│   └── UserController.java
├── dto/
│   ├── request/          # LoginRequest, RegisterRequest, FileUploadRequest...
│   └── response/         # AuthResponse, FileResponse, FolderResponse...
├── model/
│   ├── User.java
│   ├── File.java
│   ├── Folder.java
│   ├── FileShare.java
│   ├── FolderShare.java
│   ├── ShareLink.java
│   └── AuthProvider.java
├── repository/           # JPA Repositories
├── security/
│   ├── JwtTokenProvider.java
│   ├── JwtAuthenticationFilter.java
│   ├── UserDetailsServiceImpl.java
│   └── GoogleTokenVerifier.java
├── service/
│   ├── AuthService.java
│   ├── FileService.java
│   ├── FolderService.java
│   ├── ShareService.java
│   ├── StorageService.java
│   ├── EmailService.java
│   ├── DashboardService.java
│   └── UserService.java
└── BackendApplication.java
```

---

## ⚙️ Environment Variables

```properties
DATABASE_URL=postgresql://<host>/<db>?sslmode=require
DATABASE_USERNAME=your_db_username
DATABASE_PASSWORD=your_db_password

JWT_SECRET=your_jwt_secret
JWT_EXPIRATION=86400000

GOOGLE_CLIENT_ID=your_google_client_id

EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_app_password

AWS_S3_ENABLED=false
APP_BASE_URL=https://cloud-storage-project-vigj.onrender.com
APP_FRONTEND_URL=https://cloud-storage-project-tau.vercel.app
```

---

## 🔌 Key API Endpoints

```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/google
GET    /api/auth/me

POST   /api/files/upload
GET    /api/files/{id}
DELETE /api/files/{id}

POST   /api/folders
GET    /api/folders/{id}
DELETE /api/folders/{id}

POST   /api/shares
POST   /api/share-links
GET    /api/dashboard
GET    /api/health
```

---

## 🏃 Run Locally

```bash
git clone https://github.com/xyzbruet/cloud-storage-project.git
cd cloud-storage-project/backend
# Add .env file with above variables
./mvnw spring-boot:run
```

---

## 📦 Deployment

- Backend → **Render** (free tier)
- Keep-alive → **cron-job.org** (pings every 10 min)
- Database → **Neon.tech** (free PostgreSQL)

---

## 👨‍💻 Author

**Mahendra Vaidya**  
[GitHub](https://github.com/xyzbruet) • [LinkedIn](https://www.linkedin.com/in/mahendra-vaidya/)
