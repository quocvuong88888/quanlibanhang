// Inventory & Products & Stock Check Module (BM02, QD01, QD03, QD05)

// 1. Quản lý Sản phẩm (Thủ kho)
const ProductModule = {
  products: [],
  categories: [],
  brands: [],

  async init() {
    await this.loadCatalogs();
    await this.loadProducts();
  },

  async loadCatalogs() {
    try {
      const [catRes, brandRes] = await Promise.all([
        App.api('/categories'),
        App.api('/brands')
      ]);
      this.categories = catRes.data;
      this.brands = brandRes.data;

      // Filter selects
      const catSelect = document.getElementById('prod-filter-cat');
      catSelect.innerHTML = '<option value="">Tất cả danh mục</option>' + 
        this.categories.map(c => `<option value="${c.MaDanhMuc}">${c.TenDanhMuc}</option>`).join('');

      const brandSelect = document.getElementById('prod-filter-brand');
      brandSelect.innerHTML = '<option value="">Tất cả thương hiệu</option>' + 
        this.brands.map(b => `<option value="${b.MaThuongHieu}">${b.TenThuongHieu}</option>`).join('');

      // Modal selects
      document.getElementById('prod-cat-input').innerHTML = 
        this.categories.map(c => `<option value="${c.MaDanhMuc}">${c.TenDanhMuc}</option>`).join('');
      document.getElementById('prod-brand-input').innerHTML = 
        this.brands.map(b => `<option value="${b.MaThuongHieu}">${b.TenThuongHieu}</option>`).join('');
    } catch (err) {
      console.error('Lỗi tải danh mục/thương hiệu:', err);
    }
  },

  async loadProducts() {
    try {
      const keyword = document.getElementById('prod-search').value;
      const cat = document.getElementById('prod-filter-cat').value;
      const brand = document.getElementById('prod-filter-brand').value;
      const lowStock = document.getElementById('prod-filter-low').checked;

      let url = '/products?';
      if (keyword) url += `keyword=${encodeURIComponent(keyword)}&`;
      if (cat) url += `categoryId=${cat}&`;
      if (brand) url += `brandId=${brand}&`;
      if (lowStock) url += `lowStock=true&`;

      const res = await App.api(url);
      this.products = res.data;
      this.renderTable();
    } catch (err) {
      console.error('Lỗi tải sản phẩm:', err);
    }
  },

  renderTable() {
    const tbody = document.getElementById('prod-table-tbody');
    if (!this.products.length) {
      tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Không tìm thấy sản phẩm nào.</td></tr>';
      return;
    }

    tbody.innerHTML = this.products.map(p => {
      const isLowStock = p.SoLuongTon <= 5;
      return `
        <tr>
          <td>#${p.MaSanPham}</td>
          <td><strong>${p.TenSanPham}</strong></td>
          <td>${p.TenDanhMuc}</td>
          <td>${p.TenThuongHieu}</td>
          <td>${App.formatVND(p.GiaNhap)}</td>
          <td style="color: var(--primary); font-weight: 600;">${App.formatVND(p.GiaBanLe)}</td>
          <td style="color: var(--accent); font-weight: 600;">${App.formatVND(p.GiaBanSi)}</td>
          <td>
            <span class="badge ${isLowStock ? 'badge-danger' : 'badge-success'}">
              ${p.SoLuongTon} ${isLowStock ? '(Sắp hết!)' : ''}
            </span>
          </td>
          <td>${p.DonViTinh}</td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="ProductModule.openEditModal(${p.MaSanPham})">Sửa</button>
            <button class="btn btn-danger btn-sm" onclick="ProductModule.deleteProduct(${p.MaSanPham})">Xóa</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openAddModal() {
    document.getElementById('prod-modal-title').textContent = 'Thêm Sản Phẩm Dụng Cụ Mới';
    document.getElementById('prod-id-input').value = '';
    document.getElementById('prod-name-input').value = '';
    document.getElementById('prod-cost-input').value = '';
    document.getElementById('prod-retail-input').value = '';
    document.getElementById('prod-wholesale-input').value = '';
    document.getElementById('prod-stock-input').value = '10';
    document.getElementById('prod-unit-input').value = 'Cái';
    App.openModal('modal-product');
  },

  openEditModal(id) {
    const p = this.products.find(item => item.MaSanPham === id);
    if (!p) return;

    document.getElementById('prod-modal-title').textContent = `Chỉnh Sửa Sản Phẩm #${p.MaSanPham}`;
    document.getElementById('prod-id-input').value = p.MaSanPham;
    document.getElementById('prod-name-input').value = p.TenSanPham;
    document.getElementById('prod-cat-input').value = p.MaDanhMuc;
    document.getElementById('prod-brand-input').value = p.MaThuongHieu;
    document.getElementById('prod-cost-input').value = p.GiaNhap;
    document.getElementById('prod-retail-input').value = p.GiaBanLe;
    document.getElementById('prod-wholesale-input').value = p.GiaBanSi;
    document.getElementById('prod-stock-input').value = p.SoLuongTon;
    document.getElementById('prod-unit-input').value = p.DonViTinh;
    App.openModal('modal-product');
  },

  async handleSubmit(e) {
    e.preventDefault();
    const id = document.getElementById('prod-id-input').value;
    const payload = {
      TenSanPham: document.getElementById('prod-name-input').value,
      MaDanhMuc: Number(document.getElementById('prod-cat-input').value),
      MaThuongHieu: Number(document.getElementById('prod-brand-input').value),
      GiaNhap: Number(document.getElementById('prod-cost-input').value),
      GiaBanLe: Number(document.getElementById('prod-retail-input').value),
      GiaBanSi: Number(document.getElementById('prod-wholesale-input').value),
      SoLuongTon: Number(document.getElementById('prod-stock-input').value),
      DonViTinh: document.getElementById('prod-unit-input').value
    };

    try {
      if (id) {
        await App.api(`/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
        App.showToast('Cập nhật sản phẩm thành công!', 'success');
      } else {
        await App.api('/products', { method: 'POST', body: JSON.stringify(payload) });
        App.showToast('Thêm sản phẩm mới thành công!', 'success');
      }
      App.closeModal('modal-product');
      this.loadProducts();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async deleteProduct(id) {
    if (!confirm('Bạn có chắc chắn muốn xóa sản phẩm này khỏi hệ thống?')) return;
    try {
      await App.api(`/products/${id}`, { method: 'DELETE' });
      App.showToast('Đã xóa sản phẩm thành công!', 'success');
      this.loadProducts();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};

// 2. Nhập Kho & Duyệt Phiếu (BM02, QD05)
const InventoryModule = {
  receipts: [],
  suppliers: [],
  products: [],

  async init() {
    await this.loadSuppliers();
    await this.loadProducts();
    await this.loadReceipts();
  },

  async loadSuppliers() {
    try {
      const res = await App.api('/suppliers');
      this.suppliers = res.data;
      const select = document.getElementById('receipt-supplier-select');
      select.innerHTML = this.suppliers.map(s => `<option value="${s.MaNCC}">${s.TenNCC}</option>`).join('');
    } catch (err) {
      console.error('Lỗi tải nhà cung cấp:', err);
    }
  },

  async loadProducts() {
    try {
      const res = await App.api('/products');
      this.products = res.data;
    } catch (err) {
      console.error('Lỗi tải sản phẩm cho nhập kho:', err);
    }
  },

  async loadReceipts() {
    try {
      const res = await App.api('/inventory/receipts');
      this.receipts = res.data;
      this.renderReceiptsTable();
    } catch (err) {
      console.error('Lỗi tải phiếu nhập kho:', err);
    }
  },

  renderReceiptsTable() {
    const tbody = document.getElementById('inv-receipts-tbody');
    if (!this.receipts.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Chưa có phiếu nhập kho nào.</td></tr>';
      return;
    }

    const isManager = App.user && (App.user.MaVaiTro === 1 || App.user.MaVaiTro === 5);

    tbody.innerHTML = this.receipts.map(r => {
      let badgeClass = 'badge-success';
      if (r.TrangThaiDuyet === 'Chờ Giám đốc duyệt') badgeClass = 'badge-warning';
      if (r.TrangThaiDuyet === 'Bị từ chối') badgeClass = 'badge-danger';

      return `
        <tr>
          <td><strong>#PN${r.MaPhieuNhap}</strong></td>
          <td>${App.formatDate(r.NgayNhap)}</td>
          <td>${r.TenNCC}</td>
          <td>${r.TenNhanVien}</td>
          <td style="font-weight: 700; color: var(--primary);">${App.formatVND(r.TongTienNhap)}</td>
          <td><span class="badge ${badgeClass}">${r.TrangThaiDuyet}</span></td>
          <td>${r.GhiChu || '-'}</td>
          <td>
            ${r.TrangThaiDuyet === 'Chờ Giám đốc duyệt' && isManager ? `
              <button class="btn btn-success btn-sm" onclick="InventoryModule.approve(${r.MaPhieuNhap}, 'approve')">✓ Duyệt (QD05)</button>
              <button class="btn btn-danger btn-sm" onclick="InventoryModule.approve(${r.MaPhieuNhap}, 'reject')">✗ Từ chối</button>
            ` : ''}
            <button class="btn btn-secondary btn-sm" onclick="InventoryModule.viewDetail(${r.MaPhieuNhap})">Xem chi tiết</button>
          </td>
        </tr>
      `;
    }).join('');
  },

  openCreateModal() {
    document.getElementById('receipt-items-container').innerHTML = '';
    this.addItemRow();
    this.calcReceiptTotal();
    App.openModal('modal-receipt-create');
  },

  addItemRow() {
    const container = document.getElementById('receipt-items-container');
    const rowId = Date.now() + Math.random().toString().slice(-4);

    const productOptions = this.products.map(p => 
      `<option value="${p.MaSanPham}" data-cost="${p.GiaNhap}">${p.TenSanPham} (Tồn: ${p.SoLuongTon})</option>`
    ).join('');

    const div = document.createElement('div');
    div.id = `row-${rowId}`;
    div.style.cssText = 'display: grid; grid-template-columns: 2fr 1fr 1fr auto; gap: 0.5rem; margin-bottom: 0.5rem; align-items: center;';
    div.innerHTML = `
      <select class="form-control receipt-item-prod" onchange="InventoryModule.onProductChange('${rowId}', this)">
        ${productOptions}
      </select>
      <input type="number" class="form-control receipt-item-qty" value="10" min="1" placeholder="SL nhập" oninput="InventoryModule.calcReceiptTotal()">
      <input type="number" class="form-control receipt-item-cost" value="${this.products[0] ? this.products[0].GiaNhap : 0}" min="0" placeholder="Giá nhập" oninput="InventoryModule.calcReceiptTotal()">
      <button type="button" class="btn btn-danger btn-sm" onclick="document.getElementById('row-${rowId}').remove(); InventoryModule.calcReceiptTotal();">&times;</button>
    `;
    container.appendChild(div);
    this.calcReceiptTotal();
  },

  onProductChange(rowId, selectEl) {
    const prodId = Number(selectEl.value);
    const p = this.products.find(item => item.MaSanPham === prodId);
    if (p) {
      const row = document.getElementById(`row-${rowId}`);
      row.querySelector('.receipt-item-cost').value = p.GiaNhap;
      this.calcReceiptTotal();
    }
  },

  calcReceiptTotal() {
    let total = 0;
    const rows = document.querySelectorAll('#receipt-items-container > div');
    rows.forEach(r => {
      const qty = Number(r.querySelector('.receipt-item-qty').value) || 0;
      const cost = Number(r.querySelector('.receipt-item-cost').value) || 0;
      total += qty * cost;
    });

    const totalEl = document.getElementById('receipt-total-value');
    totalEl.textContent = App.formatVND(total);

    // Warning if > 20M per QD05
    if (total > 20000000) {
      totalEl.innerHTML = `${App.formatVND(total)} <span class="badge badge-warning" style="font-size: 0.75rem;">> 20M: Cần Giám đốc duyệt (QD05)</span>`;
    }
    this.currentTotalNhap = total;
  },

  async handleSubmitCreate(e) {
    e.preventDefault();
    const rows = document.querySelectorAll('#receipt-items-container > div');
    if (!rows.length) {
      App.showToast('Vui lòng thêm ít nhất 01 dòng sản phẩm nhập.', 'warning');
      return;
    }

    const items = [];
    rows.forEach(r => {
      items.push({
        MaSanPham: Number(r.querySelector('.receipt-item-prod').value),
        SoLuongNhap: Number(r.querySelector('.receipt-item-qty').value),
        GiaNhap: Number(r.querySelector('.receipt-item-cost').value)
      });
    });

    const payload = {
      MaNCC: Number(document.getElementById('receipt-supplier-select').value),
      items,
      GhiChu: document.getElementById('receipt-note-input').value
    };

    try {
      const res = await App.api('/inventory/receipts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      App.showToast(res.message, res.trangThaiDuyet === 'Chờ Giám đốc duyệt' ? 'warning' : 'success');
      App.closeModal('modal-receipt-create');
      this.loadReceipts();
      ProductModule.loadProducts();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async approve(receiptId, action) {
    const actionText = action === 'approve' ? 'phê duyệt' : 'từ chối';
    if (!confirm(`Bạn có chắc muốn ${actionText} phiếu nhập #PN${receiptId}?`)) return;

    try {
      const res = await App.api(`/inventory/receipts/${receiptId}/approve`, {
        method: 'POST',
        body: JSON.stringify({ action })
      });
      App.showToast(res.message, 'success');
      this.loadReceipts();
      ProductModule.loadProducts();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async viewDetail(receiptId) {
    try {
      const res = await App.api(`/inventory/receipts/${receiptId}`);
      const r = res.data;

      alert(`CHI TIẾT PHIẾU NHẬP KHO #PN${r.MaPhieuNhap}\n` +
            `Nhà cung cấp: ${r.TenNCC}\n` +
            `Thủ kho lập: ${r.TenNhanVien} - Ngày: ${App.formatDate(r.NgayNhap)}\n` +
            `Trạng thái: ${r.TrangThaiDuyet}\n` +
            `Tổng giá trị: ${App.formatVND(r.TongTienNhap)}\n\n` +
            r.items.map(i => `• ${i.TenSanPham}: ${i.SoLuongNhap} ${i.DonViTinh} x ${App.formatVND(i.GiaNhap)} = ${App.formatVND(i.SoLuongNhap * i.GiaNhap)}`).join('\n'));
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};

// 3. Kiểm kê Kho Hàng (QD03)
const StockCheckModule = {
  products: [],

  async init() {
    try {
      const res = await App.api('/products');
      this.products = res.data;
      this.renderCheckTable();
    } catch (err) {
      console.error('Lỗi tải danh sách kiểm kê:', err);
    }
  },

  renderCheckTable() {
    const tbody = document.getElementById('stock-check-tbody');
    tbody.innerHTML = this.products.map(p => `
      <tr data-sp-id="${p.MaSanPham}">
        <td>#${p.MaSanPham}</td>
        <td><strong>${p.TenSanPham}</strong></td>
        <td>${p.TenDanhMuc}</td>
        <td class="sys-stock">${p.SoLuongTon}</td>
        <td>
          <input type="number" class="form-control actual-stock" value="${p.SoLuongTon}" min="0" 
                 oninput="StockCheckModule.calcDiff(this)">
        </td>
        <td class="diff-stock" style="font-weight: bold; color: #475569;">0</td>
      </tr>
    `).join('');
  },

  calcDiff(inputEl) {
    const row = inputEl.closest('tr');
    const sysStock = Number(row.querySelector('.sys-stock').textContent);
    const actualStock = Number(inputEl.value) || 0;
    const diff = actualStock - sysStock;

    const diffEl = row.querySelector('.diff-stock');
    diffEl.textContent = diff > 0 ? `+${diff}` : diff;
    if (diff < 0) {
      diffEl.style.color = 'var(--danger)';
    } else if (diff > 0) {
      diffEl.style.color = 'var(--primary)';
    } else {
      diffEl.style.color = '#475569';
    }
  },

  async submitCheck() {
    const rows = document.querySelectorAll('#stock-check-tbody tr');
    const items = [];

    rows.forEach(r => {
      items.push({
        MaSanPham: Number(r.getAttribute('data-sp-id')),
        SoLuongThucTe: Number(r.querySelector('.actual-stock').value) || 0
      });
    });

    try {
      const res = await App.api('/inventory/stock-check', {
        method: 'POST',
        body: JSON.stringify({ items, GhiChu: 'Kiểm kê kho hàng định kỳ' })
      });

      App.showToast(res.message, res.trangThai.includes('Chờ') ? 'warning' : 'success');
      ProductModule.loadProducts();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};

