const { app, BrowserWindow, Menu, ipcMain } = require('electron');
const { autoUpdater } = require('electron-updater');
const fs = require('fs');
const http = require('http');
const path = require('path');

let mainWindow;
let localServer;
let localServerUrl;
let updateStatus = { status: 'idle' };

const isMainWindowSender = (event) => mainWindow && event.sender === mainWindow.webContents;

const setUpdateStatus = (status) => {
  updateStatus = status;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('updates:status', updateStatus);
  }
};

const checkForUpdates = async () => {
  if (!app.isPackaged) return;

  setUpdateStatus({ status: 'checking' });
  try {
    await autoUpdater.checkForUpdates();
  } catch (error) {
    console.error('Failed to check for NexaStrike updates:', error);
    setUpdateStatus({ status: 'error' });
  }
};

autoUpdater.autoDownload = false;
autoUpdater.autoInstallOnAppQuit = false;
autoUpdater.on('checking-for-update', () => setUpdateStatus({ status: 'checking' }));
autoUpdater.on('update-available', (info) => setUpdateStatus({ status: 'available', version: info.version }));
autoUpdater.on('update-not-available', () => setUpdateStatus({ status: 'not-available' }));
autoUpdater.on('download-progress', (progress) => (
  setUpdateStatus({ status: 'downloading', percent: Math.round(progress.percent) })
));
autoUpdater.on('update-downloaded', (info) => setUpdateStatus({ status: 'downloaded', version: info.version }));
autoUpdater.on('error', (error) => {
  console.error('NexaStrike updater error:', error);
  setUpdateStatus({ status: 'error' });
});

ipcMain.on('window:minimize', (event) => {
  if (isMainWindowSender(event)) mainWindow.minimize();
});

ipcMain.on('window:toggle-maximize', (event) => {
  if (!isMainWindowSender(event)) return;
  if (mainWindow.isMaximized()) {
    mainWindow.unmaximize();
  } else {
    mainWindow.maximize();
  }
});

ipcMain.on('window:close', (event) => {
  if (isMainWindowSender(event)) mainWindow.close();
});

ipcMain.handle('window:is-maximized', (event) => (
  isMainWindowSender(event) && mainWindow.isMaximized()
));

ipcMain.handle('updates:get-status', (event) => (
  isMainWindowSender(event) ? updateStatus : { status: 'idle' }
));

ipcMain.handle('updates:check', (event) => {
  if (!isMainWindowSender(event)) return;
  return checkForUpdates();
});

ipcMain.handle('updates:download', async (event) => {
  if (!isMainWindowSender(event) || updateStatus.status !== 'available') return;
  try {
    await autoUpdater.downloadUpdate();
  } catch (error) {
    console.error('Failed to download the NexaStrike update:', error);
    setUpdateStatus({ status: 'error' });
  }
});

ipcMain.on('updates:install', (event) => {
  if (isMainWindowSender(event) && updateStatus.status === 'downloaded') {
    autoUpdater.quitAndInstall();
  }
});

const buildDirectory = path.resolve(__dirname, '../build');
const localAppPort = 43127;
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const startLocalServer = () => {
  if (localServerUrl) return Promise.resolve(localServerUrl);

  return new Promise((resolve, reject) => {
    localServer = http.createServer((request, response) => {
      if (request.method !== 'GET' && request.method !== 'HEAD') {
        response.writeHead(405, { Allow: 'GET, HEAD' });
        response.end();
        return;
      }

      let pathname;
      try {
        pathname = decodeURIComponent(new URL(request.url || '/', 'http://127.0.0.1').pathname);
      } catch {
        response.writeHead(400);
        response.end('Invalid request path');
        return;
      }

      const requestedPath = path.resolve(buildDirectory, `.${pathname}`);
      if (requestedPath !== buildDirectory && !requestedPath.startsWith(`${buildDirectory}${path.sep}`)) {
        response.writeHead(403);
        response.end('Forbidden');
        return;
      }

      const sendFile = (filePath) => {
        fs.readFile(filePath, (error, content) => {
          if (error) {
            response.writeHead(error.code === 'ENOENT' ? 404 : 500);
            response.end(error.code === 'ENOENT' ? 'Not found' : 'Unable to read application file');
            return;
          }

          response.writeHead(200, {
            'Cache-Control': 'no-store',
            'Content-Length': content.length,
            'Content-Type': contentTypes[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
            'X-Content-Type-Options': 'nosniff',
          });
          response.end(request.method === 'HEAD' ? undefined : content);
        });
      };

      if (pathname === '/') {
        sendFile(path.join(buildDirectory, 'index.html'));
        return;
      }

      fs.stat(requestedPath, (error, stats) => {
        if (!error && stats.isFile()) {
          sendFile(requestedPath);
        } else if (request.headers.accept?.includes('text/html')) {
          sendFile(path.join(buildDirectory, 'index.html'));
        } else {
          response.writeHead(error && error.code !== 'ENOENT' ? 500 : 404);
          response.end(error && error.code !== 'ENOENT' ? 'Unable to read application file' : 'Not found');
        }
      });
    });

    localServer.once('error', reject);
    localServer.listen(localAppPort, '127.0.0.1', () => {
      localServer.removeListener('error', reject);
      localServerUrl = `http://127.0.0.1:${localAppPort}/`;
      resolve(localServerUrl);
    });
  });
};

const createWindow = async () => {
  Menu.setApplicationMenu(null);

  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    frame: false,
    autoHideMenuBar: true,
    icon: path.join(__dirname, 'nexastrike-icon.ico'),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      sandbox: true,
    },
  });
  const sendMaximizeState = () => {
    mainWindow.webContents.send('window:maximize-state', mainWindow.isMaximized());
  };
  mainWindow.on('maximize', sendMaximizeState);
  mainWindow.on('unmaximize', sendMaximizeState);

  const startUrl = process.env.ELECTRON_START_URL;
  await mainWindow.loadURL(startUrl || await startLocalServer());
};

if (app.requestSingleInstanceLock()) {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    await createWindow();
    if (app.isPackaged) {
      checkForUpdates();
      setInterval(checkForUpdates, 4 * 60 * 60 * 1000);
    }
  }).catch((error) => {
    console.error('Failed to start the NexaStrike desktop app:', error);
    app.quit();
  });
} else {
  app.quit();
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  localServer?.close();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow().catch((error) => {
      console.error('Failed to reopen the NexaStrike desktop app:', error);
      app.quit();
    });
  }
});
