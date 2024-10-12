import asyncHandler from "../utils/asyncHandler.js";  
import User from "../models/user.model.js"; 
import {uploadOnCloudinary} from "../utils/cloudinary.js"; 
import ApiResponse from "../utils/ApiResponse.js"; 
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js"; // Change to the correct case


// Function to generate access and refresh tokens for a user

const generateAccessAndRefreshToken = async (userId) => {
    try {
        // Log the start of the token generation process
        console.log("Generating access and refresh tokens for user ID:", userId);

        // Fetch the user from the database using the provided userId
        const user = await User.findById(userId);
        if (!user) {
            console.error("User not found with ID:", userId);
            throw new ApiError(404, "User not found");
        }

        // Generate access token for the user
        const accessToken = await user.generateAccessToken();
        console.log("Access token generated:", accessToken);

        // Generate refresh token for the user
        const refreshToken = await user.generateRefreshToken();
        console.log("Refresh token generated:", refreshToken);

        // Save the refresh token in the user's record
        user.refreshToken = refreshToken;

        // Save the user with the new refresh token without validating other fields
        await user.save({ validateBeforeSave: false });
        console.log("User saved with new refresh token:", userId);

        // Return both tokens
        return { accessToken, refreshToken };

    } catch (error) {
        console.error("Error generating access and refresh tokens:", error.message);
        throw new ApiError(500, "Something went wrong while generating refresh and access tokens");
    }
};

const registerUser = asyncHandler(async (req, res) => {
    // Log the request body and files for debugging purposes
    console.log("Register user request body:", req.body);
    console.log("Register user request files:", req.files);

    // Step 1: Extract user details from the request body
    const { fullName, email, username, password } = req.body;

    // Step 2: Validate all required fields
    if ([fullName, email, username, password].some((field) => field?.trim() === "")) {
        throw new ApiError(400, "All fields are required");
    }

    // Step 3: Check if the user already exists in the database by email or username
    const existedUser = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (existedUser) {
        throw new ApiError(409, "User with email or username already exists");
    }

    console.log(req.files);

    // Step 4: Handle file uploads for avatar and cover image
    const avatarLocalPath = req.files?.avatar[0]?.path;
    console.log("Avatar local file path:", avatarLocalPath); // Log avatar path
    let coverImageLocalPath;

    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path;
    }

    // Step 5: Ensure the avatar is provided, otherwise throw an error
    if (!avatarLocalPath) {
        throw new ApiError(400, "Avatar file is required");
    }

    // Step 6: Upload files to Cloudinary
    const avatar = await uploadOnCloudinary(avatarLocalPath);
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    if (!avatar) {
        throw new ApiError(400, "Avatar file upload failed"); // This will throw if Cloudinary upload fails
    }

    // Step 7: Create a new user in the database
    const user = await User.create({
        fullName,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",
        email,
        password,
        username: username.toLowerCase()
    });

    // Step 8: Fetch the created user, excluding sensitive fields
    const createdUser = await User.findById(user._id).select("-password -refreshToken");

    if (!createdUser) {
        throw new ApiError(500, "Something went wrong while registering the user");
    }

    // Step 9: Return a success response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered Successfully")
    );
});

const loginUser = asyncHandler(async (req, res) => {
    console.log("Login user request body:", req.body);  // Debugging log to track incoming request data

    const { email, username, password } = req.body;

    // Check if username or email and password are provided
    if (!(username || email) || !password) {
        throw new ApiError(400, "Email/Username and password are required");
    }

    // Find user by username or email
    const user = await User.findOne({
        $or: [{ username }, { email }]
    });

    if (!user) {
        throw new ApiError(401, "Invalid email or username");
    }

    // Validate the password
    const isPasswordValid = await user.isPasswordCorrect(password);  // bcrypt.compare will be called here

    if (!isPasswordValid) {
        console.error(`Invalid password for user: ${username}`);
        throw new ApiError(401, "Invalid user credentials");
    }

    // Generate tokens and proceed with the rest of the login flow
    const { accessToken, refreshToken } = await generateAccessAndRefreshToken(user._id);
    const loggedInUser = await User.findById(user._id).select("-password -refreshToken");

    const options = {
        httpOnly: true,
        secure: true
    };

    return res
        .status(200)
        .cookie("access_token", accessToken, options)
        .cookie("refresh_token", refreshToken, options)
        .json(
            new ApiResponse(200, {
                user: loggedInUser,
                accessToken,
                refreshToken
            }, "User logged in successfully")
        );
});

const logoutUser = asyncHandler(async (req, res) => {
    console.log("Logging out user:", req.user); // Debug log for the user
    
    // Remove refresh token from DB
    await User.findByIdAndUpdate(
        req.user._id,
        { refreshToken: undefined },  // Clear refresh token from user
        { new: true }
    );

    // Options for clearing cookies
    const options = {
        httpOnly: true,  //// Secure cookies by making them inaccessible via JavaScript
        secure: true,   // Should be true in production over HTTPS
        sameSite: "None",  // For cross-site requests
        domain: "localhost",  // Adjust this to your domain
        path: "/"  // Clear cookie for the root path
    };

    // Clear the access and refresh tokens in the response
    return res.status(200)
        .clearCookie("access_token", options)  // Clear access token
        .clearCookie("refresh_token", options) // Clear refresh token
        .json(new ApiResponse(200, {}, "User logged out successfully"));
});

const refreshAccessToken = asyncHandler(async (req, res) => {
    // Log incoming request details for debugging
    console.log("=== Refresh Token Request ===");
    console.log("Request cookies:", req.cookies);  // Check what cookies are sent in the request
    console.log("Request body:", req.body);  // Log body (in case refreshToken is sent in the request body)
    
    // Extract refresh token either from cookies or the request body
    const incomingRefreshToken = req.cookies.refreshToken || req.body.refreshToken;

    // Check if the refresh token is present
    if (!incomingRefreshToken) {
        console.error("Unauthorized request: No refresh token provided");
        throw new ApiError(401, "Unauthorized request");
    }

    try {
        // Verify the refresh token using the secret key from environment variables
        const decodedToken = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);
        console.log("Decoded refresh token:", decodedToken);  // Debugging log for decoded token

        // Find the user by ID from the decoded token payload
        const user = await User.findById(decodedToken?._id);
        console.log("User found for refresh token:", user ? user._id : "None");  // Debugging log to check if user was found

        // Check if the user exists
        if (!user) {
            console.error("Invalid refresh token: User not found");
            throw new ApiError(401, "Invalid refresh token");
        }

        // Validate if the incoming refresh token matches the user's stored refresh token
        if (user.refreshToken !== incomingRefreshToken) {
            console.error("Refresh token mismatch or expired");
            throw new ApiError(401, "Refresh token is invalid or expired");
        }

        // Generate a new access token and refresh token for the user
        const { accessToken, newrefreshToken } = await generateAccessAndRefreshToken(user._id);
        console.log("Newly generated access token:", accessToken);  // Log the new access token
        console.log("Newly generated refresh token:", newrefreshToken);  // Log the new refresh token

        // Cookie options for secure handling
        const options = {
            httpOnly: true,  // Secure cookies by making them inaccessible via JavaScript
            secure: true, // Use secure cookies in production only
            sameSite: "None",  // Allow cross-site cookie sharing
            domain: "localhost",  // Set your domain or adjust for production
            path: "/"  // Make the cookie available across your entire app
        };

        // Send the new tokens back to the client in cookies and JSON response
        return res
            .status(200)
            .cookie("accessToken", accessToken, options)  // Set new access token cookie
            .cookie("refreshToken", newrefreshToken, options)  // Set new refresh token cookie
            .json(new ApiResponse(200, {
                accessToken,
                refreshToken: newrefreshToken
            }, "User's access token refreshed successfully"));

    } catch (error) {
        // Log any error during the refresh process for debugging
        console.error("Error refreshing access token:", error.message);
        throw new ApiError(500, error?.message || "Error refreshing access token");
    }
});


const changeCurrentPassword = asyncHandler(async (req, res) => {
    // Log the user's information from the request (for debugging purposes)
    console.log("Changing current password for user:", req.user);

    // Destructure the old and new password from the request body
    const { oldPassword, newPassword } = req.body;

    // Check if both oldPassword and newPassword are provided
    if (!oldPassword || !newPassword) {
        console.log("Old or new password not provided for user:", req.user?._id);
        throw new ApiError(400, "Both old and new passwords must be provided");
    }

    // Find the user in the database using the user ID obtained from the request object
    const user = await User.findById(req.user?._id);

    // Check if the user exists
    if (!user) {
        console.log("User not found:", req.user?._id);
        throw new ApiError(404, "User not found");
    }

    // Check if the old password provided is correct by calling the instance method on the user model
    const isPasswordCorrect = await user.isPasswordCorrect(oldPassword);

    // If the old password does not match, throw an error with a 400 status code
    if (!isPasswordCorrect) {
        // Log the failed password check (for debugging purposes)
        console.log("Password mismatch for user:", req.user?._id);
        throw new ApiError(400, "Invalid old password");
    }

    // Update the user's password with the new password
    user.password = newPassword;

    // Save the user object without running the validators (password will be hashed before saving)
    await user.save({ validateBeforeSave: false });

    // Respond with a success message once the password is changed
    return res.status(200).json(
        new ApiResponse(200, {}, "Password changed successfully")
    );
});

const getCurrentUser = asyncHandler(async(req, res) => {
    // Log the user's information from the request (for debugging purposes)
    console.log("Fetching current user data:", req.user);

    // Return the current user data in the response along with a success message
    return res.status(200).json(
        new ApiResponse(200, req.user, "Current user fetched successfully")
    );
});

const updateAccountDetails = asyncHandler(async (req, res) => {
    // Log the user's information from the request (for debugging purposes)
    console.log("Updating account details for user:", req.user);

    // Destructure the updated account details (full name and email) from the request body
    const { fullName, email } = req.body;

    // Ensure that both full name and email are provided in the request
    if (!fullName || !email) {
        // Log an error message for missing fields (for debugging purposes)
        console.log("Missing full name or email in the request body");
        throw new ApiError(400, "Full name and email are required");
    }

    // Find the user in the database by user ID and update their full name and email
    const user = await User.findByIdAndUpdate(
        req.user?._id, 
        { 
            $set: {
                fullName,
                email: email
            } 
        }, 
        { new: true } // Ensure the updated user document is returned
    ).select("-password"); // Exclude the password field from the returned document

    // Log the updated user object (for debugging purposes)
    console.log("Updated account details for user:", user);

    // Respond with the updated user information and success message
    return res
        .status(200)
        .json(new ApiResponse(200, user, "Account details successfully updated"));
});

const updateUserAvatar = asyncHandler(async (req, res) => {
    // Log the user's information from the request (for debugging purposes)
    console.log("Updating user avatar for user:", req.user);

    // Extract the local file path of the uploaded avatar from the request
    const avatarLocalPath = req.files?.path;

    // Check if an avatar file was uploaded with the request
    if (!avatarLocalPath) {
        // Log an error message for missing avatar file (for debugging purposes)
        console.log("No avatar file uploaded in the request");
        throw new ApiError(400, "Avatar file is missing");
    }

    // Upload the avatar to Cloudinary and get the response
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    // Check if the Cloudinary upload was successful
    if (!avatar.url) {
        // Log an error message if the upload failed (for debugging purposes)
        console.log("Error uploading avatar to Cloudinary");
        throw new ApiError(400, "Error uploading avatar to Cloudinary");
    }

    // Update the user's avatar URL in the database
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { avatar: avatar.url } },
        { new: true } // Return the updated user document
    ).select("-password"); // Exclude the password field from the returned document

    // Log the successful avatar update (for debugging purposes)
    console.log("User avatar updated successfully:", user);

    // Respond with the updated user information and success message
    return res.status(200).json(new ApiResponse(200, user, "Avatar successfully updated"));
});

const updateUserCoverImage = asyncHandler(async (req, res) => {
    // Log the user's information from the request (for debugging purposes)
    console.log("Updating cover image for user:", req.user);

    // Extract the local file path of the uploaded cover image from the request
    const coverImageLocalPath = req.files?.path;

    // Check if a cover image file was uploaded with the request
    if (!coverImageLocalPath) {
        // Log an error message for missing cover image file (for debugging purposes)
        console.log("No cover image file uploaded in the request");
        throw new ApiError(400, "Cover image file is missing");
    }

    // Upload the cover image to Cloudinary and get the response
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);

    // Check if the Cloudinary upload was successful
    if (!coverImage.url) {
        // Log an error message if the upload failed (for debugging purposes)
        console.log("Error uploading cover image to Cloudinary");
        throw new ApiError(400, "Error uploading cover image to Cloudinary");
    }

    // Update the user's cover image URL in the database
    const user = await User.findByIdAndUpdate(
        req.user?._id,
        { $set: { coverImage: coverImage.url } },
        { new: true } // Return the updated user document
    ).select("-password"); // Exclude the password field from the returned document

    // Log the successful cover image update (for debugging purposes)
    console.log("User cover image updated successfully:", user);

    // Respond with the updated user information and success message
    return res.status(200).json(new ApiResponse(200, user, "Cover image successfully updated"));
});

const getUserChannelProfile = asyncHandler(async (req, res) => {
    // Log the user's information from the request (for debugging purposes)
    console.log("Fetching user channel profile for user:", req.user);

    // Destructure the username from the request parameters
    const { username } = req.params;

    // Validate the username parameter
    if (!username?.trim()) {
        // Log an error message for missing username (for debugging purposes)
        console.log("Missing username in the request parameters");
        throw new ApiError(400, "Username is required");
    }

    // Aggregate pipeline to find the user, their subscribers, and their subscriptions
    const channel = await User.aggregate([
        {
            $match: { 
                username: username?.toLowerCase() // Match the username in a case-insensitive manner
            }
        },
        {
            $lookup: {
                from: "subscriptions", // Join with the "subscriptions" collection for subscribers
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {
                from: "subscriptions", // Join with the "subscriptions" collection for channels the user is subscribed to
                localField: "_id",
                foreignField: "subscriber",
                as: "subscriptedTo"
            }
        },
        {
            $addFields: {
                subscribersCount: { $size: "$subscribers" }, // Count the number of subscribers
                channelSubscribedCount: { $size: "$subscriptedTo" }, // Count the number of channels the user is subscribed to
                isSubscribed: {
                    $cond: {
                        if: { $in: [req.user?._id, "$subscribers.subscriber"] }, // Check if the current user is subscribed
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                _id: 1,
                username: 1,
                avatar: 1,
                coverImage: 1,
                fullName: 1,
                email: 1,
                createdAt: 1,
                updatedAt: 1,
                subscribersCount: 1,
                channelSubscribedCount: 1,
                isSubscribed: 1 // Only project the required fields
            }
        }
    ]);

    // Log the channel details fetched from the database (for debugging purposes)
    console.log("Channel details fetched:", channel);

    // If no user is found with the given username
    if (!channel?.length) {
        // Log an error message for missing user (for debugging purposes)
        console.log("User not found with username:", username);
        throw new ApiError(404, "User not found");
    }

    // Respond with the user channel profile data and success message
    return res.status(200).json(
        new ApiResponse(200, channel[0], "User channel profile fetched successfully")
    );
});

const getWatchHistory = asyncHandler(async(req, res) => {
    // Log the user's information from the request (for debugging purposes)
    console.log("Fetching watch history for user:", req.user);

    // Perform aggregation on the User collection to fetch the watch history
    const user = await User.aggregate([
        {
            // Match the user by their _id
            $match: {
                _id: new mongoose.Types.ObjectId(req.user._id),
            }
        },
        {
            // Lookup the "videos" collection based on the watchHistory field (which contains video IDs)
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [
                    {
                        // Perform another lookup on the "users" collection to get details of the video owner
                        $lookup: {
                            from: "users",
                            localField: "owner", // The owner's ID in the videos collection
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    // Only return specific fields (fullName, username, and avatar) for the owner
                                    $project: {
                                        fullName: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        // Add the first owner found to the watchHistory (since each video has only one owner)
                        $addFields: {
                            owner: {
                                $first: "$owner",
                            }
                        }
                    }
                ]
            },
        }
    ]);

    // Log the watch history fetched from the database (for debugging purposes)
    console.log("Watch history fetched:", user);

    // Send the response back to the client with a status of 200 and the watch history data
    return res
        .status(200)
        .json(new ApiResponse(
            200, 
            user[0].watchHistory,
            "Watch history fetched successfully"
        ));
});


export default {
    registerUser,
    loginUser,
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
};
