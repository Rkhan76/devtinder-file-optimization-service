# 📌 **DevTinder File Optimization Microservice**

A high-performance **media optimization microservice** built for **DevTinder**, designed to efficiently handle **large images and videos** using:

* **Busboy** (streaming multipart parser)
* **Sharp** (image optimization)
* **FFmpeg** (video compression + transcoding)
* **Cloudinary** (final media storage)
* **Node.js + Express** (fast backend service)

Supports **true streaming**, **zero RAM overload**, **large file processing**, and **production-ready performance**.

---

## 🚀 Features

### ✅ 1. Full Streaming Architecture (No RAM overload)

* Uses **Busboy** to parse large uploads via stream
* Avoids `multer.memoryStorage()` and buffer explosion
* Handles 1GB+ videos safely

### ✅ 2. Image Optimization (Sharp)

* Resize to 1080px max width
* Convert to WebP
* Compress using quality factor
* Upload to Cloudinary through stream

### ✅ 3. Video Optimization (FFmpeg)

* Resize to 720p
* Re-encode using **H.264 (libx264)**
* Apply CRF-based compression
* Uses temp files (safe for MP4 container)
* Streams optimized output to Cloudinary

### ✅ 4. Temporary Media Support

Ideal for LinkedIn-style pre-upload flow

* Stores temporary media
* Cleans up unused files
* Prevents storage waste

---

## 🏗️ Tech Stack

| Area              | Technology             |
| ----------------- | ---------------------- |
| Language          | Node.js                |
| Framework         | Express.js             |
| Parsing           | Busboy                 |
| Image Processing  | Sharp                  |
| Video Transcoding | FFmpeg / fluent-ffmpeg |
| Storage           | Cloudinary             |
| Upload Pipeline   | Pure streaming         |

---

## 📁 Project Structure

```
file-optimization-service/
│
├── controllers/
│   ├── imageController.js
│   └── videoController.js
│
├── config/
│   └── cloudinary.js
│
├── routes/
│   ├── imageRoutes.js
│   └── videoRoutes.js
│
├── temp/
│
├── server.js
├── package.json
└── README.md
```

---

## 🔥 API Endpoints

### 📸 Image Optimization

**POST /optimize/image**

Headers:

```
Content-Type: image/jpeg | image/png | image/webp
```

Response:

```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../optimized.webp"
}
```

---

### 🎬 Video Optimization

**POST /optimize/video**

Headers:

```
Content-Type: video/mp4 | video/webm | video/quicktime
```

Response:

```json
{
  "success": true,
  "url": "https://res.cloudinary.com/.../optimized.mp4"
}
```

---

## 📦 Installation

Clone repository:

```bash
git clone https://github.com/Rkhan76/devtinder-file-optimization-service.git
cd devtinder-file-optimization-service
```

Install dependencies:

```bash
npm install
```

---

## ⚙️ Environment Variables

Create `.env`:

```
PORT=8001

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

OPTIMIZE_IMAGE_URL=http://localhost:8001/optimize/image
OPTIMIZE_VIDEO_URL=http://localhost:8001/optimize/video
```

---

## 📥 Running the Service

### Development mode:

```bash
npm run dev
```

### Production:

```bash
npm start
```

---

## 🎯 How It Works (System Flow)

```
Frontend (React)
    |
    | 1. User selects media (upload begins immediately)
    v
DevTinder Backend (streams file directly)
    |
    | 2. Sends raw stream → optimization microservice
    v
File Optimization Microservice
    |
    | 3. Optimizes (Sharp/FFmpeg)
    | 4. Streams optimized file → Cloudinary
    v
Cloudinary (CDN)
    |
    | 5. Returns optimized URL
    v
DevTinder Backend
    |
    | 6. Saves URL to temp_media or final post
    v
Frontend
    |
    | 7. Shows optimized preview or final post
```

---

## 🔐 Why This Architecture?

* No RAM spikes even for 5GB videos
* High-speed streaming pipeline
* Professional, scalable pattern
* Cloudinary stores only optimized media
* Works on distributed microservice environments

---

## 📈 Performance

### Image

* PNG/JPG → WebP
* Up to **80% smaller**

### Video

* MP4 → optimized MP4 (H.264)
* 1080p → 720p
* 30–70% size reduction
* CRF compression

---

## 🌗 Future Enhancements

You can extend this service to:

* Multi-resolution output (360p, 480p, 720p)
* Video thumbnails
* GIF → MP4 conversion
* AWS S3 support
* Background queue (BullMQ, Redis)
* Audio normalization

---

## 🙌 Contribution

Feel free to open issues or PRs for further improvements.

---


