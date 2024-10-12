import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import User from "../models/user.model.js";

// Middleware to verify JWT token
// This middleware is used to authenticate routes by checking the JWT token
// - Retrieves token from cookies or Authorization header
// - Verifies the token using the secret key
// - Attaches the decoded user data to the request object
// - Throws an error if the token is missing or invalid
// Example usage: app.use(verifyJWT) before protected routes

export const verifyJWT = asyncHandler(async (req, res, next) => {
    // Try to get the token from cookies or headers
    const token = req.cookies?.access_token || req.header("Authorization")?.replace("Bearer ", "");  // Access the correct cookie name

    // Log the headers and cookies for debugging
    console.log("Headers:", req.headers);  // Log all headers
    console.log("Authorization header:", req.header("Authorization"));
    console.log("Cookies:", req.cookies);  // Log cookies to check what's being sent
    console.log("Extracted token:", token);  // Log the extracted token

    // If no token is found, throw an error
    if (!token) {
        console.error("Authentication token not found");
        return res.status(401).json({ message: "Authentication token not found" });
    }

    // Verify the token
    try {
        const decodedToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
        const user = await User.findById(decodedToken._id).select("-password -refreshToken");
        
        if (!user) {
            console.error("User not found");
            return res.status(401).json({ message: "User not found" });
        }

        req.user = user;  // Attach the user to the request object
        next();  // Proceed to the next middleware
    } catch (error) {
        console.error("JWT verification error:", error.message);
        return res.status(401).json({ message: "Invalid Access Token" });
    }
});

