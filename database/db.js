require('dotenv').config();
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();
const sql = require('mssql');

const DB_TYPE = process.env.DB_TYPE || 'mssql';
const DB_PATH = path.join(__dirname, 'energy_pos.db');

let mssqlPool = null;
let sqliteDb = null;
let activeEngine = 'sqlite';

// SQL Server Config
const mssqlConfig = {
  user: process.env.DB_USER || 'energy_app',
  password: process.env.DB_PASSWORD || 'EnergyPassword123!',
  server: process.env.DB_SERVER || 'localhost',
  database: process.env.DB_DATABASE || 'ENERGY_STORE_DB',
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

if (process.env.DB_INSTANCE) {
  mssqlConfig.server = `${process.env.DB_SERVER || 'localhost'}\\${process.env.DB_INSTANCE}`;
} else if (mssqlConfig.server === 'localhost' && !process.env.DB_PORT) {
  // Check if SQLEXPRESS instance is preferred
  mssqlConfig.server = 'localhost\\SQLEXPRESS';
}

// Convert SQLite compatible query to MSSQL syntax if running on MSSQL
function adaptQueryForMSSQL(queryString, params = []) {
  let query = queryString;

  // Replace SQLite date functions with SQL Server equivalents
  query = query.replace(/datetime\('now'[^)]*\)/gi, 'GETDATE()');
  query = query.replace(/date\('now'\)/gi, 'CAST(GETDATE() AS DATE)');
  query = query.replace(/date\(([^)]+)\)/gi, 'CAST($1 AS DATE)');

  // Handle LIMIT (e.g. LIMIT 5, LIMIT 10, LIMIT 30)
  const limitMatch = query.match(/LIMIT\s+(\d+)/i);
  if (limitMatch) {
    const limitNum = limitMatch[1];
    query = query.replace(/LIMIT\s+\d+/i, '');
    if (/^\s*SELECT\s+(DISTINCT\s+)?/i.test(query)) {
      query = query.replace(/^\s*SELECT\s+(DISTINCT\s+)?/i, `SELECT $1TOP ${limitNum} `);
    }
  }

  // Parameter placeholder mapping: ? -> @p0, @p1, ...
  const mssqlParams = [];
  let paramIndex = 0;
  query = query.replace(/\?/g, () => {
    const pName = `p${paramIndex}`;
    mssqlParams.push({ name: pName, value: params[paramIndex] });
    paramIndex++;
    return `@${pName}`;
  });

  return { query, mssqlParams };
}

// Unified Query Execution Methods
const run = async (queryStr, params = []) => {
  if (activeEngine === 'mssql' && mssqlPool) {
    try {
      const { query, mssqlParams } = adaptQueryForMSSQL(queryStr, params);
      const isInsert = /^\s*INSERT\s+INTO/i.test(query);

      // Append SCOPE_IDENTITY() to get lastID for inserts
      const finalQuery = isInsert
        ? `${query}; SELECT SCOPE_IDENTITY() AS lastID, @@ROWCOUNT AS changes;`
        : `${query}; SELECT @@ROWCOUNT AS changes;`;

      const request = mssqlPool.request();
      mssqlParams.forEach(p => {
        request.input(p.name, p.value !== undefined ? p.value : null);
      });

      const result = await request.query(finalQuery);
      let lastID = 0;
      let changes = 0;

      if (result.recordsets && result.recordsets.length > 0) {
        const lastSet = result.recordsets[result.recordsets.length - 1];
        if (lastSet && lastSet[0]) {
          lastID = lastSet[0].lastID || 0;
          changes = lastSet[0].changes || 0;
        }
      }

      return { lastID, changes };
    } catch (err) {
      console.error('MSSQL Run Error:', err.message, '\nQuery:', queryStr);
      throw err;
    }
  }

  // SQLite execution
  return new Promise((resolve, reject) => {
    sqliteDb.run(queryStr, params, function (err) {
      if (err) reject(err);
      else resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
};

const get = async (queryStr, params = []) => {
  if (activeEngine === 'mssql' && mssqlPool) {
    try {
      const { query, mssqlParams } = adaptQueryForMSSQL(queryStr, params);
      const request = mssqlPool.request();
      mssqlParams.forEach(p => {
        request.input(p.name, p.value !== undefined ? p.value : null);
      });
      const result = await request.query(query);
      return result.recordset && result.recordset.length > 0 ? result.recordset[0] : null;
    } catch (err) {
      console.error('MSSQL Get Error:', err.message, '\nQuery:', queryStr);
      throw err;
    }
  }

  return new Promise((resolve, reject) => {
    sqliteDb.get(queryStr, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
};

const all = async (queryStr, params = []) => {
  if (activeEngine === 'mssql' && mssqlPool) {
    try {
      const { query, mssqlParams } = adaptQueryForMSSQL(queryStr, params);
      const request = mssqlPool.request();
      mssqlParams.forEach(p => {
        request.input(p.name, p.value !== undefined ? p.value : null);
      });
      const result = await request.query(query);
      return result.recordset || [];
    } catch (err) {
      console.error('MSSQL All Error:', err.message, '\nQuery:', queryStr);
      throw err;
    }
  }

  return new Promise((resolve, reject) => {
    sqliteDb.all(queryStr, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows || []);
    });
  });
};

// Initialize Database Connection
const initDatabase = async () => {
  // Try connecting to SQL Server first if configured or preferred
  if (DB_TYPE === 'mssql') {
    try {
      console.log('Đang kết nối tới Microsoft SQL Server (ENERGY_STORE_DB)...');
      mssqlPool = await new sql.ConnectionPool(mssqlConfig).connect();
      activeEngine = 'mssql';
      console.log('================================================================');
      console.log('✅ KẾT NỐI THÀNH CÔNG CSDL MICROSOFT SQL SERVER:');
      console.log(`   - Server: ${mssqlConfig.server}`);
      console.log(`   - Database: ${mssqlConfig.database}`);
      console.log(`   - User: ${mssqlConfig.user}`);
      console.log('================================================================');

      // Verify data in SQL Server
      const testCount = await mssqlPool.request().query('SELECT COUNT(*) as count FROM SAN_PHAM');
      console.log(`📊 Dữ liệu thực tế: ${testCount.recordset[0].count} sản phẩm đang sẵn sàng giao dịch.`);
      return;
    } catch (err) {
      console.warn('⚠️ Không thể kết nối SQL Server:', err.message);
      console.warn('⚡ Tự động chuyển đổi dự phòng sang CSDL SQLite cục bộ để đảm bảo ứng dụng luôn hoạt động!');
      activeEngine = 'sqlite';
    }
  }

  // SQLite Fallback
  return new Promise((resolve, reject) => {
    sqliteDb = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        console.error('Lỗi khởi tạo SQLite:', err.message);
        return reject(err);
      }
      activeEngine = 'sqlite';
      console.log('✅ Đã kết nối thành công CSDL SQLite tại:', DB_PATH);
      resolve();
    });
  });
};

module.exports = {
  run,
  get,
  all,
  initDatabase,
  DB_PATH,
  getActiveEngine: () => activeEngine
};
