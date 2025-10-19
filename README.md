# 🔊 Safe Sound Monitor

**OSHA-compliant desktop audio monitoring application**  
Track and analyze your audio exposure levels to protect your hearing health
**[Download the latest release here!](https://github.com/Awais-H/Safe-Sound/releases/tag/v1.0.0)**

<img width="580" height="799" alt="image" src="https://github.com/user-attachments/assets/6b841bb8-70a5-4371-80f1-8dc8179eebf5" />

---

## ✨ Features ✨

- **Real-time Audio Monitoring** that displays current decibel readings from your system microphone
- **Local SQLite database** for storing study sessions with hourly readings and time-by-range data
- **OSHA Compliance Tracking** with color-coded indicators based on exposure limits
- **Calibration System** for accurate SPL measurements using smartphone meter calibration
- **Historical Data Analysis** to view hourly, daily, and weekly exposure patterns

---

## 🛠️ Technologies 🛠️

**Frontend:** Next.js with TypeScript and Tailwind CSS

**Backend:** FastAPI with SQLite database

**Desktop:** Electron for Windows desktop app

---

## 📋 System Requirements

- Windows 10 or later
- Audio input device (microphone)
- ~200MB disk space

---

## 🚀 Installation 🚀

### 1. Clone the repository

```bash
git clone https://github.com/yourusername/safe-sound-monitor.git
cd safe-sound-monitor
```

### 2. Install dependencies

```bash
npm install
cd backend && pip install -r requirements.txt && cd ..
```

### 3. Run the application

```bash
npm run dev
```

This starts the Next.js dev server, FastAPI backend, and Electron window.

---

## 📖 Usage

1. **Calibration:** Use your phone's SPL meter app with test audio to calibrate
2. **Monitoring:** Real-time decibel readings with OSHA compliance indicators
3. **History:** View daily/weekly exposure data and time spent in each dB range
4. **Data Storage:** All data saved locally in SQLite database

---

## 📊 OSHA Exposure Limits

| dB Range | Max Exposure | Status |
|----------|--------------|--------|
| 85-94    | 8 hours      | 🟢 Safe |
| 95-104   | 2-4 hours    | 🟡 Caution |
| 105+     | <1 hour      | 🔴 Danger |

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

