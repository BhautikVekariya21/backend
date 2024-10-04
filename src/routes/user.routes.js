import { Router } from "express";
import registerUser from "../controllers/user.controller.js"; // Ensure path is correct
import { upload } from "../middlewares/multer.middleware.js"; // Ensure path is correct
import cloudinary from "cloudinary"; // Import Cloudinary

const router = Router();

// Define route for user registration with file upload
router.route("/register").post(
    upload.fields([
        { name: "avatar", maxCount: 1 },
        { name: "coverImage", maxCount: 1 }
    ]),
    async (req, res, next) => {
        // Log the incoming request body and files for debugging
        console.log("Incoming request body before upload:", req.body);
        console.log("Incoming request files:", req.files);

        if (!req.files || !req.files.avatar || !req.files.coverImage) {
            console.error("File upload error: Missing required files");
            return res.status(400).json({ error: "Missing required files" });
        }

        try {
            // Upload the avatar to Cloudinary
            const avatarUploadResponse = await cloudinary.uploader.upload(req.files.avatar[0].path);
            // Log the entire Cloudinary response for the avatar
            console.log("Cloudinary response for avatar:", JSON.stringify(avatarUploadResponse, null, 2));

            // Upload the cover image to Cloudinary
            const coverImageUploadResponse = await cloudinary.uploader.upload(req.files.coverImage[0].path);
            // Log the entire Cloudinary response for the cover image
            console.log("Cloudinary response for cover image:", JSON.stringify(coverImageUploadResponse, null, 2));

            // Add the Cloudinary URLs to the request body
            req.body.avatar = avatarUploadResponse.secure_url; // Save Cloudinary URL for avatar
            req.body.coverImage = coverImageUploadResponse.secure_url; // Save Cloudinary URL for cover image

            // Log the modified request body after uploads
            console.log("Modified request body after upload:", req.body);

            // Call the registerUser controller function
            next();
        } catch (error) {
            console.error("Error uploading to Cloudinary:", error);
            return res.status(500).json({ error: "Error uploading to Cloudinary" });
        }
    },
    registerUser // Call the registerUser controller function
);

export default router;
