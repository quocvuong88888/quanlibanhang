require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const { initDatabase } = require('./database/db');
const apiRoutes = require('./src/routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Static files (Web UI)
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.use('/api', apiRoutes);

// SPA fallback: any page route returns index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({
    success: false,
    message: 'Đã xảy ra lỗi nội bộ trên hệ thống.',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

let server = null;

const startServer = (port = PORT) => {
  return new Promise((resolve, reject) => {
    initDatabase()
      .then(() => {
        server = app.listen(port, () => {
          console.log('================================================================');
          console.log(`⚡ CÔNG TY TNHH THỂ THAO ENERGY - HỆ THỐNG QUẢN LÝ BÁN HÀNG ⚡`);
          console.log(`🚀 Web Application đang chạy tại: http://localhost:${port}`);
          console.log(`📚 ĐH Sư Phạm TP.HCM - Khoa CNTT - Môn Nhập môn CNPM`);
          console.log('================================================================');
          resolve(server);
        });

        // Bắt lỗi EADDRINUSE để tránh crash ứng dụng khi cổng bị trùng
        server.on('error', (err) => {
          if (err.code === 'EADDRINUSE') {
            console.warn(`⚠️ Cổng ${port} đã có tiến trình sử dụng. Đang kết nối tới máy chủ hiện hữu...`);
            resolve(null);
          } else {
            console.error('Lỗi khởi động server:', err);
            reject(err);
          }
        });
      })
      .catch((err) => {
        console.error('Lỗi khởi động CSDL:', err);
        reject(err);
      });
  });
};

// Nếu chạy trực tiếp từ dòng lệnh: node server.js
if (require.main === module) {
  startServer().catch(() => process.exit(1));
}

module.exports = { app, startServer, getServer: () => server };
