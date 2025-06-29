// middleware/errorHandler.js
export const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: 'Internal Server Error', detail: err.message });
};
