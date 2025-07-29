# Safe Sound - System Audio Level Monitor Chrome Extension

A Chrome extension that tracks system audio output levels in decibels and provides OSHA-compliant monitoring with visual graphs and alerts.

## Features

- **Real-time System Audio Monitoring**: Tracks audio output levels from 20-130dB
- **OSHA Compliance**: Color-coded graphs based on OSHA exposure limits
- **Multiple Views**: 
  - Daily view with hourly breakdown
  - Weekly view with daily averages
  - Time-based analysis by decibel ranges
- **Interactive Graphs**: Click on days to drill down to hourly data
- **Backend Integration**: Next.js API with PostgreSQL database
- **Screen Capture Permission**: Uses Chrome's screen capture API to monitor system audio

## Tech Stack

- **Frontend**: React, TypeScript, Tailwind CSS
- **Backend**: Next.js 15, PostgreSQL
- **Chrome Extension**: Manifest V3
- **Audio Processing**: Web Audio API with Screen Capture

## Prerequisites

- Node.js 18+ 
- PostgreSQL 12+
- Chrome browser

## Installation

### 1. Clone the repository
```bash
git clone <repository-url>
cd safe-sound-extension
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up PostgreSQL database

Create a new database:
```sql
CREATE DATABASE safe_sound;
```

### 4. Configure environment variables

Create a `.env.local` file in the root directory:
```env
# Database Configuration
DB_USER=postgres
DB_HOST=localhost
DB_NAME=safe_sound
DB_PASSWORD=your_password
DB_PORT=5432

# Next.js Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000
```

### 5. Initialize the database

Run the database initialization script:
```bash
node scripts/init-db.js
```

### 6. Start the development server
```bash
npm run dev
```

The backend will be available at `http://localhost:3000`

### 7. Load the Chrome extension

1. Open Chrome and go to `chrome://extensions/`
2. Enable "Developer mode" in the top right
3. Click "Load unpacked" and select the project directory
4. The extension should now appear in your extensions list

## Usage

### Chrome Extension

1. **Installation**: The extension will request screen capture permissions on first use
2. **Monitoring**: Click "Start Monitoring" in the popup to begin tracking system audio
3. **Permissions**: Grant screen capture permission when prompted (this captures system audio output)
4. **Viewing Data**: Click the extension icon to open the popup with graphs
5. **Navigation**: 
   - Toggle between "Levels" and "Time" views
   - Switch between "Week" and "Day" views
   - Click on days in weekly view to see hourly breakdown

### API Endpoints

- `POST /api/audio-data` - Store audio level data
- `GET /api/audio-data?period=day|week&day=YYYY-MM-DD` - Get audio level data
- `GET /api/audio-data/time?period=day|week&day=YYYY-MM-DD` - Get time-based analysis

## Database Schema

The main table `audio_data` stores:
- `id`: Primary key
- `level`: Decibel level (0-130)
- `timestamp`: When measurement was taken
- `hour`: Hour of day (0-23)
- `day`: Day abbreviation (Mon, Tue, etc.)
- `created_at`: Record creation time

## OSHA Guidelines

The extension follows OSHA exposure limits:
- 85-89dB: 8 hours
- 90-94dB: 8 hours  
- 95-99dB: 4 hours
- 100-104dB: 2 hours
- 105-109dB: 1 hour
- 110-114dB: 30 minutes
- 115+dB: 15 minutes

## Development

### Project Structure

```
safe-sound-extension/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   ├── popup.tsx          # Main popup component
│   └── page.tsx           # Home page
├── components/            # UI components
├── lib/                   # Utilities and database
├── database/              # Database schema
├── scripts/               # Database scripts
├── manifest.json          # Chrome extension manifest
├── background.js          # Extension background script
├── contentScript.js       # Content script
├── popup.html             # Extension popup HTML
├── popup.css              # Extension popup styles
├── popup.js               # Extension popup script
└── utils.js               # Extension utilities
```

### Building for Production

1. Build the Next.js app:
```bash
npm run build
```

2. The extension files are ready to be loaded in Chrome

### Testing

The extension includes sample data for testing. You can also:

1. Use the database initialization script to add more sample data
2. Modify the background script to simulate different audio levels
3. Test the API endpoints directly

## Troubleshooting

### Common Issues

1. **Screen Capture Permission Denied**
   - Check Chrome's screen capture permissions
   - Ensure the extension has screen capture access
   - The extension needs this permission to monitor system audio output

2. **Database Connection Failed**
   - Verify PostgreSQL is running
   - Check environment variables
   - Ensure database exists

3. **Extension Not Loading**
   - Check Chrome's developer console for errors
   - Verify manifest.json is valid
   - Ensure all files are in the correct location

### Debug Mode

Enable debug logging by adding to background.js:
```javascript
console.log('Debug mode enabled');
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Disclaimer

This extension is for educational and monitoring purposes. Always follow proper safety guidelines and consult professionals for workplace safety compliance. 