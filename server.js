const express = require('express');
const app = express();
const PORT = 3000;

const { sql, connectDB } = require('./db');

app.use(express.json());
app.use(express.static('public'));

// Kết nối DB
connectDB();

// Lấy danh sách sản phẩm từ SQL Server
app.get('/api/products', async (req, res) => {
    try {
        const result = await sql.query("SELECT * FROM Products");
        res.json(result.recordset);
    } catch (err) {
        res.status(500).send(err.message);
    }
});

// Thêm sản phẩm
app.post('/api/products', async (req, res) => {
    try {
        const { name, price } = req.body;

        await sql.query`
            INSERT INTO Products (Name, Price)
            VALUES (${name}, ${price})
        `;

        res.send("Thêm thành công");
    } catch (err) {
        res.status(500).send(err.message);
    }
});

app.listen(PORT, () => {
    console.log(`Server chạy tại http://localhost:${PORT}`);
});