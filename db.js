const mysql = require('mysql2');

const connection = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: '', // Laragon mặc định không có password
  database: 'pcshop'
});

connection.connect((err) => {
  if (err) {
    console.error('Lỗi kết nối DB:', err);
  } else {
    console.log('Kết nối MySQL thành công');
  }
});

module.exports = connection;