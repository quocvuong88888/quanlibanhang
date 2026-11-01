const { app, BrowserWindow, Menu, dialog } = require('electron');
const path = require('path');
const http = require('http');

let mainWindow = null;
const PORT = process.env.PORT || 3000;

// Đảm bảo chỉ chạy 1 phiên bản duy nhất (Single Instance Lock)
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });
}

// Kiểm tra xem cổng PORT đã có server đang hoạt động hay chưa
function checkServerRunning(port) {
  return new Promise((resolve) => {
    const req = http.get(`http://localhost:${port}/api/products`, (res) => {
      resolve(true); // Đã có server đang phản hồi
    });
    req.on('error', () => {
      resolve(false); // Cổng trống hoặc server chưa chạy
    });
    req.setTimeout(800, () => {
      req.destroy();
      resolve(false);
    });
  });
}

// Khởi động Express Backend Server an toàn
async function startBackendServer() {
  const isRunning = await checkServerRunning(PORT);
  if (isRunning) {
    console.log(`⚡ Cổng ${PORT} đã có máy chủ hoạt động sẵn. Ứng dụng Desktop sẽ kết nối trực tiếp!`);
    return;
  }

  console.log('⚡ Đang khởi động Backend Server cho ứng dụng Desktop...');
  try {
    const { startServer } = require('./server');
    if (startServer) {
      await startServer(PORT);
    }

    // Chờ server phản hồi
    for (let i = 0; i < 20; i++) {
      await new Promise(r => setTimeout(r, 250));
      const ready = await checkServerRunning(PORT);
      if (ready) {
        console.log(`🚀 Backend Server đã sẵn sàng tại http://localhost:${PORT}`);
        break;
      }
    }
  } catch (err) {
    console.warn('Cảnh báo khi khởi tạo server:', err.message);
  }
}

// Tạo cửa sổ ứng dụng Desktop Electron
function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1366,
    height: 820,
    minWidth: 1024,
    minHeight: 700,
    title: 'ENERGY SPORTS POS - Hệ Thống Quản Lý Bán Hàng Dụng Cụ Thể Thao',
    icon: path.join(__dirname, 'public', 'images', 'icon.png'),
    backgroundColor: '#0f172a',
    show: false, // Ẩn cho đến khi sẵn sàng để tránh nhấp nháy trắng
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      enableRemoteModule: false
    }
  });

  // Nạp giao diện Web cục bộ
  mainWindow.loadURL(`http://localhost:${PORT}`);

  // Khi giao diện đã nạp xong thì hiển thị cửa sổ
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    mainWindow.focus();
  });

  // Thiết lập Native Desktop Menu
  createApplicationMenu();

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Xây dựng Menu Desktop chuyên nghiệp
function createApplicationMenu() {
  const template = [
    {
      label: 'Hệ Thống',
      submenu: [
        {
          label: '🛒 Bán Hàng POS (F4)',
          accelerator: 'F4',
          click: () => {
            if (mainWindow) mainWindow.webContents.executeJavaScript("App.switchView('pos')");
          }
        },
        {
          label: '🔍 Tìm Kiếm Sản Phẩm (F2)',
          accelerator: 'F2',
          click: () => {
            if (mainWindow) {
              mainWindow.webContents.executeJavaScript("App.switchView('pos'); setTimeout(() => document.getElementById('pos-search-input').focus(), 150);");
            }
          }
        },
        {
          label: '🔄 Đổi Trả Hàng (QD02)',
          click: () => {
            if (mainWindow) mainWindow.webContents.executeJavaScript("App.switchView('returns')");
          }
        },
        {
          label: '📥 Quản Lý Nhập Kho (QD05)',
          click: () => {
            if (mainWindow) mainWindow.webContents.executeJavaScript("App.switchView('inventory')");
          }
        },
        { type: 'separator' },
        {
          label: '🔒 Đăng Xuất Tài Khoản',
          click: () => {
            if (mainWindow) mainWindow.webContents.executeJavaScript("App.logout()");
          }
        },
        {
          label: 'Thoát Ứng Dụng',
          accelerator: 'Alt+F4',
          click: () => {
            app.quit();
          }
        }
      ]
    },
    {
      label: 'Giao Diện',
      submenu: [
        { role: 'reload', label: 'Tải Lại Giao Diện (Ctrl+R)' },
        { role: 'forceReload', label: 'Tải Lại Bỏ Cache' },
        {
          label: 'Công Cụ Nhà Phát Triển (DevTools)',
          accelerator: 'F12',
          click: () => {
            if (mainWindow) mainWindow.webContents.toggleDevTools();
          }
        },
        { type: 'separator' },
        { role: 'resetZoom', label: 'Phóng To Mặc Định' },
        { role: 'zoomIn', label: 'Phóng To (+)' },
        { role: 'zoomOut', label: 'Thu Nhỏ (-)' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Toàn Màn Hình (F11)' }
      ]
    },
    {
      label: 'Trợ Giúp',
      submenu: [
        {
          label: 'Thông Tin Đồ Án ENERGY STORE',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type: 'info',
              title: 'Hệ Thống Quản Lý Bán Hàng ENERGY',
              message: 'ENERGY SPORTS POS - Phiên bản Desktop Windows',
              detail: 'ĐH Sư Phạm TP.HCM (HCMUE) - Khoa Công nghệ Thông tin\n' +
                      'Học phần: Nhập môn Công nghệ Phần mềm\n' +
                      'Nhóm thực hiện: ENERGY (Vượng, An, Dương, Thuật)\n\n' +
                      'Cơ sở dữ liệu: Microsoft SQL Server (ENERGY_STORE_DB)\n' +
                      'Nền tảng: Electron + Node.js + Express + HTML5/CSS3/JS'
            });
          }
        }
      ]
    }
  ];

  const menu = Menu.buildFromTemplate(template);
  Menu.setApplicationMenu(menu);
}

// Khi Electron đã sẵn sàng
app.whenReady().then(async () => {
  try {
    await startBackendServer();
    createMainWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createMainWindow();
      }
    });
  } catch (err) {
    console.error('Lỗi khởi động ứng dụng Electron:', err);
    app.quit();
  }
});

// Thoát khi tất cả cửa sổ đóng lại
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// Clean up khi thoát
app.on('will-quit', () => {
  console.log('⚡ Đang đóng ứng dụng Desktop...');
  process.exit(0);
});
