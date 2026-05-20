# CodeForge: Live Proctoring System

CodeForge is a comprehensive online assessment platform equipped with an advanced AI-powered Live Proctoring Engine. It is designed to ensure the highest level of academic integrity during Coding Problems, SQL Labs, and MCQ Challenges.

## 🚀 Core Features

### 1. AI-Powered Webcam Proctoring
- Utilizes `face-api.js` for continuous facial recognition and tracking.
- Automatically detects and flags:
  - **No Face Detected**: Candidate is not visible.
  - **Multiple Faces**: More than one person is in the frame.
  - **Camera Blocked/Disabled**: Instant high-risk violation.
- Streams snapshot frames directly to the Admin Dashboard for live monitoring.

### 2. Behavioral & Browser Monitoring
- Tracks tab switching using browser Visibility APIs (`visibilitychange`).
- Detects window blurring when the browser loses focus.
- Automatically prevents Right-Click menus and Copy-Paste actions.

### 3. AI Integrity Score (0-100%)
- Every candidate starts the exam with a perfect 100% Integrity Score.
- Violations dynamically deduct points based on calculated Risk Levels:
  - **Low Risk**: Window blurring (Minor penalty).
  - **Medium Risk**: Tab switching, Suspicious movement (Moderate penalty).
  - **High Risk**: Multiple faces, Copy/Paste, Camera off (Severe penalty).
- **Auto-Escalation**: If the AI Integrity Score drops below the critical threshold (or if violations exceed 15), the system forcefully auto-submits the candidate's exam and terminates the session.

### 4. Admin Live Dashboard & Snapshot Replay
- Admins can view a live grid of all active candidates, their current Integrity Scores, and live webcam snapshots.
- **Snapshot Timeline Replay**: Clicking on a candidate opens a modal displaying their entire session history. Admins can scroll through a visual timeline of all violations, complete with timestamped snapshots capturing the exact moment the violation occurred.
- **Admin Commands**: Admins can issue live warnings, pause the exam, or disqualify a candidate with the click of a button.

### 5. Structured Event Auditing
- All events are permanently logged in the MongoDB database using a strict, auditable JSON format:
  ```json
  {
    "user": "student_name",
    "event": "TAB_SWITCHED",
    "module": "SQL Challenge",
    "timestamp": "2026-05-19T10:00:00Z",
    "risk": "medium"
  }
  ```

---

## 💻 Tech Stack
- **Frontend**: React.js, Tailwind CSS, Lucide React (Icons).
- **Backend**: Node.js, Express.js.
- **Real-Time Engine**: Socket.io (WebSockets).
- **Database**: MongoDB (Mongoose).
- **AI/Machine Learning**: `face-api.js` (TensorFlow.js under the hood).

## ⚙️ Local Setup Instructions

### 1. Clone & Install
Open two terminal windows.
**Terminal 1 (Backend):**
```bash
cd server
npm install
```

**Terminal 2 (Frontend):**
```bash
cd client
npm install
```

### 2. Environment Variables
Create a `.env` file in the `server` directory:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/codeforge
JWT_SECRET=supersecretjwtkey_for_development
```

### 3. Run the Platform
**Terminal 1 (Backend):**
```bash
npm run dev
```

**Terminal 2 (Frontend):**
```bash
npm run dev
```

Navigate to `http://localhost:5173` to access the CodeForge platform.
