# Student Resource Sharing Platform

A full-stack web application for students and teachers to collaborate, share, and access study materials with a teacher-based approval system.

## 🎯 Features

### Core Features
- **Google OAuth Authentication** - Secure login with Google accounts
- **Role-Based Access Control** - Student and Teacher roles
- **Resource Upload** - Upload PDFs, notes, and YouTube video links
- **Teacher Approval System** - Teachers review and approve/reject uploaded resources
- **Protected Access** - Only authenticated users can download resources
- **Search & Filtering** - Find resources by subject, type, and keywords
- **Student Dashboard** - View upload history and status
- **Teacher Dashboard** - Moderate pending content
- **Public Homepage** - Browse approved resources (view-only for non-authenticated users)

### Technical Features
- **Modern, Responsive UI** - Mobile-friendly design inspired by Notion
- **Cloud Storage** - Cloudinary integration for PDF storage
- **Database Persistence** - MongoDB for user and resource management
- **RESTful API** - Clean backend API architecture
- **Session Management** - Secure user sessions with Express

## 🛠️ Tech Stack

### Frontend
- **HTML5** - Semantic markup
- **CSS3** - Modern styling with Flexbox and Grid
- **JavaScript (Vanilla)** - No framework dependencies
- **Font Awesome** - Icon library
- **Google Fonts** - Typography

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - NoSQL database
- **Mongoose** - ODM for MongoDB
- **Passport.js** - Authentication middleware
- **Google OAuth 2.0** - Social authentication
- **Cloudinary** - Cloud file storage

## 📁 Project Structure

```
Study-Platform/
├── backend/
│   ├── config/
│   │   ├── passport.js          # Passport Google OAuth setup
│   │   └── cloudinary.js        # Cloudinary configuration
│   ├── middleware/
│   │   ├── auth.js              # Authentication middleware
│   │   └── fileUpload.js        # File upload middleware
│   ├── models/
│   │   ├── User.js              # User schema
│   │   └── Resource.js          # Resource schema
│   ├── controllers/
│   │   ├── userController.js    # User operations
│   │   └── resourceController.js # Resource operations
│   ├── routes/
│   │   ├── auth.js              # Authentication routes
│   │   ├── resources.js         # Resource routes
│   │   └── users.js             # User management routes
│   ├── server.js                # Express server
│   ├── package.json             # Dependencies
│   └── .env                     # Environment variables
│
└── frontend/
    ├── public/
    │   ├── index.html           # Homepage
    │   └── dashboard.html       # Dashboard
    ├── css/
    │   └── style.css            # Global styles
    ├── js/
    │   ├── config.js            # API configuration
    │   ├── auth.js              # Authentication logic
    │   ├── main.js              # Homepage logic
    │   └── dashboard.js         # Dashboard logic
    └── assets/                  # Images, icons, etc
```

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- MongoDB (local or MongoDB Atlas)
- Google OAuth credentials
- Cloudinary account

### 1. Backend Setup

#### Step 1: Clone and Navigate
```bash
cd Study-Platform/backend
```

#### Step 2: Install Dependencies
```bash
npm install
```

#### Step 3: Create `.env` File
Create a `.env` file in the backend directory and add:

```env
# MongoDB Configuration
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/study_platform

# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here
GOOGLE_CALLBACK_URL=http://localhost:5000/api/auth/google/callback

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret

# JWT Configuration
JWT_SECRET=your_jwt_secret_key_here

# Session Configuration
SESSION_SECRET=your_session_secret_here

# Environment
NODE_ENV=development
PORT=5000

# Frontend URL
FRONTEND_URL=http://localhost:3000
```

#### Step 4: Start Backend Server
```bash
npm run dev
# or
npm start
```

The backend will run on `http://localhost:5000`

### 2. Frontend Setup

#### Step 1: Navigate to Frontend
```bash
cd ../frontend
```

#### Step 2: Configure API Base URL
Edit `frontend/js/config.js` and update:
- `API_BASE_URL` - Set to your backend URL (default: `http://localhost:5000/api`)
- `GOOGLE_CLIENT_ID` - Set to your Google OAuth Client ID

#### Step 3: Start Frontend
You can use any static server:

**Option A: Using Python (if installed)**
```bash
cd public
python -m http.server 3000
```

**Option B: Using Node.js (with http-server)**
```bash
npm install -g http-server
cd public
http-server -p 3000
```

**Option C: Using Live Server (VS Code Extension)**
Install the Live Server extension and right-click `index.html` → "Open with Live Server"

The frontend will be available at `http://localhost:3000`

## 🔑 Google OAuth Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable the "Google+ API"
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `http://localhost:5000/api/auth/google/callback`
5. Copy your Client ID and Client Secret
6. Add them to the `.env` file

## 📚 Cloudinary Setup

1. Sign up at [Cloudinary](https://cloudinary.com/)
2. Get your Cloud Name, API Key, and API Secret from the dashboard
3. Add them to the `.env` file

## 💾 MongoDB Setup

### Option A: MongoDB Atlas (Recommended)
1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Create a free account
3. Create a cluster
4. Get your connection string
5. Update `MONGODB_URI` in `.env`

### Option B: Local MongoDB
```bash
# Install MongoDB
# For Windows: Download from https://www.mongodb.com/try/download/community
# For macOS: brew install mongodb-community
# For Linux: Follow MongoDB installation guide

# Start MongoDB service
mongod
```

## 📡 API Endpoints

### Authentication
- `GET /api/auth/google` - Initiate Google OAuth
- `GET /api/auth/google/callback` - Google OAuth callback
- `GET /api/auth/me` - Get current user
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/status` - Check authentication status

### Resources
- `GET /api/resources/approved` - Get all approved resources (public)
- `GET /api/resources/:id` - Get resource details
- `POST /api/resources/upload` - Upload new resource (authenticated)
- `GET /api/resources/my-uploads/list` - Get user's uploads (authenticated)
- `GET /api/resources/pending/list` - Get pending resources (teacher only)
- `PUT /api/resources/:id/approve` - Approve resource (teacher only)
- `PUT /api/resources/:id/reject` - Reject resource (teacher only)
- `GET /api/resources/:id/download` - Download resource (authenticated only)

### Users
- `GET /api/users/me` - Get current user profile
- `GET /api/users` - Get all users (admin only)
- `PUT /api/users/:id/role` - Update user role (admin only)

## 🔐 Access Control

### Public Users (Not Logged In)
- ✅ View homepage
- ✅ Browse available resources (cards/list)
- ❌ Cannot download PDFs
- ❌ Cannot access video links
- ❌ Cannot upload resources

### Logged-In Students
- ✅ View full resource details
- ✅ Download PDFs
- ✅ Access video links
- ✅ Upload resources (pending approval)
- ✅ View upload status

### Teachers
- ✅ All student features
- ✅ View pending resources
- ✅ Approve resources
- ✅ Reject resources with reasons
- ✅ Access moderation dashboard

## 🎨 UI Components

### Navbar
- Responsive navigation with hamburger menu
- User profile dropdown
- Login/Logout buttons

### Resource Cards
- Resource type badge
- Subject category
- Description preview
- Uploader information
- Download button
- Status indicators

### Dashboards
- Statistics overview
- Resource management
- Approval workflow
- File upload interface

## 🧪 Testing

### Test User Roles
1. **Student Upload Flow**
   - Login as student
   - Upload a PDF
   - Verify status is "pending"

2. **Teacher Approval Flow**
   - Login as teacher
   - Navigate to "Pending Approval"
   - Approve/Reject resources

3. **Public Access Test**
   - Logout or use incognito window
   - Try to download a resource
   - Should redirect to login

## 🐛 Troubleshooting

### CORS Errors
- Ensure `FRONTEND_URL` in backend `.env` matches your frontend URL
- Check CORS configuration in `server.js`

### MongoDB Connection Issues
- Verify `MONGODB_URI` is correct
- Check MongoDB service is running
- For Atlas: Whitelist your IP address

### Google OAuth Errors
- Verify redirect URI matches exactly in Google Console
- Check `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET`
- Ensure backend is running on correct port

### File Upload Issues
- Check file size doesn't exceed 50MB
- Verify Cloudinary credentials are correct
- Only PDF files are accepted

## 📝 Database Schema

### User Collection
```javascript
{
  googleId: String,
  name: String,
  email: String (unique),
  profilePicture: String,
  role: String (enum: ['student', 'teacher', 'admin']),
  isVerified: Boolean,
  createdAt: Date,
  updatedAt: Date
}
```

### Resource Collection
```javascript
{
  title: String,
  description: String,
  subject: String,
  type: String (enum: ['pdf', 'video', 'link']),
  url: String,
  uploadedBy: ObjectId (ref: User),
  status: String (enum: ['pending', 'approved', 'rejected']),
  approvedBy: ObjectId (ref: User),
  rejectionReason: String,
  downloadCount: Number,
  fileSize: String,
  createdAt: Date,
  updatedAt: Date
}
```

## 🚀 Deployment

### Backend (Heroku/Railway)
1. Create account on Heroku or Railway
2. Connect GitHub repository
3. Set environment variables in platform dashboard
4. Deploy

### Frontend (Netlify/Vercel)
1. Create account on Netlify or Vercel
2. Connect GitHub repository
3. Set build settings
4. Deploy

## 📄 License

MIT License - feel free to use this project for educational purposes.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues and questions, please open an issue on GitHub.

---

**Built with ❤️ for students and teachers**
