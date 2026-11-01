// COD Delivery & Return Management (BM05, QD02, QD04)

// 1. Quản lý Vận đơn COD & Đối soát Kế toán (QD04)
const CodModule = {
  deliveries: [],

  async init() {
    await this.loadDeliveries();
  },

  async loadDeliveries() {
    try {
      const res = await App.api('/cod/deliveries');
      this.deliveries = res.data;
      const s = res.summary;

      // Stats
      document.getElementById('cod-stat-shipping').textContent = App.formatVND(s.TongTienDangGiao);
      document.getElementById('cod-stat-pending').textContent = `${App.formatVND(s.TongTienChoDoiSoat)} (${s.SoDonChoDoiSoat || 0} đơn)`;
      document.getElementById('cod-stat-reconciled').textContent = App.formatVND(s.TongTienDaDoiSoat);

      this.renderTable();
    } catch (err) {
      console.error('Lỗi tải vận đơn COD:', err);
    }
  },

  renderTable() {
    const tbody = document.getElementById('cod-table-tbody');
    if (!this.deliveries.length) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Không có vận đơn COD nào.</td></tr>';
      return;
    }

    const isAccountant = App.user && (App.user.MaVaiTro === 4 || App.user.MaVaiTro === 1 || App.user.MaVaiTro === 5);

    tbody.innerHTML = this.deliveries.map(d => {
      let badgeClass = 'badge-info';
      if (d.TrangThai === 'Thành công') badgeClass = 'badge-warning';
      if (d.TrangThai === 'Đã đối soát') badgeClass = 'badge-success';
      if (d.TrangThai === 'Hủy/Hoàn trả') badgeClass = 'badge-danger';

      return `
        <tr>
          <td><strong>#COD${d.MaGiaoHang}</strong></td>
          <td>#HD${d.MaHoaDon}</td>
          <td>
            <strong>${d.DonViVanChuyen}</strong>
            <div style="font-size: 0.75rem; color: var(--text-muted);">${d.MaTracking || 'Chưa có mã'}</div>
          </td>
          <td>
            ${d.TenKhachHang || 'Khách online'}
            <div style="font-size: 0.75rem; color: var(--text-muted);">${d.SdtKhachHang || ''}</div>
          </td>
          <td style="max-width: 200px; font-size: 0.8rem;">${d.DiaChiGiao}</td>
          <td style="font-weight: 700; color: var(--danger);">${App.formatVND(d.TienThuHo)}</td>
          <td><span class="badge ${badgeClass}">${d.TrangThai}</span></td>
          <td style="font-size: 0.8rem;">${d.NgayDoiSoat ? App.formatDate(d.NgayDoiSoat) : '-'}</td>
          <td>
            ${d.TrangThai === 'Đang giao' ? `
              <button class="btn btn-secondary btn-sm" onclick="CodModule.updateStatus(${d.MaGiaoHang}, 'Thành công')">Đã giao thành công</button>
            ` : ''}

            ${d.TrangThai === 'Thành công' && isAccountant ? `
              <button class="btn btn-success btn-sm" onclick="CodModule.reconcile(${d.MaGiaoHang})">
                ✓ Đối soát tiền (QD04)
              </button>
            ` : ''}

            ${d.TrangThai === 'Đã đối soát' ? `
              <span style="color: var(--success); font-weight: 600; font-size: 0.8rem;">Đã chốt sổ</span>
            ` : ''}
          </td>
        </tr>
      `;
    }).join('');
  },

  async updateStatus(deliveryId, newStatus) {
    try {
      await App.api(`/cod/deliveries/${deliveryId}`, {
        method: 'PUT',
        body: JSON.stringify({ TrangThai: newStatus })
      });
      App.showToast(`Cập nhật vận đơn sang trạng thái: ${newStatus}`, 'success');
      this.loadDeliveries();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async reconcile(deliveryId) {
    if (!confirm(`Xác nhận đối soát tiền thu hộ COD cho đơn #COD${deliveryId}? Tiền sẽ được chốt vào báo cáo kế toán theo QD04.`)) return;

    try {
      const res = await App.api(`/cod/deliveries/${deliveryId}/reconcile`, { method: 'POST' });
      App.showToast(res.message, 'success');
      this.loadDeliveries();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};

// 2. Xử lý Đổi Trả Hàng Hóa (QD02)
const ReturnModule = {
  currentInvoice: null,

  async init() {
    this.loadHistory();
  },

  async searchInvoice() {
    const invId = document.getElementById('return-invoice-id').value;
    if (!invId) {
      App.showToast('Vui lòng nhập mã hóa đơn cần đổi trả.', 'warning');
      return;
    }

    try {
      const res = await App.api(`/invoices/${invId}`);
      this.currentInvoice = res.data;
      this.renderInvoiceDetails();
    } catch (err) {
      App.showToast('Không tìm thấy hóa đơn hoặc ' + err.message, 'error');
    }
  },

  renderInvoiceDetails() {
    const inv = this.currentInvoice;
    const container = document.getElementById('return-invoice-details');
    container.style.display = 'block';

    document.getElementById('ret-inv-id').textContent = `#HD${inv.MaHoaDon}`;
    document.getElementById('ret-inv-date').textContent = App.formatDate(inv.NgayLap);
    document.getElementById('ret-inv-cust').textContent = inv.TenKhachHang || 'Khách vãng lai';

    // Kiểm tra thời hạn 7 ngày theo QD02
    const invDate = new Date(inv.NgayLap);
    const now = new Date();
    const diffDays = Math.ceil((now - invDate) / (1000 * 60 * 60 * 24));

    const badgeEl = document.getElementById('ret-inv-validity');
    if (diffDays <= 7) {
      badgeEl.className = 'badge badge-success';
      badgeEl.textContent = `Hợp lệ (Mua cách đây ${diffDays} ngày &le; 7 ngày)`;
    } else {
      badgeEl.className = 'badge badge-danger';
      badgeEl.textContent = `Quá hạn (Mua cách đây ${diffDays} ngày > 7 ngày)`;
    }

    const tbody = document.getElementById('ret-items-tbody');
    tbody.innerHTML = inv.items.map(it => `
      <tr data-sp-id="${it.MaSanPham}" data-unit-price="${it.DonGia}">
        <td><strong>${it.TenSanPham}</strong></td>
        <td>${it.SoLuong} ${it.DonViTinh}</td>
        <td>${App.formatVND(it.DonGia)}</td>
        <td>${App.formatVND(it.ThanhTien)}</td>
        <td>
          <input type="number" class="form-control ret-qty-input" value="0" min="0" max="${it.SoLuong}" 
                 oninput="ReturnModule.calcRefund()">
        </td>
      </tr>
    `).join('');

    this.calcRefund();
  },

  calcRefund() {
    let totalRefund = 0;
    const rows = document.querySelectorAll('#ret-items-tbody tr');

    rows.forEach(r => {
      const price = Number(r.getAttribute('data-unit-price')) || 0;
      const qty = Number(r.querySelector('.ret-qty-input').value) || 0;
      totalRefund += price * qty;
    });

    // Điểm bị trừ tương ứng 1% (QD02)
    const pointsDeduct = Math.floor((totalRefund * 0.01) / 1000);

    document.getElementById('ret-total-refund').textContent = App.formatVND(totalRefund);
    document.getElementById('ret-points-deduct').textContent = pointsDeduct;
    this.currentTotalRefund = totalRefund;
  },

  async submitReturn() {
    if (!this.currentTotalRefund || this.currentTotalRefund <= 0) {
      App.showToast('Vui lòng nhập số lượng sản phẩm cần đổi trả lớn hơn 0.', 'warning');
      return;
    }

    const rows = document.querySelectorAll('#ret-items-tbody tr');
    const items = [];
    rows.forEach(r => {
      const qty = Number(r.querySelector('.ret-qty-input').value) || 0;
      if (qty > 0) {
        items.push({
          MaSanPham: Number(r.getAttribute('data-sp-id')),
          SoLuongDoiTra: qty
        });
      }
    });

    const payload = {
      MaHoaDon: this.currentInvoice.MaHoaDon,
      items,
      LyDo: document.getElementById('ret-reason').value || 'Khách đổi trả theo quy định'
    };

    try {
      const res = await App.api('/returns', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      App.showToast(res.message, 'success');
      document.getElementById('return-invoice-details').style.display = 'none';
      document.getElementById('return-invoice-id').value = '';
      this.loadHistory();
      if (ProductModule) ProductModule.loadProducts();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async loadHistory() {
    try {
      const res = await App.api('/returns');
      const tbody = document.getElementById('ret-history-tbody');
      if (!res.data.length) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--text-muted); padding: 1rem;">Chưa có đơn đổi trả nào.</td></tr>';
        return;
      }

      tbody.innerHTML = res.data.map(d => `
        <tr>
          <td><strong>#DT${d.MaDoiTra}</strong></td>
          <td>#HD${d.MaHoaDon}</td>
          <td>${d.TenNhanVien}</td>
          <td>${App.formatDate(d.NgayDoiTra)}</td>
          <td>${d.LyDo}</td>
          <td style="color: var(--danger); font-weight: 700;">${App.formatVND(d.TongTienHoan)}</td>
          <td style="color: var(--warning); font-weight: 600;">-${d.DiemTru} điểm</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Lỗi tải lịch sử đổi trả:', err);
    }
  }
};

