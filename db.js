const sql = require('mssql');

const config = {
    user: 'sa',          // user SQL Server
    password: '123456',  // password
    server: 'LAPTOP-S9CHED20', // hoặc tên server của bạn
    database: 'PCShop',
    options: {
        encrypt: false,
        trustServerCertificate: true
    }
};

async function connectDB() {
    try {
        await sql.connect(config);
        console.log("Kết nối SQL Server thành công");
    } catch (err) {
        console.error("Lỗi kết nối DB:", err);
    }
}

module.exports = { sql, connectDB };