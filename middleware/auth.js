const jwt = require('jsonwebtoken');
exports.requireAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.sendStatus(401);
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch {
    res.sendStatus(403);
  }
};
exports.requireAdmin = (req, res, next) => {
  if (req.user?.role !== 'admin') return res.sendStatus(403);
  next();
};
