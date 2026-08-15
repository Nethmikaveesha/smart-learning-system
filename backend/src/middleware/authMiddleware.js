import jwt from "jsonwebtoken";
import User from "../models/User.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];

      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET
      );

      req.user = await User.findById(decoded.id).select("-password");

      // Deleted / missing user
      if (!req.user) {
        return res.status(401).json({
          message: "Not authorized. User account was not found.",
        });
      }

      // Inactive / disabled accounts cannot use protected APIs
      if (!req.user.isActive) {
        return res.status(403).json({
          message: "This account is inactive. Please contact your school admin.",
        });
      }

      next();
    } else {
      return res.status(401).json({
        message: "Not authorized, no token",
      });
    }
  } catch (error) {
    return res.status(401).json({
      message: "Not authorized",
    });
  }
};

export const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied. ${req.user.role} is not allowed.`,
      });
    }

    next();
  };
};