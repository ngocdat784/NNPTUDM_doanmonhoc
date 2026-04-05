const express = require('express');
const app = express();
const PORT = 3000;

const db = require('./db');
const multer = require('multer');

// ================= UPLOAD =================
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/uploads/');
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + '-' + file.originalname;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage: storage });

app.use(express.json());
app.use(express.static('public'));


// ====================== CATEGORY ======================

// GET all categories
app.get('/api/categories', (req, res) => {
  db.query('SELECT * FROM categories', (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ADD category
app.post('/api/categories', (req, res) => {
  const { name } = req.body;

  db.query(
    'INSERT INTO categories (name) VALUES (?)',
    [name],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Thêm category thành công');
    }
  );
});

// UPDATE category
app.put('/api/categories/:id', (req, res) => {
  const { id } = req.params;
  const { name } = req.body;

  db.query(
    'UPDATE categories SET name = ? WHERE id = ?',
    [name, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Cập nhật category thành công');
    }
  );
});

// DELETE category
app.delete('/api/categories/:id', (req, res) => {
  const { id } = req.params;

  db.query(
    'DELETE FROM categories WHERE id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Xóa category thành công');
    }
  );
});


// ====================== PRODUCT ======================

// GET products (JOIN category)
app.get('/api/products', (req, res) => {
  const sql = `
    SELECT p.*, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ADD product + image
app.post('/api/products', upload.single('image'), (req, res) => {
  const { name, price, category_id } = req.body;
  const image = req.file ? req.file.filename : null;

  db.query(
    'INSERT INTO products (name, price, category_id, image) VALUES (?, ?, ?, ?)',
    [name, price, category_id, image],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Thêm sản phẩm thành công');
    }
  );
});

// UPDATE product info
app.put('/api/products/:id', (req, res) => {
  const { id } = req.params;
  const { name, price, category_id } = req.body;

  db.query(
    'UPDATE products SET name = ?, price = ?, category_id = ? WHERE id = ?',
    [name, price, category_id, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Cập nhật sản phẩm thành công');
    }
  );
});

// UPLOAD IMAGE riêng
app.put('/api/products/upload/:id', upload.single('image'), (req, res) => {
  const { id } = req.params;
  const image = req.file.filename;

  db.query(
    'UPDATE products SET image = ? WHERE id = ?',
    [image, id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Upload ảnh thành công');
    }
  );
});

// DELETE product
app.delete('/api/products/:id', (req, res) => {
  const { id } = req.params;

  db.query(
    'DELETE FROM products WHERE id = ?',
    [id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Xóa sản phẩm thành công');
    }
  );
});


// ================= START SERVER =================
app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});