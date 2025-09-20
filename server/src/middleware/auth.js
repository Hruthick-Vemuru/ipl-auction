import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../../config.js";

export const auth = async (req, res, next) => {
  try {
    let token;
    // Check for token in Authorization header first
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }
    // Fallback to checking cookies
    else if (req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ error: "No token, authorization denied" });
    }

    const verified = jwt.verify(token, JWT_SECRET);
    req.user = verified;
    next();
  } catch (error) {
    res.status(401).json({ error: "Token is not valid" });
  }
};
