import { Router } from "express";
// import { registerUser, loginUser, logoutUser } from "../controllers/user.controller.js"; // Make sure controllers are imported correctly
import { upload } from "../middlewares/multer.middleware.js"; // Ensure the Multer middleware path is correct
import cloudinary from "cloudinary"; // Import Cloudinary
import { verifyJWT } from "../middlewares/auth.middleware.js"; // Ensure JWT middleware is correctly imported
import userController from "../controllers/user.controller.js"; // Correct import for default exports

const { registerUser, loginUser, logoutUser,refreshAccessToken } = userController; // Destructure the needed functions


const router = Router();

// Define route for user registration with file upload
router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },     // Expecting a single avatar file
        { name: "coverImage", maxCount: 1 }  // Expecting a single cover image file
    ]),
    async (req, res, next) => {
        // Log the incoming request body and files for debugging
        console.log("Incoming request body before upload:", req.body);   // Body fields before file upload
        console.log("Incoming request files:", req.files);               // Uploaded files

        // Check if required files are present
        if (!req.files || !req.files.avatar || !req.files.coverImage) {
            console.error("File upload error: Missing required files");
            return res.status(400).json({ error: "Missing required files" });   // Return error if files are missing
        }

        try {
            // Upload the avatar file to Cloudinary and log the response
            const avatarUploadResponse = await cloudinary.uploader.upload(req.files.avatar[0].path, {
                folder: 'avatars' // Optional: Specify a folder in Cloudinary
            });
            console.log("Cloudinary response for avatar:", JSON.stringify(avatarUploadResponse, null, 2));

            // Upload the cover image file to Cloudinary and log the response
            const coverImageUploadResponse = await cloudinary.uploader.upload(req.files.coverImage[0].path, {
                folder: 'coverImages' // Optional: Specify a folder in Cloudinary
            });
            console.log("Cloudinary response for cover image:", JSON.stringify(coverImageUploadResponse, null, 2));

            // Add the Cloudinary URLs to the request body for further processing
            req.body.avatar = avatarUploadResponse.secure_url;            // Store avatar URL in request body
            req.body.coverImage = coverImageUploadResponse.secure_url;    // Store cover image URL in request body

            // Log the modified request body after file uploads
            console.log("Modified request body after upload:", req.body);

            // Move to the next middleware/controller (registerUser)
            next();
        } catch (error) {
            // Log any errors that occurred during the Cloudinary upload
            console.error("Error uploading to Cloudinary:", error);
            return res.status(500).json({ error: "Error uploading to Cloudinary" }); // Return error response if upload fails
        }
    },
    registerUser // Call the registerUser controller function after successful file upload
);

// Define route for user login
router.route("/login").post(loginUser);  // POST request to login a user, using loginUser controller

// Define route for user logout (requires authentication via JWT)
router.route("/logout").post(verifyJWT, logoutUser); // Logout route protected with verifyJWT middleware

// Define route for user refreshing JWT (requires authentication via JWT)
router.route("/refresh-token").post(refreshAccessToken); // POST request to refresh

export default router;
