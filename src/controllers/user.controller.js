import asyncHandler from "../utils/asyncHandler.js"; // Default export
import ApiError from "../utils/ApiError.js"; // Custom error handling class
import { User } from "../utils/User.js"; // User model from the database
import cloudinary from "../utils/cloudinary.js"; // Cloudinary for image uploads
import ApiResponse from "../utils/ApiResponse.js"; // Custom response structure

const registerUser = asyncHandler(async (req, res) => {
    // Step 1: Get user details from the request body
    const { fullName, email, username, password } = req.body;
    console.log("Received data:", { fullName, email, username });

    // Step 2: Validation - Ensure all fields are not empty
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        console.log("Validation failed: Missing fields");
        throw new ApiError(400, "All fields must be filled");
    }

    // Step 3: Check if user already exists (by username or email)
    const existedUser = await User.findOne({ $or: [{ username }, { email }] });
    if (existedUser) {
        console.log("User already exists with email or username");
        throw new ApiError(400, "User already exists");
    }

    // Step 4: Handle file uploads for avatar and cover image
    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverImageLocalPath = req.files?.coverImage?.[0]?.path;
    
    if (!avatarLocalPath) {
        console.log("No avatar uploaded");
        throw new ApiError(400, "Please upload an avatar");
    }

    console.log("Avatar path:", avatarLocalPath);
    console.log("Cover Image path:", coverImageLocalPath);

    // Step 5: Upload avatar and cover image to Cloudinary
    const avatar = await cloudinary.uploader.upload(avatarLocalPath);
    const coverImage = coverImageLocalPath ? await cloudinary.uploader.upload(coverImageLocalPath) : null;

    if (!avatar) {
        console.log("Failed to upload avatar to Cloudinary");
        throw new ApiError(500, "Failed to upload avatar");
    }

    // Step 6: Create new user entry in the database
    const newUser = await User.create({
        fullName,
        avatar: avatar.url, // Store Cloudinary URL for the avatar
        coverImage: coverImage ? coverImage.url : null, // Optional cover image
        email,
        password,
        username: username.toLowerCase(),
    });

    console.log("User created:", newUser);

    // Step 7: Retrieve user details without password and refresh token
    const createdUser = await User.findById(newUser._id).select("-password -refreshToken");
    if (!createdUser) {
        console.log("User creation failed");
        throw new ApiError(500, "User not found after creation");
    }

    // Step 8: Return success response
    return res.status(201).json(
        new ApiResponse(201, createdUser, "User created successfully")
    );
});

export default registerUser; // Default export for use in routes
