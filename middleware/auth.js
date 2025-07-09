import jwt from 'jsonwebtoken';
import config from '../config.js';

export const auth = async (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  console.log(token)
  try {
    const decoded = jwt.verify(token, config.jwtSecret);
    req.user = decoded;
    req.userId = decoded.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};
