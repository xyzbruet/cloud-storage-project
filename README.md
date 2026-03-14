# ☁️ Cloud Storage System

A **Full-Stack Cloud Storage Web Application** that allows users to upload, store, manage, and download files securely through a modern web interface.

This project demonstrates **React frontend integration with a Spring Boot REST API backend**.

---

## 🚀 Live Features

✔ Upload files to cloud storage
✔ Download stored files
✔ Delete files
✔ View uploaded files list
✔ Secure REST API backend
✔ Responsive UI built with React

---

## 🏗 System Architecture

Frontend (React) communicates with the backend (Spring Boot) using REST APIs.

```
User
 │
 ▼
React Frontend
 │
 │ REST API
 ▼
Spring Boot Backend
 │
 ▼
File Storage System
```

---

## 🛠 Tech Stack

### Frontend

* React
* JavaScript
* HTML5
* CSS3
* Axios

### Backend

* Spring Boot
* Java
* Maven
* REST API

### Tools

* Git
* GitHub
* VS Code
* Postman

---

## 📁 Project Structure

```
cloud-storage-project
│
├── frontend
│   ├── src
│   ├── public
│   └── README.md
│
├── backend
│   ├── src
│   └── README.md
│
└── README.md
```

---

## ⚙️ Installation & Setup

### 1️⃣ Clone the Repository

```
git clone https://github.com/xyzbruet/cloud-storage-project.git
cd cloud-storage-project
```

---

### 2️⃣ Run Backend (Spring Boot)

```
cd backend
mvn spring-boot:run
```

Backend will start on:

```
http://localhost:8080
```

---

### 3️⃣ Run Frontend (React)

```
cd frontend
npm install
npm run dev
```

Frontend will start on:

```
http://localhost:5173
```

---

## 📸 Screenshots

Add your application screenshots here.

Example:

```
/screenshots/upload-page.png
/screenshots/file-list.png
```

---

## 🔌 API Endpoints

| Method | Endpoint             | Description   |
| ------ | -------------------- | ------------- |
| POST   | /upload              | Upload file   |
| GET    | /files               | Get all files |
| GET    | /download/{filename} | Download file |
| DELETE | /delete/{filename}   | Delete file   |

---

## 🎯 Future Improvements

* User authentication
* Cloud storage integration (AWS S3 / Firebase)
* File sharing via link
* Folder management
* File preview

---

## 👨‍💻 Author

**Mahendra Vaidya**

BTech Student
Full Stack Developer

GitHub:
https://github.com/xyzbruet

---

## ⭐ Support

If you like this project, please **give it a star ⭐ on GitHub**.
