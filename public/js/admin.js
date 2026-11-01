// System Administration Module (YCHT01, YCHT02, YCHT03, YCHT04)

const AdminModule = {
  activeTab: 'users',
  employees: [],
  rolesData: null,
  parameters: [],
  auditLogs: [],

  async init() {
    this.switchTab(this.activeTab);
  },

  switchTab(tabName) {
    this.activeTab = tabName;
    ['users', 'rbac', 'params', 'audit', 'backup'].forEach(t => {
      const el = document.getElementById(`admin-tab-${t}`);
      if (el) el.style.display = t === tabName ? 'block' : 'none';
    });

    switch (tabName) {
      case 'users':
        this.loadEmployees();
        break;
      case 'rbac':
        this.loadRBAC();
        break;
      case 'params':
        this.loadParameters();
        break;
      case 'audit':
        this.loadAuditLogs();
        break;
    }
  },

  // 1. Nhân viên
  async loadEmployees() {
    try {
      const res = await App.api('/system/employees');
      this.employees = res.data;
      const tbody = document.getElementById('admin-users-tbody');
      tbody.innerHTML = this.employees.map(e => `
        <tr>
          <td>#${e.MaNhanVien}</td>
          <td><strong>${e.HoTen}</strong></td>
          <td><code>${e.TenDangNhap}</code></td>
          <td>${e.SoDienThoai}</td>
          <td><span class="badge badge-info">${e.TenVaiTro}</span></td>
          <td>
            <span class="badge ${e.TrangThai === 1 ? 'badge-success' : 'badge-danger'}">
              ${e.TrangThai === 1 ? 'Hoạt động' : 'Đã khóa'}
            </span>
          </td>
          <td>
            <button class="btn btn-secondary btn-sm" onclick="AdminModule.toggleStatus(${e.MaNhanVien})">
              ${e.TrangThai === 1 ? 'Khóa TK' : 'Mở khóa'}
            </button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Lỗi tải nhân viên:', err);
    }
  },

  openAddUserModal() {
    App.openModal('modal-user');
  },

  async handleSubmitUser(e) {
    e.preventDefault();
    const payload = {
      HoTen: document.getElementById('user-name-input').value,
      SoDienThoai: document.getElementById('user-phone-input').value,
      TenDangNhap: document.getElementById('user-username-input').value,
      MatKhau: document.getElementById('user-password-input').value,
      MaVaiTro: Number(document.getElementById('user-role-select').value)
    };

    try {
      const res = await App.api('/system/employees', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      App.showToast(res.message, 'success');
      App.closeModal('modal-user');
      this.loadEmployees();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  async toggleStatus(id) {
    try {
      const res = await App.api(`/system/employees/${id}/toggle-status`, { method: 'PUT' });
      App.showToast(res.message, 'success');
      this.loadEmployees();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  // 2. RBAC Matrix
  async loadRBAC() {
    try {
      const res = await App.api('/system/roles-permissions');
      this.rolesData = res.data;

      const roles = res.data.roles;
      const funcs = res.data.functions;
      const perms = res.data.rolePermissions;

      // Render Table Header
      const thead = document.getElementById('admin-rbac-thead');
      thead.innerHTML = `
        <tr>
          <th>Mã & Tên Chức năng Hệ thống</th>
          ${roles.map(r => `<th style="text-align: center;">${r.TenVaiTro}</th>`).join('')}
        </tr>
      `;

      // Render Table Body
      const tbody = document.getElementById('admin-rbac-tbody');
      tbody.innerHTML = funcs.map(f => {
        const roleCheckboxes = roles.map(r => {
          const hasPerm = perms.some(p => p.MaVaiTro === r.MaVaiTro && p.MaChucNang === f.MaChucNang);
          const isDirector = r.MaVaiTro === 1; // Giám đốc luôn có full quyền
          return `
            <td style="text-align: center;">
              <input type="checkbox" ${hasPerm ? 'checked' : ''} ${isDirector ? 'disabled' : ''}
                     onchange="AdminModule.togglePermission(${r.MaVaiTro}, '${f.MaChucNang}', this.checked)">
            </td>
          `;
        }).join('');

        return `
          <tr>
            <td>
              <code>${f.MaChucNang}</code>
              <div style="font-weight: 600;">${f.TenChucNang}</div>
            </td>
            ${roleCheckboxes}
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Lỗi tải RBAC:', err);
    }
  },

  async togglePermission(roleId, functionCode, isChecked) {
    if (!this.rolesData) return;

    let rolePerms = this.rolesData.rolePermissions
      .filter(p => p.MaVaiTro === roleId)
      .map(p => p.MaChucNang);

    if (isChecked) {
      if (!rolePerms.includes(functionCode)) rolePerms.push(functionCode);
    } else {
      rolePerms = rolePerms.filter(p => p !== functionCode);
    }

    try {
      await App.api('/system/roles-permissions', {
        method: 'POST',
        body: JSON.stringify({ roleId, permissions: rolePerms })
      });
      App.showToast('Cập nhật phân quyền chức năng thành công!', 'success');
      this.loadRBAC();
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  // 3. Tham số hệ thống (THAM_SO)
  async loadParameters() {
    try {
      const res = await App.api('/system/parameters');
      this.parameters = res.data;
      const tbody = document.getElementById('admin-params-tbody');
      tbody.innerHTML = this.parameters.map(p => `
        <tr>
          <td><code>${p.MaThamSo}</code></td>
          <td>
            <input type="text" class="form-control" id="param-val-${p.MaThamSo}" value="${p.GiaTri}">
          </td>
          <td style="font-size: 0.82rem; color: var(--text-muted);">${p.MoTa || ''}</td>
          <td>
            <button class="btn btn-primary btn-sm" onclick="AdminModule.saveParam('${p.MaThamSo}')">Lưu</button>
          </td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Lỗi tải tham số:', err);
    }
  },

  async saveParam(key) {
    const newVal = document.getElementById(`param-val-${key}`).value;
    try {
      const res = await App.api(`/system/parameters/${key}`, {
        method: 'PUT',
        body: JSON.stringify({ GiaTri: newVal })
      });
      App.showToast(res.message, 'success');
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  },

  // 4. Audit Log
  async loadAuditLogs() {
    try {
      const res = await App.api('/system/audit-logs');
      this.auditLogs = res.data;
      const tbody = document.getElementById('admin-audit-tbody');
      tbody.innerHTML = this.auditLogs.map(l => `
        <tr>
          <td style="font-size: 0.8rem; white-space: nowrap;">${App.formatDate(l.ThoiGian)}</td>
          <td><strong>${l.TenNhanVien || 'Hệ thống'}</strong></td>
          <td><span class="badge badge-info">${l.HanhDong}</span></td>
          <td style="font-size: 0.85rem;">${l.ChiTiet || '-'}</td>
        </tr>
      `).join('');
    } catch (err) {
      console.error('Lỗi tải audit log:', err);
    }
  },

  // 5. Backup & Restore (YCHT02)
  async createBackup() {
    try {
      const res = await App.api('/system/backup', { method: 'POST' });
      App.showToast(res.message, 'success');

      const resultEl = document.getElementById('backup-result');
      resultEl.innerHTML = `
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 1rem; border-radius: 6px; color: #166534;">
          <strong>✅ Sao lưu thành công!</strong><br>
          File sao lưu: <code>${res.filename}</code><br>
          Đường dẫn lưu trữ: <code>${res.filePath}</code><br>
          <a href="data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(res.backupData, null, 2))}" download="${res.filename}" class="btn btn-primary btn-sm" style="margin-top: 0.5rem; text-decoration: none;">
            📥 Tải File JSON Sao Lưu Về Máy
          </a>
        </div>
      `;
    } catch (err) {
      App.showToast(err.message, 'error');
    }
  }
};

