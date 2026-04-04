const express = require('express');
const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.static('public'));

// Fake data (linh kiện PC)
let products = [
  { id: 1, name: "CPU Intel i5", price: 5000000 },
  { id: 2, name: "RAM 16GB", price: 1500000 },
  { id: 3, name: "SSD 512GB", price: 1200000 }
];

// API lấy danh sách sản phẩm
app.get('/api/products', (req, res) => {
  res.json(products);
});

// API thêm sản phẩm
app.post('/api/products', (req, res) => {
  const newProduct = {
    id: products.length + 1,
    ...req.body
  };
  products.push(newProduct);
  res.json(newProduct);
});

// Trang chủ
app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});