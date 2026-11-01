// POS Terminal Module (BM01, QD01, QD02)
const POS = {
  products: [],
  cart: [],
  selectedCustomer: null,
  appliedVoucher: null,
  activeCategory: '',

  async init() {
    await this.loadCategories();
    await this.loadProducts();
    this.renderCart();
  },

  async loadCategories() {
    try {
      const res = await App.api('/categories');
      const select = document.getElementById('pos-category-filter');
      select.innerHTML = '<option value="">Tất cả danh mục</option>' + 
        res.data.map(c => `<option value="${c.MaDanhMuc}">${c.TenDanhMuc}</option>`).join('');
    } catch (err) {
      console.error('Lỗi tải danh mục POS:', err);
    }
  },

  async loadProducts() {
    try {
      const search = document.getElementById('pos-search-input').value;
      const cat = document.getElementById('pos-category-filter').value;
      let url = '/products?';
      if (search) url += `keyword=${encodeURIComponent(search)}&`;
      if (cat) url += `categoryId=${cat}&`;

      const res = await App.api(url);
      this.products = res.data;
      this.renderProductGrid();
    } catch (err) {
      console.error('Lỗi tải sản phẩm POS:', err);
    }
  },

  handleSearch(val) {
    this.loadProducts();
  },

  filterCategory(val) {
    this.activeCategory = val;
    this.loadProducts();
  },

  renderProductGrid() {
    const grid = document.getElementById('pos-product-grid');
    if (!this.products.length) {
      grid.innerHTML = '<div style="grid-column: 1/-1; text-align: center; color: var(--text-muted); padding: 2rem;">Không tìm thấy sản phẩm thể thao nào phù hợp.</div>';
      return;
    }

    grid.innerHTML = this.products.map(p => {
      const isOutOfStock = p.SoLuongTon <= 0;
      return `
        <div class="product-item ${isOutOfStock ? 'out-of-stock' : ''}" onclick="POS.addToCart(${p.MaSanPham})">
          <div>
            <div class="p-title">${p.TenSanPham}</div>
            <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.25rem;">
              ${p.TenThuongHieu} | ${p.TenDanhMuc}
            </div>
          </div>
          <div>
            <div class="p-price">${App.formatVND(p.GiaBanLe)} <span style="font-size: 0.72rem; color: var(--text-muted); font-weight: normal;">/lẻ</span></div>
            <div class="p-wholesale">Sỉ (&ge;10): ${App.formatVND(p.GiaBanSi)}</div>
            <div class="p-stock ${p.SoLuongTon <= 5 ? 'style="color: var(--danger); font-weight: bold;"' : ''}">
              Tồn kho: <strong>${p.SoLuongTon}</strong> ${p.DonViTinh}
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  addToCart(productId) {
    const product = this.products.find(p => p.MaSanPham === productId);
    if (!product) return;

    if (product.SoLuongTon <= 0) {
      App.showToast(`Sản phẩm [${product.TenSanPham}] đã hết hàng trong kho!`, 'error');
      return;
    }

    const existing = this.cart.find(item => item.MaSanPham === productId);
    if (existing) {
      if (existing.SoLuong + 1 > product.SoLuongTon) {
        App.showToast(`Tồn kho chỉ còn ${product.SoLuongTon} ${product.DonViTinh}!`, 'warning');
        return;
      }
      existing.SoLuong += 1;
    } else {
      this.cart.push({
        MaSanPham: product.MaSanPham,
        TenSanPham: product.TenSanPham,
        GiaBanLe: product.GiaBanLe,
        GiaBanSi: product.GiaBanSi,
        SoLuongTon: product.SoLuongTon,
        DonViTinh: product.DonViTinh,
        SoLuong: 1
      });
    }

    this.renderCart();
  },

  updateQuantity(productId, delta) {
    const item = this.cart.find(i => i.MaSanPham === productId);
    if (!item) return;

    const newQty = item.SoLuong + delta;
    if (newQty <= 0) {
      this.removeFromCart(productId);
      return;
    }

    if (newQty > item.SoLuongTon) {
      App.showToast(`Không đủ số lượng trong kho (Tồn: ${item.SoLuongTon})!`, 'warning');
      return;
    }

    item.SoLuong = newQty;
    this.renderCart();
  },

  setQuantity(productId, val) {
    const item = this.cart.find(i => i.MaSanPham === productId);
    if (!item) return;

    let qty = parseInt(val) || 1;
    if (qty <= 0) qty = 1;
    if (qty > item.SoLuongTon) {
      App.showToast(`Không đủ số lượng tồn kho (Tồn: ${item.SoLuongTon})!`, 'warning');
      qty = item.SoLuongTon;
    }
    item.SoLuong = qty;
    this.renderCart();
  },

  removeFromCart(productId) {
    this.cart = this.cart.filter(i => i.MaSanPham !== productId);
    this.renderCart();
  },

  clearCart() {
    this.cart = [];
    this.appliedVoucher = null;
    document.getElementById('pos-voucher-code').value = '';
    this.renderCart();
  },

  renderCart() {
    const tbody = document.getElementById('pos-cart-tbody');
    if (!this.cart.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 1.5rem;">Giỏ hàng trống. Hãy chọn sản phẩm bên trái!</td></tr>';
      this.updateSummary(0, 0, 0, 0);
      return;
    }

    let subtotal = 0;

    tbody.innerHTML = this.cart.map(item => {
      // QD01: Mua >= 10 cái tự động áp dụng giá sỉ
      const isWholesale = item.SoLuong >= 10;
      const unitPrice = isWholesale ? item.GiaBanSi : item.GiaBanLe;
      const lineTotal = item.SoLuong * unitPrice;
      subtotal += lineTotal;

      return `
        <tr>
          <td>
            <div style="font-weight: 600;">${item.TenSanPham}</div>
            ${isWholesale ? '<span class="badge badge-success" style="font-size: 0.7rem;">Giá sỉ (≥10)</span>' : '<span style="font-size: 0.7rem; color: var(--text-muted);">Giá lẻ</span>'}
          </td>
          <td>
            <div style="display: flex; align-items: center; gap: 2px;">
              <button class="btn btn-secondary btn-sm" style="padding: 2px 6px;" onclick="POS.updateQuantity(${item.MaSanPham}, -1)">-</button>
              <input type="number" value="${item.SoLuong}" min="1" max="${item.SoLuongTon}" 
                     style="width: 38px; text-align: center; border: 1px solid var(--border); border-radius: 4px;"
                     onchange="POS.setQuantity(${item.MaSanPham}, this.value)">
              <button class="btn btn-secondary btn-sm" style="padding: 2px 6px;" onclick="POS.updateQuantity(${item.MaSanPham}, 1)">+</button>
            </div>
          </td>
          <td style="font-weight: 600;">${App.formatVND(unitPrice)}</td>
          <td style="font-weight: 700; color: var(--primary);">${App.formatVND(lineTotal)}</td>
          <td>
            <button class="btn btn-danger btn-sm" style="padding: 2px 6px;" onclick="POS.removeFromCart(${item.MaSanPham})">&times;</button>
          </td>
        </tr>
      `;
    }).join('');

    // Khuyến mãi
    let discount = 0;
    if (this.appliedVoucher) {
      discount = (subtotal * this.appliedVoucher.PhanTramGiam) / 100;
    }

    const total = Math.max(0, subtotal - discount);

    // QD02: Tích 1%
    const points = Math.floor((total * 0.01) / 1000);

    this.updateSummary(subtotal, discount, total, points);
  },

  updateSummary(subtotal, discount, total, points) {
    document.getElementById('pos-subtotal').textContent = App.formatVND(subtotal);
    document.getElementById('pos-discount').textContent = `-${App.formatVND(discount)} ${this.appliedVoucher ? `(${this.appliedVoucher.PhanTramGiam}%)` : ''}`;
    document.getElementById('pos-points').textContent = `+${points} điểm`;
    document.getElementById('pos-total').textContent = App.formatVND(total);

    this.currentTotal = total;
    this.calcChange();
  },

  async applyVoucher() {
    const code = document.getElementById('pos-voucher-code').value.trim();
    if (!code) {
      this.appliedVoucher = null;
      this.renderCart();
      return;
    }

    try {
      const res = await App.api(`/promotions/check/${code}`);
      this.appliedVoucher = res.data;
      App.showToast(`Áp dụng mã ${this.appliedVoucher.MaCode} giảm ${this.appliedVoucher.PhanTramGiam}% thành công!`, 'success');
      this.renderCart();
    } catch (err) {
      this.appliedVoucher = null;
      App.showToast(err.message, 'error');
      this.renderCart();
    }
  },

  async lookupCustomer(phone) {
    if (!phone) {
      this.selectedCustomer = null;
      document.getElementById('pos-customer-info').style.display = 'none';
      return;
    }

    try {
      const res = await App.api(`/customers/phone/${phone.trim()}`);
      this.selectedCustomer = res.data;
      const infoEl = document.getElementById('pos-customer-info');
      infoEl.textContent = `Khách hàng: ${this.selectedCustomer.HoTen} | Điểm tích lũy: ${this.selectedCustomer.DiemTichLuy} điểm`;
      infoEl.style.display = 'block';
      App.showToast(`Khách hàng: ${this.selectedCustomer.HoTen}`, 'info');
    } catch (err) {
      this.selectedCustomer = null;
      document.getElementById('pos-customer-info').style.display = 'none';
      App.showToast('Không tìm thấy khách hàng với SĐT này. Vui lòng bấm "+ Thêm KH".', 'warning');
    }
  },

  openCustomerModal() {
    App.openModal('modal-customer');
  },

  changePaymentMethod(method) {
    const cashSec = document.getElementById('pos-cash-section');
    const codSec = document.getElementById('pos-cod-section');

    if (method === 'Tiền mặt') {
      cashSec.style.display = 'block';
      codSec.style.display = 'none';
    } else if (method === 'COD') {
      cashSec.style.display = 'none';
      codSec.style.display = 'block';
    } else {
      cashSec.style.display = 'none';
      codSec.style.display = 'none';
    }
  },

  calcChange() {
    const method = document.getElementById('pos-payment-method').value;
    if (method !== 'Tiền mặt') {
      document.getElementById('pos-change').textContent = '0 đ';
      return;
    }

    const total = this.currentTotal || 0;
    const cashGiven = Number(document.getElementById('pos-cash-given').value) || 0;
    const change = Math.max(0, cashGiven - total);
    document.getElementById('pos-change').textContent = App.formatVND(change);
  },

  // Checkout Execution
  async checkout() {
    if (!this.cart.length) {
      App.showToast('Giỏ hàng trống! Vui lòng chọn sản phẩm trước khi thanh toán.', 'warning');
      return;
    }

    const method = document.getElementById('pos-payment-method').value;
    const cashGiven = Number(document.getElementById('pos-cash-given').value) || this.currentTotal;

    if (method === 'Tiền mặt' && cashGiven < this.currentTotal) {
      App.showToast(`Số tiền khách đưa (${App.formatVND(cashGiven)}) nhỏ hơn tổng tiền phải trả (${App.formatVND(this.currentTotal)})!`, 'error');
      return;
    }

    const payload = {
      MaKhachHang: this.selectedCustomer ? this.selectedCustomer.MaKhachHang : null,
      items: this.cart.map(i => ({ MaSanPham: i.MaSanPham, SoLuong: i.SoLuong })),
      MaCodeKhuyenMai: this.appliedVoucher ? this.appliedVoucher.MaCode : null,
      TienKhachDua: cashGiven,
      HinhThucThanhToan: method,
      DiaChiGiao: method === 'COD' ? document.getElementById('pos-cod-address').value : null,
      DonViVanChuyen: method === 'COD' ? document.getElementById('pos-cod-carrier').value : null,
      GhiChu: method === 'COD' ? 'Đơn giao hàng online COD' : 'Bán tại quầy'
    };

    try {
      const res = await App.api('/invoices', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      App.showToast('Thanh toán thành công! Đang hiển thị hóa đơn...', 'success');

      // Show Receipt Preview
      this.displayReceiptPreview(res.invoiceId);

      // Reset POS cart
      this.clearCart();
      this.loadProducts(); // refresh stock numbers
      document.getElementById('pos-customer-phone').value = '';
      document.getElementById('pos-cash-given').value = '';
      this.selectedCustomer = null;
      document.getElementById('pos-customer-info').style.display = 'none';
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  // Display K80 Receipt Preview (BM01)
  async displayReceiptPreview(invoiceId) {
    try {
      const res = await App.api(`/invoices/${invoiceId}`);
      const inv = res.data;

      const html = `
        <div class="k80-receipt">
          <div class="header">
            <div class="brand-title">CÔNG TY TNHH THỂ THAO ENERGY</div>
            <div class="store-info">280 An Dương Vương, P.4, Q.5, TP.HCM</div>
            <div class="store-info">Hotline: 0901 888 999</div>
            <div class="doc-title">HÓA ĐƠN BÁN HÀNG</div>
            <div style="font-size: 11px;">Mã số HĐ: <strong>#HD${inv.MaHoaDon}</strong></div>
          </div>

          <table class="meta-table">
            <tr>
              <td>Ngày lập:</td>
              <td class="text-right">${App.formatDate(inv.NgayLap)}</td>
            </tr>
            <tr>
              <td>Thu ngân:</td>
              <td class="text-right">${inv.TenNhanVien}</td>
            </tr>
            <tr>
              <td>Khách hàng:</td>
              <td class="text-right">${inv.TenKhachHang || 'Khách vãng lai'}</td>
            </tr>
            ${inv.SdtKhachHang ? `<tr><td>SĐT:</td><td class="text-right">${inv.SdtKhachHang}</td></tr>` : ''}
            <tr>
              <td>Hình thức:</td>
              <td class="text-right">${inv.HinhThucThanhToan}</td>
            </tr>
          </table>

          <table class="items-table">
            <thead>
              <tr>
                <th>Tên hàng</th>
                <th class="text-center">SL</th>
                <th class="text-right">Đơn giá</th>
                <th class="text-right">T.Tiền</th>
              </tr>
            </thead>
            <tbody>
              ${inv.items.map(it => `
                <tr>
                  <td>
                    ${it.TenSanPham}
                    <div style="font-size: 9.5px; color: #555;">[${it.LoaiGia}]</div>
                  </td>
                  <td class="text-center">${it.SoLuong}</td>
                  <td class="text-right">${Number(it.DonGia).toLocaleString('vi-VN')}</td>
                  <td class="text-right">${Number(it.ThanhTien).toLocaleString('vi-VN')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="summary-section">
            <div class="summary-row">
              <span>Tổng tiền hàng:</span>
              <span>${Number(inv.TongTienHang).toLocaleString('vi-VN')} đ</span>
            </div>
            ${inv.SoTienGiam > 0 ? `
              <div class="summary-row">
                <span>Giảm giá (${inv.TenKhuyenMai}):</span>
                <span>-${Number(inv.SoTienGiam).toLocaleString('vi-VN')} đ</span>
              </div>
            ` : ''}
            <div class="summary-row total-row">
              <span>TỔNG CỘNG:</span>
              <span>${Number(inv.TongTien).toLocaleString('vi-VN')} đ</span>
            </div>
            <div class="summary-row">
              <span>Tiền khách đưa:</span>
              <span>${Number(inv.TienKhachDua).toLocaleString('vi-VN')} đ</span>
            </div>
            <div class="summary-row">
              <span>Tiền thối lại:</span>
              <span>${Number(inv.TienThoiLai).toLocaleString('vi-VN')} đ</span>
            </div>
            ${inv.DiemCongThem > 0 ? `
              <div class="summary-row" style="color: #047857; font-weight: bold;">
                <span>Điểm tích lũy (+1% QD02):</span>
                <span>+${inv.DiemCongThem} điểm</span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <div class="barcode-sim">*HD${inv.MaHoaDon.toString().padStart(6, '0')}*</div>
            <div>Cảm ơn Quý khách đã mua sắm tại ENERGY!</div>
            <div style="margin-top: 4px; font-size: 9.5px; font-style: italic;">
              (Đổi trả sản phẩm trong vòng 07 ngày kèm hóa đơn còn nguyên tem theo QD02)
            </div>
          </div>
        </div>
      `;

      document.getElementById('receipt-preview-content').innerHTML = html;
      document.getElementById('print-area').innerHTML = html;
      App.openModal('modal-receipt');
    } catch (err) {
      App.showToast('Lỗi xem hóa đơn: ' + err.message, 'error');
    }
  },

  printReceipt() {
    window.print();
  }
};

