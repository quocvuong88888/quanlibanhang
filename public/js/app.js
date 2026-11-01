// Application State & Main Controller
const App = {
  token: localStorage.getItem('energy_token') || null,
  user: JSON.parse(localStorage.getItem('energy_user') || 'null'),
  currentView: 'dashboard',
  revenueChartInstance: null,

  init() {
    this.bindEvents();
    if (this.token && this.user) {
      this.showApp();
    } else {
      this.showLogin();
    }
  },

  bindEvents() {
    // Navigation links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', (e) => {
        const view = e.currentTarget.getAttribute('data-view');
        this.switchView(view);
      });
    });

    // Global Keyboard Shortcuts (Lab 4 / YCCL02)
    window.addEventListener('keydown', (e) => {
      if (e.key === 'F2') {
        e.preventDefault();
        const searchInput = document.getElementById('pos-search-input');
        if (searchInput) {
          this.switchView('pos');
          searchInput.focus();
        }
      } else if (e.key === 'F4') {
        e.preventDefault();
        if (this.currentView === 'pos') {
          POS.checkout();
        }
      } else if (e.key === 'Escape') {
        document.querySelectorAll('.modal-overlay').forEach(m => m.style.display = 'none');
      }
    });
  },

  // API Client Helper
  async api(endpoint, options = {}) {
    const headers = {
      'Content-Type': 'application/json',
      ...(this.token ? { 'Authorization': `Bearer ${this.token}` } : {})
    };

    try {
      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers: { credentials: 'omit', ...headers, ...options.headers }
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401) {
          this.logout();
          this.showToast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại.', 'error');
        }
        throw new Error(data.message || 'Lỗi xử lý yêu cầu.');
      }
      return data;
    } catch (err) {
      console.error(`API Error [${endpoint}]:`, err.message);
      throw err;
    }
  },

  // Toast Notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    container.appendChild(toast);
    setTimeout(() => {
      toast.remove();
    }, 4000);
  },

  // Modal helpers
  openModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'flex';
  },

  closeModal(id) {
    const el = document.getElementById(id);
    if (el) el.style.display = 'none';
  },

  // Authentication
  async handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('login-username').value;
    const password = document.getElementById('login-password').value;

    try {
      const res = await this.api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });

      this.token = res.token;
      this.user = res.user;
      localStorage.setItem('energy_token', this.token);
      localStorage.setItem('energy_user', JSON.stringify(this.user));

      this.showToast(`Chào mừng ${this.user.HoTen} (${this.user.TenVaiTro})!`, 'success');
      this.showApp();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  async quickLogin(username, password) {
    document.getElementById('login-username').value = username;
    document.getElementById('login-password').value = password;
    try {
      const res = await this.api('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username, password })
      });
      this.token = res.token;
      this.user = res.user;
      localStorage.setItem('energy_token', this.token);
      localStorage.setItem('energy_user', JSON.stringify(this.user));

      this.showToast(`Đã chuyển sang vai trò: ${this.user.TenVaiTro}`, 'success');
      this.showApp();
    } catch (err) {
      this.showToast(err.message, 'error');
    }
  },

  logout() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('energy_token');
    localStorage.removeItem('energy_user');
    this.showLogin();
  },

  showLogin() {
    document.getElementById('app-navbar').style.display = 'none';
    document.getElementById('demo-switcher').style.display = 'none';
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    document.getElementById('view-login').style.display = 'block';
  },

  showApp() {
    document.getElementById('app-navbar').style.display = 'flex';
    document.getElementById('demo-switcher').style.display = 'flex';
    document.getElementById('nav-user-name').textContent = this.user.HoTen;
    document.getElementById('nav-user-role').textContent = this.user.TenVaiTro;

    // Apply role permission visibility on menu links
    this.filterMenuByRole();
    this.switchView('dashboard');
  },

  filterMenuByRole() {
    const roleId = this.user.MaVaiTro; // 1: Giám đốc, 2: Thu ngân, 3: Thủ kho, 4: Kế toán, 5: Admin
    const permissions = this.user.permissions || [];

    document.querySelectorAll('#main-nav-links .nav-link').forEach(link => {
      const view = link.getAttribute('data-view');
      let visible = true;

      if (roleId === 1 || roleId === 5) {
        visible = true; // Giám đốc & Admin thấy toàn bộ
      } else if (roleId === 2) {
        // Thu ngân: chỉ thấy Tổng quan, POS, Đổi trả, Khách hàng
        visible = ['dashboard', 'pos', 'returns', 'customers'].includes(view);
      } else if (roleId === 3) {
        // Thủ kho: chỉ thấy Tổng quan, Sản phẩm, Nhập kho, Kiểm kê
        visible = ['dashboard', 'products', 'inventory', 'stock-check'].includes(view);
      } else if (roleId === 4) {
        // Kế toán: chỉ thấy Tổng quan, COD, Báo cáo
        visible = ['dashboard', 'cod', 'reports'].includes(view);
      }

      link.parentElement.style.display = visible ? 'block' : 'none';
    });
  },

  switchView(viewName) {
    this.currentView = viewName;
    document.querySelectorAll('main > section').forEach(s => s.style.display = 'none');
    const target = document.getElementById(`view-${viewName}`);
    if (target) {
      target.style.display = 'block';
    }

    // Update active nav link
    document.querySelectorAll('.nav-link').forEach(l => {
      l.classList.toggle('active', l.getAttribute('data-view') === viewName);
    });

    // Trigger module data loaders
    switch (viewName) {
      case 'dashboard':
        this.loadDashboardData();
        break;
      case 'pos':
        POS.init();
        break;
      case 'returns':
        ReturnModule.init();
        break;
      case 'products':
        ProductModule.init();
        break;
      case 'inventory':
        InventoryModule.init();
        break;
      case 'stock-check':
        StockCheckModule.init();
        break;
      case 'cod':
        CodModule.init();
        break;
      case 'customers':
        CustomerModule.init();
        break;
      case 'reports':
        ReportModule.init();
        break;
      case 'admin':
        AdminModule.init();
        break;
    }
  },

  // Formatters
  formatVND(amount) {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  },

  formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleString('vi-VN', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    });
  },

  // Dashboard Data Loader
  async loadDashboardData() {
    try {
      const res = await this.api('/reports/summary');
      const d = res.data;

      document.getElementById('dash-today-revenue').textContent = this.formatVND(d.doanhThuHomNay);
      document.getElementById('dash-today-orders').textContent = d.soDonHomNay;
      document.getElementById('dash-gross-profit').textContent = this.formatVND(d.loiNhuanGop);
      document.getElementById('dash-cod-pending').textContent = `${d.soDonCodChoDoiSoat} đơn (${this.formatVND(d.tienCodChoDoiSoat)})`;
      document.getElementById('dash-low-stock').textContent = d.soSanPhamCanhBaoTon;

      // Render Dashboard Notifications
      const notifContainer = document.getElementById('dash-notifications');
      let notifHtml = '';

      if (d.soPhieuNhapChoDuyet > 0) {
        notifHtml += `
          <div style="background: #fefce8; border-left: 4px solid #facc15; padding: 0.6rem; margin-bottom: 0.5rem; border-radius: 4px;">
            <strong>⚠️ Có ${d.soPhieuNhapChoDuyet} phiếu nhập kho vượt hạn mức (QD05)</strong> đang chờ Giám đốc duyệt!
            <br><a href="javascript:void(0)" onclick="App.switchView('inventory')" style="color: var(--primary); font-weight: 600;">Xem chi tiết & phê duyệt &rarr;</a>
          </div>
        `;
      }

      if (d.soDonCodChoDoiSoat > 0) {
        notifHtml += `
          <div style="background: #eff6ff; border-left: 4px solid #3b82f6; padding: 0.6rem; margin-bottom: 0.5rem; border-radius: 4px;">
            <strong>🚚 Có ${d.soDonCodChoDoiSoat} đơn giao hàng COD thành công</strong> chờ Kế toán đối soát cuối ngày (QD04).
            <br><a href="javascript:void(0)" onclick="App.switchView('cod')" style="color: var(--primary); font-weight: 600;">Tiến hành đối soát &rarr;</a>
          </div>
        `;
      }

      if (d.soSanPhamCanhBaoTon > 0) {
        notifHtml += `
          <div style="background: #fef2f2; border-left: 4px solid #ef4444; padding: 0.6rem; border-radius: 4px;">
            <strong>⚠️ ${d.soSanPhamCanhBaoTon} sản phẩm sắp hết hàng trong kho (tồn &le; 5)</strong>. Thủ kho cần lập phiếu nhập bổ sung.
            <br><a href="javascript:void(0)" onclick="App.switchView('products')" style="color: var(--danger); font-weight: 600;">Xem danh sách tồn thấp &rarr;</a>
          </div>
        `;
      }

      if (!notifHtml) {
        notifHtml = '<p style="color: var(--success); font-weight: 600;">✅ Tất cả nghiệp vụ đang hoạt động ổn định. Không có tồn đọng phê duyệt.</p>';
      }
      notifContainer.innerHTML = notifHtml;

      // Load Chart
      this.loadDashboardChart();
    } catch (err) {
      console.error('Lỗi tải dữ liệu dashboard:', err);
    }
  },

  async loadDashboardChart() {
    try {
      const res = await this.api('/reports/revenue');
      const daily = res.data.daily;

      const labels = daily.map(item => item.Ngay);
      const revenues = daily.map(item => item.DoanhThu);
      const profits = daily.map(item => item.LoiNhuanGop);

      const ctx = document.getElementById('dashboardRevenueChart').getContext('2d');
      if (this.revenueChartInstance) {
        this.revenueChartInstance.destroy();
      }

      this.revenueChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
          labels: labels.length ? labels : ['Hôm nay'],
          datasets: [
            {
              label: 'Doanh thu (VNĐ)',
              data: revenues.length ? revenues : [0],
              backgroundColor: 'rgba(37, 99, 235, 0.75)',
              borderColor: '#2563eb',
              borderWidth: 1
            },
            {
              label: 'Lợi nhuận gộp (VNĐ)',
              data: profits.length ? profits : [0],
              backgroundColor: 'rgba(16, 185, 129, 0.75)',
              borderColor: '#10b981',
              borderWidth: 1
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'top' }
          },
          scales: {
            y: {
              beginAtZero: true,
              ticks: {
                callback: function(val) {
                  return (val / 1000000).toFixed(1) + ' tr';
                }
              }
            }
          }
        }
      });
    } catch (err) {
      console.error('Lỗi tải biểu đồ dashboard:', err);
    }
  }
};

window.addEventListener('DOMContentLoaded', () => {
  App.init();
});

