const { app, BrowserWindow, screen, ipcMain, Menu } = require('electron');
const path = require('path');

let mainWindow;
let customerDisplayWindow;

const APP_URL = process.env.POS_URL || 'https://ais-pre-babxvblqn6eoky52glnhsu-656316083606.asia-southeast1.run.app';

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: 'Talk of the Town POS — Road Not Taken',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  mainWindow.loadURL(APP_URL);

  // Native Menu Bar with POS Accelerators
  const template = [
    {
      label: 'File',
      submenu: [
        { label: 'Print Active Receipt', accelerator: 'CmdOrCtrl+P', click: () => mainWindow.webContents.send('trigger-print') },
        { label: 'Sync Edge Database', accelerator: 'F5', click: () => mainWindow.webContents.send('trigger-sync') },
        { type: 'separator' },
        { role: 'quit' }
      ]
    },
    {
      label: 'POS Navigation',
      submenu: [
        { label: 'Cashier POS', accelerator: 'F1', click: () => mainWindow.webContents.send('nav-tab', 'cashier') },
        { label: 'Customer Kiosk', accelerator: 'F2', click: () => mainWindow.webContents.send('nav-tab', 'kiosk') },
        { label: 'Floor & Tables', accelerator: 'F3', click: () => mainWindow.webContents.send('nav-tab', 'tables') },
        { label: 'Kitchen KDS', accelerator: 'F4', click: () => mainWindow.webContents.send('nav-tab', 'kds') },
        { label: 'Stock & BOM', accelerator: 'F6', click: () => mainWindow.webContents.send('nav-tab', 'inventory') },
        { label: 'Procurement & Inward', accelerator: 'F7', click: () => mainWindow.webContents.send('nav-tab', 'procurement') },
        { label: 'Staff & Salary', accelerator: 'F8', click: () => mainWindow.webContents.send('nav-tab', 'salary') },
        { label: 'Shift & Z-Report', accelerator: 'F9', click: () => mainWindow.webContents.send('nav-tab', 'shifts') },
        { label: 'Rule Book & SOP', accelerator: 'F10', click: () => mainWindow.webContents.send('nav-tab', 'rules') }
      ]
    },
    {
      label: 'Hardware & Display',
      submenu: [
        {
          label: 'Launch Secondary Customer Display (CFD)',
          click: () => openCustomerDisplay()
        },
        {
          label: 'Toggle Fullscreen Kiosk Mode',
          accelerator: 'F11',
          click: () => mainWindow.setFullScreen(!mainWindow.isFullScreen())
        }
      ]
    },
    {
      label: 'Help',
      submenu: [
        { label: 'Keyboard Shortcuts Cheatsheet', accelerator: '?', click: () => mainWindow.webContents.send('show-shortcuts') }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (customerDisplayWindow) {
      customerDisplayWindow.close();
    }
  });
}

// Multi-Screen: Dual-display customer facing terminal
function openCustomerDisplay() {
  const displays = screen.getAllDisplays();
  const externalDisplay = displays.find(d => d.bounds.x !== 0 || d.bounds.y !== 0);

  if (customerDisplayWindow) {
    customerDisplayWindow.focus();
    return;
  }

  const options = {
    width: 1024,
    height: 768,
    title: 'Talk of the Town — Customer Facing Display',
    backgroundColor: '#0f172a',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    }
  };

  if (externalDisplay) {
    options.x = externalDisplay.bounds.x;
    options.y = externalDisplay.bounds.y;
    options.fullscreen = true;
  }

  customerDisplayWindow = new BrowserWindow(options);
  customerDisplayWindow.loadURL(APP_URL + '?mode=cfd');

  customerDisplayWindow.on('closed', () => {
    customerDisplayWindow = null;
  });
}

app.whenReady().then(createMainWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});
