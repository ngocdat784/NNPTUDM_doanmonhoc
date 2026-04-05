const express = require('express');
const app = express();
const PORT = 3000;

const db = require('./db');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// ================= JWT SECRET =================
const SECRET = "mysecretkey";

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(403).send('Không có token');
  }

  if (!authHeader.startsWith('Bearer ')) {
    return res.status(403).send('Token sai format');
  }

  const token = authHeader.split(' ')[1];

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
      console.log("JWT lỗi:", err.message);
      return res.status(401).send('Token không hợp lệ');
    }

    req.user = decoded;
    next();
  });
}

function isAdmin(req, res, next) {
  if (req.user.role !== 'ADMIN') {
    return res.status(403).send('Không có quyền ADMIN');
  }
  next();
}
async function createAdminIfNotExists() {
  db.query('SELECT * FROM users WHERE username = ?', ['admin'], async (err, result) => {
    if (result.length === 0) {
      const hashedPassword = await bcrypt.hash('123456', 10);

      db.query(
        'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
        ['admin', hashedPassword, 'ADMIN'],
        (err) => {
          if (err) return console.log("Lỗi tạo admin");

          console.log("Đã tạo tài khoản admin:");
          console.log("username: admin");
          console.log("password: 123456");
        }
      );
    } else {
      console.log("Admin đã tồn tại");
    }
  });
}
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

// ====================== AUTH ======================

// REGISTER (auto login)
app.post('/api/auth/register', async (req, res) => {
  const { username, password } = req.body;

  const hashedPassword = await bcrypt.hash(password, 10);

  db.query(
    'INSERT INTO users (username, password, role) VALUES (?, ?, ?)',
    [username, hashedPassword, 'USER'],
    (err, result) => {
      if (err) return res.status(500).send('User đã tồn tại');

      const token = jwt.sign(
        { id: result.insertId, username, role: 'USER' },
        SECRET,
        { expiresIn: '1d' }
      );

      res.json({ token, role: 'USER' });
    }
  );
});

// LOGIN
app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;

  db.query(
    'SELECT * FROM users WHERE username = ?',
    [username],
    async (err, result) => {
      if (err || result.length === 0) {
        return res.status(400).send('Sai tài khoản');
      }

      const user = result[0];

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) return res.status(400).send('Sai mật khẩu');

      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role },
        SECRET,
        { expiresIn: '1d' }
      );

      res.json({ token, role: user.role });
    }
  );
});

// ====================== CATEGORY ======================

// GET (ai cũng xem được)
app.get('/api/categories', (req, res) => {
  db.query('SELECT * FROM categories', (err, result) => {
    if (err) return res.status(500).send(err);
    res.json(result);
  });
});

// ADD (ADMIN)
app.post('/api/categories', verifyToken, isAdmin, (req, res) => {
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

// UPDATE (ADMIN)
app.put('/api/categories/:id', verifyToken, isAdmin, (req, res) => {
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

// DELETE (ADMIN)
app.delete('/api/categories/:id', verifyToken, isAdmin, (req, res) => {
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

// GET (ai cũng xem)
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

// ADD (ADMIN)
app.post('/api/products', verifyToken, isAdmin, upload.single('image'), (req, res) => {
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

// UPDATE (ADMIN)
app.put('/api/products/:id', verifyToken, isAdmin, (req, res) => {
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

// UPLOAD IMAGE (ADMIN)
app.put('/api/products/upload/:id', verifyToken, isAdmin, upload.single('image'), (req, res) => {
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

// DELETE (ADMIN)
app.delete('/api/products/:id', verifyToken, isAdmin, (req, res) => {
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

  createAdminIfNotExists(); // THÊM DÒNG NÀY
});