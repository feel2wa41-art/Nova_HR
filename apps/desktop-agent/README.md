# Nova HR Desktop Agent

A cross-platform desktop application for employee productivity monitoring and attendance tracking.

## Features

- **Authentication**: Secure login with JWT token management
- **Screenshot Capture**: Automatic periodic screenshot capture with configurable intervals
- **Activity Monitoring**: Track application usage and calculate productivity scores
- **Attendance Tracking**: GPS-based check-in/check-out with geofence validation
- **Real-time Statistics**: View productivity insights and usage analytics
- **System Tray Integration**: Run minimized in system tray with quick actions
- **Settings Management**: Configurable monitoring intervals, upload quality, and preferences

## Technology Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Backend Integration**: Axios HTTP client with automatic token refresh
- **Desktop Framework**: Electron 28
- **Screenshot Capture**: screenshot-desktop + sharp for image processing
- **Activity Tracking**: active-win for window monitoring
- **State Management**: React Context API
- **Routing**: React Router v6
- **Storage**: electron-store for persistent settings

## Development

### Prerequisites

- Node.js 18+ 
- pnpm
- Windows/macOS/Linux development environment

### Setup

```bash
# Install dependencies
pnpm install

# Start development server
pnpm start

# Build for production
pnpm run build
```

### Development Scripts

```bash
# Start Vite dev server only
pnpm dev

# Start Electron in development mode
pnpm electron

# Start both Vite and Electron concurrently
pnpm start

# Build renderer only
pnpm run build:dev

# Build and package Electron app
pnpm run build

# Package without installer
pnpm run electron:pack

# Type checking
pnpm typecheck

# Linting
pnpm lint
```

### Build for Different Platforms

```bash
# Windows
pnpm run build:win

# macOS
pnpm run build:mac

# Linux
pnpm run build:linux
```

## Project Structure

```
src/
├── main/                 # Electron main process
│   ├── index.ts         # Main entry point
│   └── services/        # Background services
│       ├── ApiService.ts       # Backend API integration
│       ├── AuthService.ts      # Authentication management
│       ├── ScreenshotService.ts # Screenshot capture
│       ├── ActivityMonitorService.ts # Activity tracking
│       └── TrayService.ts      # System tray integration
├── preload/             # Preload scripts (IPC bridge)
│   └── index.ts
└── renderer/            # React frontend
    ├── components/      # Reusable components
    ├── contexts/        # React contexts
    ├── pages/          # Page components
    ├── styles/         # CSS styles
    ├── App.tsx         # Main app component
    ├── main.tsx        # React entry point
    └── index.html      # HTML template
```

## Configuration

### Settings

The application stores user settings in:
- **Windows**: `%APPDATA%/nova-hr-desktop-agent/settings.json`
- **macOS**: `~/Library/Application Support/nova-hr-desktop-agent/settings.json`
- **Linux**: `~/.config/nova-hr-desktop-agent/settings.json`

### Default Settings

```json
{
  "screenshotInterval": 300000,
  "activityTracking": true,
  "startMinimized": false,
  "autoStart": false,
  "uploadQuality": 80,
  "screenshotEnabled": true,
  "notificationsEnabled": true,
  "theme": "system",
  "language": "ko",
  "autoCheckIn": false,
  "idleThreshold": 300000
}
```

### Environment Variables

```env
# API Configuration
VITE_API_BASE_URL=http://localhost:3000/api
VITE_API_TIMEOUT=30000

# Development
NODE_ENV=development
ELECTRON_IS_DEV=1
```

## Features Detail

### Screenshot Service
- Captures desktop screenshots at configurable intervals
- Compresses images using sharp library
- Uploads to backend API with retry mechanism
- Stores local copies with metadata

### Activity Monitor
- Tracks active window information
- Calculates productivity scores based on application categories
- Monitors idle time and working hours
- Generates usage statistics and reports

### Authentication
- JWT-based authentication with refresh tokens
- Automatic token renewal
- Secure credential storage using keytar
- Session management with logout capability

### System Tray
- Always accessible from system tray
- Quick actions for screenshot, attendance
- Status indicators for monitoring services
- Context menu for common operations

## API Integration

The desktop agent integrates with the Nova HR backend API for:

- User authentication and profile management
- Screenshot upload and storage
- Activity data synchronization
- Attendance records submission
- Settings backup and restore

### API Endpoints Used

```
POST /auth/login              # User authentication
POST /auth/refresh           # Token refresh
GET  /auth/me               # User profile
POST /attendance/check-in   # Check in
POST /attendance/check-out  # Check out
POST /screenshots/upload    # Screenshot upload
POST /activity/sync         # Activity data sync
```

## Security

- All API communications use HTTPS in production
- JWT tokens stored securely using keytar
- No sensitive data in localStorage or plain files
- Screenshot uploads are encrypted in transit
- User credentials never stored locally

## Building and Distribution

### Development Build
```bash
pnpm run build:dev
```

### Production Build
```bash
pnpm run build
```

This creates installers in the `release/` directory:
- **Windows**: `.exe` installer
- **macOS**: `.dmg` disk image  
- **Linux**: `.AppImage` executable

### Auto-updater

The app includes electron-updater for automatic updates:
- Checks for updates on startup
- Downloads and installs updates in background
- Notifies users when updates are available

## Troubleshooting

### Common Issues

1. **Screenshot capture fails**
   - Check screen recording permissions (macOS)
   - Verify screenshot service is running
   - Check available disk space

2. **Activity tracking not working**
   - Ensure accessibility permissions (macOS/Linux)
   - Verify active-win native module is installed
   - Check if monitoring service is enabled

3. **Authentication errors**
   - Verify API server is running
   - Check network connectivity
   - Clear stored credentials if corrupted

### Logs

Application logs are stored in:
- **Windows**: `%APPDATA%/nova-hr-desktop-agent/logs/`
- **macOS**: `~/Library/Logs/nova-hr-desktop-agent/`
- **Linux**: `~/.cache/nova-hr-desktop-agent/logs/`

### Debug Mode

Enable debug logging:
```bash
# Windows
set DEBUG=nova-hr:* && npm start

# macOS/Linux  
DEBUG=nova-hr:* npm start
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

Copyright (c) 2024 Nova HR Team. All rights reserved.