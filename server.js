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
function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, result) => {
      if (err) reject(err);
      else resolve(result);
    });
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
async function getCart(userId) {
  const rows = await query(
    'SELECT * FROM cart WHERE user_id = ?',
    [userId]
  );

  if (rows.length === 0) {
    const result = await query(
      'INSERT INTO cart(user_id) VALUES (?)',
      [userId]
    );

    return result.insertId;
  }

  return rows[0].id;
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
app.post('/api/cart/add', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const { product_id } = req.body;

    const cartId = await getCart(userId);

    const items = await query(
      'SELECT * FROM cart_items WHERE cart_id=? AND product_id=?',
      [cartId, product_id]
    );

    if (items.length > 0) {
      await query(
        'UPDATE cart_items SET quantity = quantity + 1 WHERE id=?',
        [items[0].id]
      );
    } else {
      await query(
        'INSERT INTO cart_items(cart_id, product_id, quantity) VALUES (?, ?, 1)',
        [cartId, product_id]
      );
    }

    res.send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});
app.get('/api/cart', verifyToken, async (req, res) => {
  try {
    const cartId = await getCart(req.user.id);

    const data = await query(`
      SELECT 
        ci.id,
        ci.product_id,
        ci.quantity,
        p.name,
        p.price,
        p.image
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `, [cartId]);

    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});
app.put('/api/cart/:id', verifyToken, async (req, res) => {
  try {
    const { type } = req.body;

    if (type === 'increase') {
      await query(
        'UPDATE cart_items SET quantity = quantity + 1 WHERE id=?',
        [req.params.id]
      );
    }

    if (type === 'decrease') {
      await query(
        'UPDATE cart_items SET quantity = quantity - 1 WHERE id=? AND quantity > 1',
        [req.params.id]
      );
    }

    res.send("OK");
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});
app.delete('/api/cart/clear', verifyToken, async (req, res) => {
  try {
    const cartId = await getCart(req.user.id);

    await query(
      'DELETE FROM cart_items WHERE cart_id=?',
      [cartId]
    );

    res.send("Cleared");
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});
app.delete('/api/cart/:id', verifyToken, async (req, res) => {
  try {
    await query(
      'DELETE FROM cart_items WHERE id=?',
      [req.params.id]
    );

    res.send("Deleted");
  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});
app.post('/api/orders/checkout', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;

    const cartId = await getCart(userId);

    // 1. Lấy giỏ hàng
    const items = await query(`
      SELECT ci.*, p.price
      FROM cart_items ci
      JOIN products p ON ci.product_id = p.id
      WHERE ci.cart_id = ?
    `, [cartId]);

    if (items.length === 0) {
      return res.status(400).send("Giỏ hàng trống");
    }

    // 2. Tính tổng tiền
    let total = 0;
    items.forEach(i => {
      total += i.price * i.quantity;
    });

    const orderResult = await query(
  'INSERT INTO orders (user_id, total, status) VALUES (?, ?, ?)',
  [userId, total, 'PENDING']
);

    const orderId = orderResult.insertId;

    // 4. Lưu order_items
    for (let item of items) {
      await query(
        'INSERT INTO order_items (order_id, product_id, quantity, price) VALUES (?, ?, ?, ?)',
        [orderId, item.product_id, item.quantity, item.price]
      );
    }

    // 5. Xóa giỏ hàng
    await query(
      'DELETE FROM cart_items WHERE cart_id = ?',
      [cartId]
    );

    res.json({
      message: "Đặt hàng thành công",
      orderId: orderId
    });

  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});
app.get('/api/orders', verifyToken, async (req, res) => {
  try {
    let orders;

    // ===== ADMIN =====
    if (req.user.role === 'ADMIN') {
      orders = await query(
        'SELECT * FROM orders ORDER BY created_at DESC'
      );
    } 
    // ===== USER =====
    else {
      orders = await query(
        'SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC',
        [req.user.id]
      );
    }

    // ===== LẤY CHI TIẾT =====
    for (let order of orders) {
      const items = await query(`
        SELECT oi.*, p.name
        FROM order_items oi
        JOIN products p ON oi.product_id = p.id
        WHERE oi.order_id = ?
      `, [order.id]);

      order.items = items;
    }

    res.json(orders);

  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});
app.put('/api/orders/:id/status', verifyToken, isAdmin, async (req, res) => {
  try {
    const { status } = req.body;

    // VALIDATE
    const validStatus = ['PENDING','CONFIRMED','SHIPPING','DONE','CANCELLED'];
    if (!validStatus.includes(status)) {
      return res.status(400).send("Status không hợp lệ");
    }

    await query(
      'UPDATE orders SET status=? WHERE id=?',
      [status, req.params.id]
    );

    res.send("Cập nhật trạng thái thành công");

  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});
app.get('/api/orders/:id', verifyToken, async (req, res) => {
  try {
    const order = await query(
      'SELECT * FROM orders WHERE id=?',
      [req.params.id]
    );

    if (order.length === 0) {
      return res.status(404).send("Không tìm thấy đơn");
    }

    // USER chỉ xem đơn của mình
    if (req.user.role !== 'ADMIN' && order[0].user_id !== req.user.id) {
      return res.status(403).send("Không có quyền");
    }

    const items = await query(`
      SELECT oi.*, p.name
      FROM order_items oi
      JOIN products p ON oi.product_id = p.id
      WHERE oi.order_id = ?
    `, [req.params.id]);

    order[0].items = items;

    res.json(order[0]);

  } catch (err) {
    console.error(err);
    res.status(500).send("Lỗi server");
  }
});

app.listen(PORT, () => {
  console.log(`Server chạy tại http://localhost:${PORT}`);

  createAdminIfNotExists(); // THÊM DÒNG NÀY
});