import { app, BrowserWindow } from 'electron';
import * as path from 'path';
import { initializeDatabase } from './database';
import './ipc-handlers';

let mainWindow: BrowserWindow | null = null;

function createWindow() {
  // Check if we're in development mode (not packaged and running from source)
  const isDev = !app.isPackaged;
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
    },
    titleBarStyle: 'default',
    show: false,
    autoHideMenuBar: !isDev, // Hide menu bar in production for cleaner look
  });
  
  // Load the React app
  if (isDev) {
    // In development, try to connect to Vite dev server
    // Start with port 3002 (where Vite actually runs) and fallback to others
    const tryPorts = [3002, 3000, 3001, 3003];
    let currentPortIndex = 0;
    
    const tryLoad = () => {
      if (!mainWindow) return;
      
      if (currentPortIndex >= tryPorts.length) {
        console.error('Could not connect to Vite dev server on any port');
        return;
      }
      
      const port = tryPorts[currentPortIndex];
      const url = `http://localhost:${port}`;
      
      console.log(`Attempting to load dev server: ${url}`);
      
      // Set up error handler before loading
      const failHandler = (event: any, errorCode: number, errorDescription: string, validatedURL: string) => {
        if (validatedURL.includes(`localhost:${port}`)) {
          console.log(`Failed to load ${url}, trying next port...`);
          mainWindow?.webContents.removeListener('did-fail-load', failHandler);
          currentPortIndex++;
          setTimeout(tryLoad, 500);
        }
      };
      
      mainWindow.webContents.once('did-fail-load', failHandler);
      mainWindow.loadURL(url);
    };
    
    // Wait a moment for Vite to start, then try loading
    setTimeout(tryLoad, 2000);
    // Always open DevTools in development mode
    mainWindow.webContents.openDevTools();
  } else {
    // In production, files are packaged in app.asar
    // app.getAppPath() returns the path to the app.asar file or the app directory
    // We need to join it with dist-react/index.html
    const appPath = app.getAppPath();
    const htmlPath = path.join(appPath, 'dist-react', 'index.html');
    
    if (mainWindow) {
      mainWindow.loadFile(htmlPath).catch((err) => {
        console.error('Failed to load HTML file:', err);
        // Fallback: try path relative to __dirname
        const fallbackPath = path.join(__dirname, '../dist-react/index.html');
        mainWindow?.loadFile(fallbackPath);
      });
      
    }
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Initialize database
  initializeDatabase();
  
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

