const jwt = require('jsonwebtoken');

const SECRET = 'MY_SECRET_KEY';

function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader) {
    return res.status(403).send('Không có token');
  }

  // format: "Bearer token"
  const token = authHeader.split(' ')[1];

  if (!token) {
    return res.status(403).send('Token sai format');
  }

  jwt.verify(token, SECRET, (err, decoded) => {
    if (err) {
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

module.exports = { verifyToken, isAdmin, SECRET };