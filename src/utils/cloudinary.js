import { v2 as cloudinary } from "cloudinary";
import fs from "fs";

// Log the values of the environment variables (Do NOT keep this in production)
console.log("Cloudinary Configuration:");
console.log("CLOUD_NAME:", process.env.CLOUDINARY_CLOUD_NAME);
console.log("API_KEY:", process.env.CLOUDINARY_API_KEY);
console.log("API_SECRET:", process.env.CLOUDINARY_API_SECRET);

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});


// Function to upload files to Cloudinary
const uploadOnCloudinary = async (localFilePath) => {
    try {
        if (!localFilePath) {
            console.log("No local file path provided for Cloudinary upload");
            return null;
        }

        console.log("Uploading file to Cloudinary:", localFilePath); // Log file path

        // Upload the file to Cloudinary
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type: "auto" // Auto-detect the resource type (image, video, etc.)
        });

        // Log the success of the Cloudinary upload
        console.log("File uploaded to Cloudinary successfully:", response.url);

        // Remove the temporary file from the server after successful upload
        fs.unlinkSync(localFilePath);

        return response; // Return the Cloudinary response
    } catch (error) {
        console.error("Cloudinary upload failed:", error.message); // Log detailed error

        // Remove the file if there was an error
        if (fs.existsSync(localFilePath)) {
            console.log("Deleting local file after Cloudinary upload failure:", localFilePath);
            fs.unlinkSync(localFilePath);
        }

        return null; // Return null in case of failure
    }
};

export default uploadOnCloudinary;
