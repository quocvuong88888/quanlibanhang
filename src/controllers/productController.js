const { all, get, run } = require('../../database/db');
const { logAudit } = require('../middleware/audit');

const getProducts = async (req, res) => {
  try {
    const { keyword, categoryId, brandId, lowStock } = req.query;
    let query = `
      SELECT sp.*, dm.TenDanhMuc, th.TenThuongHieu
      FROM SAN_PHAM sp
      JOIN DANH_MUC dm ON sp.MaDanhMuc = dm.MaDanhMuc
      JOIN THUONG_HIEU th ON sp.MaThuongHieu = th.MaThuongHieu
      WHERE 1=1
    `;
    const params = [];

    if (keyword) {
      query += ` AND (sp.TenSanPham LIKE ? OR sp.MaSanPham = ?)`;
      params.push(`%${keyword}%`, keyword);
    }
    if (categoryId) {
      query += ` AND sp.MaDanhMuc = ?`;
      params.push(categoryId);
    }
    if (brandId) {
      query += ` AND sp.MaThuongHieu = ?`;
      params.push(brandId);
    }
    if (lowStock === 'true') {
      query += ` AND sp.SoLuongTon <= 5`;
    }

    query += ` ORDER BY sp.MaSanPham DESC`;
    const products = await all(query, params);
    res.json({ success: true, data: products });
  } catch (err) {
    console.error('Lỗi lấy danh sách sản phẩm:', err);
    res.status(500).json({ success: false, message: 'Lỗi tải danh sách sản phẩm.' });
  }
};

const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await get(
      `SELECT sp.*, dm.TenDanhMuc, th.TenThuongHieu
       FROM SAN_PHAM sp
       JOIN DANH_MUC dm ON sp.MaDanhMuc = dm.MaDanhMuc
       JOIN THUONG_HIEU th ON sp.MaThuongHieu = th.MaThuongHieu
       WHERE sp.MaSanPham = ?`,
      [id]
    );

    if (!product) {
      return res.status(404).json({ success: false, message: 'Không tìm thấy sản phẩm.' });
    }
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi lấy thông tin sản phẩm.' });
  }
};

const createProduct = async (req, res) => {
  try {
    const { TenSanPham, MaDanhMuc, MaThuongHieu, GiaNhap, GiaBanLe, GiaBanSi, SoLuongTon, DonViTinh, HinhAnh } = req.body;
    if (!TenSanPham || !MaDanhMuc || !MaThuongHieu) {
      return res.status(400).json({ success: false, message: 'Vui lòng cung cấp đủ thông tin sản phẩm bắt buộc.' });
    }

    const result = await run(
      `INSERT INTO SAN_PHAM (TenSanPham, MaDanhMuc, MaThuongHieu, GiaNhap, GiaBanLe, GiaBanSi, SoLuongTon, DonViTinh, HinhAnh)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        TenSanPham,
        MaDanhMuc,
        MaThuongHieu,
        Number(GiaNhap) || 0,
        Number(GiaBanLe) || 0,
        Number(GiaBanSi) || 0,
        Number(SoLuongTon) || 0,
        DonViTinh || 'Cái',
        HinhAnh || null
      ]
    );

    await logAudit(
      req.user.MaNhanVien,
      'THÊM SẢN PHẨM',
      `Thêm sản phẩm mới [${TenSanPham}] - Mã: ${result.lastID}`
    );

    res.status(201).json({
      success: true,
      message: 'Thêm sản phẩm mới thành công!',
      productId: result.lastID
    });
  } catch (err) {
    console.error('Lỗi thêm sản phẩm:', err);
    res.status(500).json({ success: false, message: 'Lỗi khi thêm sản phẩm mới.' });
  }
};

const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const { TenSanPham, MaDanhMuc, MaThuongHieu, GiaNhap, GiaBanLe, GiaBanSi, SoLuongTon, DonViTinh, HinhAnh } = req.body;

    await run(
      `UPDATE SAN_PHAM 
       SET TenSanPham = ?, MaDanhMuc = ?, MaThuongHieu = ?, GiaNhap = ?, GiaBanLe = ?, GiaBanSi = ?, SoLuongTon = ?, DonViTinh = ?, HinhAnh = ?
       WHERE MaSanPham = ?`,
      [
        TenSanPham,
        MaDanhMuc,
        MaThuongHieu,
        Number(GiaNhap) || 0,
        Number(GiaBanLe) || 0,
        Number(GiaBanSi) || 0,
        Number(SoLuongTon) || 0,
        DonViTinh || 'Cái',
        HinhAnh || null,
        id
      ]
    );

    await logAudit(
      req.user.MaNhanVien,
      'SỬA SẢN PHẨM',
      `Cập nhật thông tin sản phẩm [${TenSanPham}] - Mã: ${id}`
    );

    res.json({ success: true, message: 'Cập nhật sản phẩm thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi cập nhật sản phẩm.' });
  }
};

const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await get('SELECT TenSanPham FROM SAN_PHAM WHERE MaSanPham = ?', [id]);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Sản phẩm không tồn tại.' });
    }

    // Check if product is referenced in invoice details
    const inInvoice = await get('SELECT COUNT(*) as cnt FROM CHI_TIET_HOA_DON WHERE MaSanPham = ?', [id]);
    if (inInvoice && inInvoice.cnt > 0) {
      return res.status(400).json({
        success: false,
        message: 'Không thể xóa sản phẩm đã có phát sinh hóa đơn bán hàng!'
      });
    }

    await run('DELETE FROM SAN_PHAM WHERE MaSanPham = ?', [id]);
    await logAudit(req.user.MaNhanVien, 'XÓA SẢN PHẨM', `Xóa sản phẩm [${product.TenSanPham}] - Mã: ${id}`);

    res.json({ success: true, message: 'Đã xóa sản phẩm thành công!' });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi khi xóa sản phẩm.' });
  }
};

// Categories & Brands
const getCategories = async (req, res) => {
  try {
    const categories = await all('SELECT * FROM DANH_MUC ORDER BY MaDanhMuc ASC');
    res.json({ success: true, data: categories });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải danh mục.' });
  }
};

const createCategory = async (req, res) => {
  try {
    const { TenDanhMuc } = req.body;
    if (!TenDanhMuc) return res.status(400).json({ success: false, message: 'Tên danh mục không được trống.' });
    const result = await run('INSERT INTO DANH_MUC (TenDanhMuc) VALUES (?)', [TenDanhMuc]);
    res.status(201).json({ success: true, message: 'Thêm danh mục thành công!', categoryId: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi thêm danh mục.' });
  }
};

const getBrands = async (req, res) => {
  try {
    const brands = await all('SELECT * FROM THUONG_HIEU ORDER BY MaThuongHieu ASC');
    res.json({ success: true, data: brands });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi tải thương hiệu.' });
  }
};

const createBrand = async (req, res) => {
  try {
    const { TenThuongHieu } = req.body;
    if (!TenThuongHieu) return res.status(400).json({ success: false, message: 'Tên thương hiệu không được trống.' });
    const result = await run('INSERT INTO THUONG_HIEU (TenThuongHieu) VALUES (?)', [TenThuongHieu]);
    res.status(201).json({ success: true, message: 'Thêm thương hiệu thành công!', brandId: result.lastID });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Lỗi thêm thương hiệu.' });
  }
};

module.exports = {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  createCategory,
  getBrands,
  createBrand
};

