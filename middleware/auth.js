const jwt = require('jsonwebtoken');

const auth = (req, res, next) => {
  try {
    console.log("Auth Middleware: Checking token...");
    const token = req.header("Authorization")?.split(" ")[1];

    if (!token) {
      console.log("Auth Middleware: No token provided.");
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log("Auth Middleware: Decoded User:", decoded);

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Auth Middleware Error:", error);
    return res.status(401).json({ error: "Unauthorized: Invalid token" });
  }
};


module.exports = auth;