const express = require('express');
const router = express.Router();

const { authenticate } = require('../middleware/auth');
const { authorize } = require('../middleware/rbac');

const authCtrl = require('../controllers/authController');
const productCtrl = require('../controllers/productController');
const posCtrl = require('../controllers/posController');
const returnCtrl = require('../controllers/returnController');
const inventoryCtrl = require('../controllers/inventoryController');
const codCtrl = require('../controllers/codController');
const reportCtrl = require('../controllers/reportController');
const customerCtrl = require('../controllers/customerController');
const systemCtrl = require('../controllers/systemController');

// ==========================================
// 1. AUTHENTICATION
// ==========================================
router.post('/auth/login', authCtrl.login);
router.get('/auth/profile', authenticate, authCtrl.getProfile);
router.post('/auth/change-password', authenticate, authCtrl.changePassword);

// ==========================================
// 2. SẢN PHẨM & DANH MỤC, THƯƠNG HIỆU (YCNV03 & BFD 2.1)
// ==========================================
router.get('/products', authenticate, productCtrl.getProducts);
router.get('/products/:id', authenticate, productCtrl.getProductById);
router.post('/products', authenticate, authorize('QUAN_LY_KHO'), productCtrl.createProduct);
router.put('/products/:id', authenticate, authorize('QUAN_LY_KHO'), productCtrl.updateProduct);
router.delete('/products/:id', authenticate, authorize('QUAN_LY_KHO'), productCtrl.deleteProduct);

router.get('/categories', authenticate, productCtrl.getCategories);
router.post('/categories', authenticate, authorize('QUAN_LY_KHO'), productCtrl.createCategory);
router.get('/brands', authenticate, productCtrl.getBrands);
router.post('/brands', authenticate, authorize('QUAN_LY_KHO'), productCtrl.createBrand);

// ==========================================
// 3. POS BÁN HÀNG & HÓA ĐƠN (YCNV01, UC01, BM01, QD01, QD02)
// ==========================================
router.post('/invoices', authenticate, authorize('BAN_HANG'), posCtrl.createInvoice);
router.get('/invoices', authenticate, posCtrl.getInvoices);
router.get('/invoices/:id', authenticate, posCtrl.getInvoiceById);

// ==========================================
// 4. ĐỔI TRẢ HÀNG HÓA (QD02, BFD 1.3)
// ==========================================
router.post('/returns', authenticate, authorize('DOI_TRA'), returnCtrl.processReturn);
router.get('/returns', authenticate, authorize('DOI_TRA'), returnCtrl.getReturnHistory);

// ==========================================
// 5. NHẬP KHO & KIỂM KÊ (YCNV02, UC02, BM02, QD03, QD05)
// ==========================================
router.post('/inventory/receipts', authenticate, authorize('NHAP_KHO'), inventoryCtrl.createReceipt);
router.get('/inventory/receipts', authenticate, inventoryCtrl.getReceipts);
router.get('/inventory/receipts/:id', authenticate, inventoryCtrl.getReceiptById);
router.post('/inventory/receipts/:id/approve', authenticate, authorize('DUYET_NHAP_KHO'), inventoryCtrl.approveReceipt);

router.post('/inventory/stock-check', authenticate, authorize('KIEM_KE'), inventoryCtrl.processStockCheck);
router.get('/inventory/stock-checks', authenticate, authorize('KIEM_KE'), inventoryCtrl.getStockChecks);

router.get('/suppliers', authenticate, inventoryCtrl.getSuppliers);
router.post('/suppliers', authenticate, authorize('QUAN_LY_KHO'), inventoryCtrl.createSupplier);

// ==========================================
// 6. GIAO HÀNG & ĐỐI SOÁT COD (YCNV05, UC04, BM05, QD04)
// ==========================================
router.get('/cod/deliveries', authenticate, authorize('DOI_SOAT_COD'), codCtrl.getDeliveries);
router.put('/cod/deliveries/:id', authenticate, authorize('DOI_SOAT_COD'), codCtrl.updateDelivery);
router.post('/cod/deliveries/:id/reconcile', authenticate, authorize('DOI_SOAT_COD'), codCtrl.reconcileDelivery);

// ==========================================
// 7. KHÁCH HÀNG & KHUYẾN MÃI (YCNV04, UC03, BM04, QD02, QD05)
// ==========================================
router.get('/customers', authenticate, customerCtrl.getCustomers);
router.get('/customers/phone/:phone', authenticate, customerCtrl.getCustomerByPhone);
router.post('/customers', authenticate, customerCtrl.createCustomer);

router.get('/promotions', authenticate, customerCtrl.getPromotions);
router.post('/promotions', authenticate, authorize('DUYET_KHUYEN_MAI'), customerCtrl.createPromotion);
router.get('/promotions/check/:code', authenticate, customerCtrl.checkPromotionCode);

// ==========================================
// 8. BÁO CÁO DOANH THU & TỒN KHO (YCNV06, UC05, BM06, QD05)
// ==========================================
router.get('/reports/summary', authenticate, authorize('BAO_CAO_DOANH_THU'), reportCtrl.getDashboardSummary);
router.get('/reports/revenue', authenticate, authorize('BAO_CAO_DOANH_THU'), reportCtrl.getRevenueReport);

// ==========================================
// 9. QUẢN TRỊ HỆ THỐNG & AUDIT TRAIL (YCHT01 - YCHT04, UC06)
// ==========================================
router.get('/system/employees', authenticate, authorize('QUAN_TRI_HE_THONG'), systemCtrl.getEmployees);
router.post('/system/employees', authenticate, authorize('QUAN_TRI_HE_THONG'), systemCtrl.createEmployee);
router.put('/system/employees/:id/toggle-status', authenticate, authorize('QUAN_TRI_HE_THONG'), systemCtrl.toggleEmployeeStatus);

router.get('/system/roles-permissions', authenticate, authorize('QUAN_TRI_HE_THONG'), systemCtrl.getRolesAndPermissions);
router.post('/system/roles-permissions', authenticate, authorize('QUAN_TRI_HE_THONG'), systemCtrl.updateRolePermissions);

router.get('/system/parameters', authenticate, authorize('QUAN_TRI_HE_THONG'), systemCtrl.getSystemParameters);
router.put('/system/parameters/:key', authenticate, authorize('QUAN_TRI_HE_THONG'), systemCtrl.updateSystemParameter);

router.get('/system/audit-logs', authenticate, authorize('AUDIT_LOG'), systemCtrl.getAuditLogs);
router.post('/system/backup', authenticate, authorize('BACKUP_RESTORE'), systemCtrl.backupDatabase);
router.post('/system/restore', authenticate, authorize('BACKUP_RESTORE'), systemCtrl.restoreDatabase);

module.exports = router;

