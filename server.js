const express = require('express');
const app = express();
const PORT = 3000;

const db = require('./db');

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

// POST category
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

// PUT category
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

// GET all products (kèm category)
app.get('/api/products', (req, res) => {
  const sql = `
    SELECT p.id, p.name, p.price, p.category_id, c.name AS category_name
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
  `;

  db.query(sql, (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// GET product by id
app.get('/api/products/:id', (req, res) => {
  const { id } = req.params;

  db.query(
    'SELECT * FROM products WHERE id = ?',
    [id],
    (err, result) => {
      if (err) return res.status(500).send(err);
      res.json(result[0]);
    }
  );
});

// POST product
app.post('/api/products', (req, res) => {
  const { name, price, category_id } = req.body;

  db.query(
    'INSERT INTO products (name, price, category_id) VALUES (?, ?, ?)',
    [name, price, category_id],
    (err) => {
      if (err) return res.status(500).send(err);
      res.send('Thêm sản phẩm thành công');
    }
  );
});

// PUT product
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


app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);
});