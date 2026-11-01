// Reports, Customers & Promotions Module (BM04, BM06, QD05)

// 1. Khách Hàng & Khuyến Mãi
const CustomerModule = {
  customers: [],
  promotions: [],

  async init() {
    await this.loadCustomers();
    await this.loadPromotions();
  },

  async loadCustomers() {
    try {
      const kw = document.getElementById('cust-search') ? document.getElementById('cust-search').value : '';
      const res = await App.api(`/customers?keyword=${encodeURIComponent(kw)}`);
      this.customers = res.data;
      this.renderCustomerTable();
    } catch (err) {
      console.error('Lỗi tải khách hàng:', err);
    }
  },

  renderCustomerTable() {
    const tbody = document.getElementById('cust-table-tbody');
    if (!tbody) return;

    if (!this.customers.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Không có khách hàng nào.</td></tr>';
      return;
    }

    tbody.innerHTML = this.customers.map(c => `
      <tr>
        <td>#KH${c.MaKhachHang}</td>
        <td><strong>${c.HoTen}</strong></td>
        <td>${c.SoDienThoai}</td>
        <td>${c.Email || '-'}</td>
        <td style="color: var(--success); font-weight: 700;">${c.DiemTichLuy} điểm</td>
      </tr>
    `).join('');
  },

  async handleSubmitNew(e) {
    e.preventDefault();
    const payload = {
      HoTen: document.getElementById('cust-name-input').value,
      SoDienThoai: document.getElementById('cust-phone-input').value,
      Email: document.getElementById('cust-email-input').value,
      DiaChi: document.getElementById('cust-address-input').value
    };

    try {
      const res = await App.api('/customers', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      App.showToast('Thêm khách hàng mới thành công!', 'success');
      App.closeModal('modal-customer');

      // If at POS, auto select
      if (document.getElementById('pos-customer-phone')) {
        document.getElementById('pos-customer-phone').value = payload.SoDienThoai;
        POS.lookupCustomer(payload.SoDienThoai);
      }

      this.loadCustomers();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async loadPromotions() {
    try {
      const res = await App.api('/promotions');
      this.promotions = res.data;
      this.renderPromoTable();
    } catch (err) {
      console.error('Lỗi tải khuyến mãi:', err);
    }
  },

  renderPromoTable() {
    const tbody = document.getElementById('promo-table-tbody');
    if (!tbody) return;

    if (!this.promotions.length) {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1rem;">Chưa có mã khuyến mãi nào.</td></tr>';
      return;
    }

    tbody.innerHTML = this.promotions.map(p => `
      <tr>
        <td><code>${p.MaCode}</code></td>
        <td>${p.TenKhuyenMai}</td>
        <td><span class="badge badge-success">-${p.PhanTramGiam}%</span></td>
        <td style="font-size: 0.78rem;">${p.NgayKetThuc.split('T')[0]}</td>
      </tr>
    `).join('');
  },

  openPromoModal() {
    const code = prompt('Nhập Mã khuyến mãi mới (VD: ENERGY20):');
    if (!code) return;
    const name = prompt('Nhập Tên chương trình:');
    if (!name) return;
    const pct = prompt('Nhập phần trăm giảm giá (1 - 100):');
    if (!pct) return;

    this.createPromotion(code, name, pct);
  },

  async createPromotion(code, name, pct) {
    try {
      await App.api('/promotions', {
        method: 'POST',
        body: JSON.stringify({
          MaCode: code.toUpperCase(),
          TenKhuyenMai: name,
          PhanTramGiam: Number(pct),
          NgayBatDau: new Date().toISOString(),
          NgayKetThuc: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        })
      });
      App.showToast('Tạo chương trình khuyến mãi thành công (Đã duyệt bởi Giám đốc theo QD05)!', 'success');
      this.loadPromotions();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};

// 2. Báo Cáo Doanh Thu & Lợi Nhuận Gộp (BM06)
const ReportModule = {
  chartInstance: null,

  async init() {
    const today = new Date().toISOString().split('T')[0];
    const pastMonth = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    document.getElementById('rep-from-date').value = pastMonth;
    document.getElementById('rep-to-date').value = today;

    await this.loadReport();
  },

  async loadReport() {
    const from = document.getElementById('rep-from-date').value;
    const to = document.getElementById('rep-to-date').value;

    try {
      const res = await App.api(`/reports/revenue?fromDate=${from}&toDate=${to}`);
      const data = res.data;

      // Render Chart
      this.renderDetailedChart(data.daily);

      // Render Top 5 Products
      const topTbody = document.getElementById('rep-top-tbody');
      if (!data.topProducts.length) {
        topTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--text-muted); padding: 1rem;">Chưa có dữ liệu bán hàng trong kỳ.</td></tr>';
      } else {
        topTbody.innerHTML = data.topProducts.map(p => `
          <tr>
            <td><strong>${p.TenSanPham}</strong></td>
            <td>${p.DonViTinh}</td>
            <td style="color: var(--primary); font-weight: bold;">${p.TongSoLuongBan}</td>
            <td style="font-weight: 700;">${App.formatVND(p.TongDoanhThuSp)}</td>
          </tr>
        `).join('');
      }

      // Render Low Stock Warning
      const lowTbody = document.getElementById('rep-low-tbody');
      if (!data.lowStockProducts.length) {
        lowTbody.innerHTML = '<tr><td colspan="4" style="text-align: center; color: var(--success); padding: 1rem;">Tất cả sản phẩm đều có số lượng an toàn (&gt;5).</td></tr>';
      } else {
        lowTbody.innerHTML = data.lowStockProducts.map(p => `
          <tr>
            <td><strong>${p.TenSanPham}</strong></td>
            <td>${p.TenDanhMuc}</td>
            <td><span class="badge badge-danger">${p.SoLuongTon} ${p.DonViTinh}</span></td>
            <td><span style="color: var(--danger); font-size: 0.8rem; font-weight: bold;">Cần nhập bổ sung</span></td>
          </tr>
        `).join('');
      }
    } catch (err) {
      console.error('Lỗi tải báo cáo doanh thu:', err);
    }
  },

  renderDetailedChart(daily) {
    const labels = daily.map(d => d.Ngay);
    const revenues = daily.map(d => d.DoanhThu);
    const costs = daily.map(d => d.GiaVon);
    const profits = daily.map(d => d.LoiNhuanGop);

    const ctx = document.getElementById('detailedRevenueChart').getContext('2d');
    if (this.chartInstance) {
      this.chartInstance.destroy();
    }

    this.chartInstance = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels.length ? labels : ['Hôm nay'],
        datasets: [
          {
            label: 'Doanh thu (VNĐ)',
            data: revenues.length ? revenues : [0],
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.1)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'Giá vốn hàng bán (VNĐ)',
            data: costs.length ? costs : [0],
            borderColor: '#f97316',
            backgroundColor: 'transparent',
            borderDash: [5, 5],
            tension: 0.3
          },
          {
            label: 'Lợi nhuận gộp (VNĐ)',
            data: profits.length ? profits : [0],
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3
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
  }
};

