const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let backendProcess;

function startBackend() {
  const isDev = !app.isPackaged;

  if (isDev) {
    console.log('Development mode - backend should be running separately (python backend/main.py)');
    return;
  }

  // Correct path for NSIS installer
  const backendPath = path.join(
    path.dirname(app.getPath('exe')),
    'resources',
    'backend',
    'safesound-backend.exe'
  );

  console.log('Starting backend from:', backendPath);
  console.log('Backend exists:', require('fs').existsSync(backendPath));

  try {
    backendProcess = spawn(backendPath, [], {
      cwd: path.dirname(backendPath),
    });

    backendProcess.stdout.on('data', (data) => {
      console.log(`Backend: ${data}`);
    });

    backendProcess.stderr.on('data', (data) => {
      console.error(`Backend Error: ${data}`);
    });

    backendProcess.on('close', (code) => {
      console.log(`Backend process exited with code ${code}`);
    });

    backendProcess.on('error', (error) => {
      console.error('Failed to spawn backend:', error);
    });
  } catch (error) {
    console.error('Failed to start backend:', error);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 450,
    height: 700,
    resizable: false,
    autoHideMenuBar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    }
  });

  const isDev = !app.isPackaged;

  if (isDev) {
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.webContents.openDevTools();
  } else {
    // Production: load from unpacked out folder
    const indexPath = path.join(__dirname, 'out', 'index.html');

    console.log('Loading from:', indexPath);
    console.log('File exists:', require('fs').existsSync(indexPath));

    mainWindow.loadFile(indexPath);

    mainWindow.webContents.on('did-fail-load', (event, errorCode, errorDescription) => {
      console.error('Failed to load:', errorCode, errorDescription);
    });
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// IPC Handlers
ipcMain.handle('start-audio-monitoring', async () => {
  try {
    return { success: true };
  } catch (error) {
    console.error('Error starting audio monitoring:', error);
    return { success: false, error: error.message };
  }
});

ipcMain.handle('stop-audio-monitoring', async () => {
  return { success: true };
});

ipcMain.handle('get-backend-url', async () => {
  return 'http://127.0.0.1:8000';
});

// App lifecycle
app.whenReady().then(() => {
  startBackend();
  createWindow();
});

app.on('window-all-closed', () => {
  // Kill backend process when app closes
  if (backendProcess) {
    backendProcess.kill('SIGTERM');
    setTimeout(() => {
      if (backendProcess && !backendProcess.killed) {
        backendProcess.kill('SIGKILL');
      }
    }, 2000);
  }

  app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});

app.on('will-quit', () => {
  if (backendProcess) {
    backendProcess.kill('SIGKILL');
  }
});