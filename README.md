# Resume.AI

AI-powered resume optimizer that converts your resume to LaTeX, optimizes it with ATS keywords from job descriptions, and compiles it to a professional 1-page PDF.

## 🚀 Features

- **Upload Resume** — PDF, DOCX, or TXT format
- **AI LaTeX Conversion** — LongCat AI converts your resume to clean LaTeX code
- **Job Description Analysis** — Extract critical ATS keywords automatically
- **Keyword Optimization** — Inject keywords into correct resume sections
- **PDF Compilation** — Compile to professional PDF via pdflatex
- **ATS Score** — Get real-time ATS compatibility score (0-100)
- **Overleaf Integration** — Open optimized LaTeX directly in Overleaf
- **1-Page Guarantee** — All resumes compile to exactly one page

## 📦 Tech Stack

**Frontend:**
- React 18 + Vite
- Tailwind CSS
- Framer Motion (animations)
- Lucide React (icons)

**Backend:**
- Express.js
- MongoDB Atlas
- LongCat AI (Claude-compatible API)
- pdflatex (LaTeX compilation)

## 🛠️ Setup

### Prerequisites

1. **Node.js** 18+ ([Download](https://nodejs.org))
2. **MongoDB Atlas** account (free tier) — [Sign up](https://www.mongodb.com/cloud/atlas)
3. **LongCat API Key** — Get from [LongCat Dashboard](https://longcat.chat)
4. **pdflatex** (optional, for PDF preview)
   - Windows: [MiKTeX](https://miktex.org/download)
   - Mac: `brew install mactex-no-gui`
   - Linux: `sudo apt install texlive-latex-base texlive-fonts-recommended`
5. **Firebase Project** (required for Google + Email/Password login)
   - Enable **Google** provider in Firebase Authentication
   - Enable **Email/Password** provider in Firebase Authentication
   - Enable email verification in Firebase Authentication templates/settings
   - Add localhost and your deployed domain under Authorized Domains

### Installation

**1. Clone & Install Dependencies**

```bash
# Install backend
cd backend
npm install

# Install frontend
cd ../frontend
npm install
```

**2. Configure Environment**

Create `backend/.env`:

```env
PORT=5000
MONGODB_URI=your_mongodb_atlas_connection_string
JWT_SECRET=your_super_secret_jwt_key
LONGCHAT_API_KEY=your_longcat_api_key_here
AI_BASE_URL=https://api.longcat.chat/anthropic
NODE_ENV=development
FRONTEND_URL=http://localhost:5173

# Firebase Admin SDK (choose one option)
# Option A: full JSON in one env var
FIREBASE_SERVICE_ACCOUNT_JSON=

# Option B: split fields
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
```

Create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your_firebase_web_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
```

**3. Get MongoDB Connection String**

- Go to [MongoDB Atlas](https://cloud.mongodb.com)
- Create a free cluster → Database Access → Add user
- Network Access → Allow `0.0.0.0/0`
- Connect → Drivers → Copy connection string
- Replace `<username>:<password>` with your credentials
- Paste in `MONGODB_URI`

**4. Get LongCat API Key**

- Visit [LongCat Chat](https://longcat.chat)
- Sign in → API Keys → Create new key
- Copy key and paste in `LONGCHAT_API_KEY`

### Run

```bash
# Terminal 1 — Backend
cd backend
npm run dev    # http://localhost:5000

# Terminal 2 — Frontend
cd frontend
npm run dev    # http://localhost:5173
```

Open [http://localhost:5173](http://localhost:5173)

## 🎯 Usage

1. **Register/Login** → Create account
2. **Upload Resume** → Drag & drop PDF/DOCX
3. **Paste Job Description** → Copy from job posting
4. **Optimize** → AI extracts keywords & optimizes LaTeX
5. **View Result** → See ATS score + PDF preview
6. **Download PDF** or **Open in Overleaf**

## 📁 Project Structure

```
Resume.AI/
├── backend/
│   ├── models/          # User, Resume schemas
│   ├── routes/          # auth, resume APIs
│   ├── services/        # aiService, latexService
│   ├── middleware/      # JWT auth
│   ├── server.js        # Express app
│   └── .env            # Config (DO NOT COMMIT)
├── frontend/
│   ├── src/
│   │   ├── components/  # Landing, Auth, Dashboard
│   │   ├── context/     # AuthContext
│   │   ├── services/    # API client
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── public/
│   └── index.html
└── README.md
```

## 🔧 API Endpoints

| Method | Endpoint             | Description                     |
|--------|----------------------|---------------------------------|
| POST   | `/api/auth/register` | Local register (legacy optional) |
| POST   | `/api/auth/login`    | Login user                      |
| POST   | `/api/auth/firebase` | Firebase token auth (Google + Email/Password) |
| GET    | `/api/resume/status` | Check pdflatex + resume status  |
| POST   | `/api/resume/upload` | Upload resume file              |
| POST   | `/api/resume/optimize` | Optimize with job description |
| GET    | `/api/resume/pdf`    | Get stored PDF                  |

## 🐛 Troubleshooting

**MongoDB connection error:**
- Check Atlas Network Access allows your IP (`0.0.0.0/0`)
- Verify credentials in connection string
- Password special chars must be URL-encoded (`@` → `%40`)

**pdflatex not found:**
- Install MiKTeX/TeX Live (see Prerequisites)
- Restart backend after installation
- If still fails, use "Open in Overleaf" button

**LongCat API error:**
- Verify `LONGCHAT_API_KEY` is correct
- Check `AI_BASE_URL=https://api.longcat.chat/anthropic`
- Model must be `LongCat-Flash-Lite` (configured automatically)


## 📝 License

MIT © 2026 Resume.AI

## 🤝 Contributing

Pull requests welcome! For major changes, open an issue first.
