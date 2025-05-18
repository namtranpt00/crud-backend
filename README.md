# CRUD Backend API

This is a Node.js + Express backend API for managing users and uploading avatars to AWS S3. It supports file uploads and integrates with an S3 bucket using the AWS SDK v3.

---

## 🚀 Features

- RESTful API for user management (extendable)
- Avatar image upload to Amazon S3
- CORS support for cross-origin access
- Multer for handling `multipart/form-data`

---

## 📦 Tech Stack

- Node.js
- Express.js
- AWS SDK v3
- Multer
- Dotenv

---

## 📤 API Endpoints

### `POST /upload`

Upload a user avatar to S3.

**Form Data:**
- `avatar`: File (image)

**Response:**
```json
{
    "url": "https://<bucket-name>.s3.<region>.amazonaws.com/avatars/<filename>"
}
```
