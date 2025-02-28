const jwt = require('jsonwebtoken');

const auth = async (req, res, next) => {
  if (!req.header('Authorization')) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const token = req.header('Authorization').replace('Bearer ', '');
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    console.error('Token verification error:', error); // Log the error for debugging
    res.status(401).json({ error: 'Authentication required' });
  }
};

module.exports = auth;
