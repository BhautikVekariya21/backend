import asyncHandler from "../utils/asyncHandler.js";
import ApiError from '../utils/apiError.js'
import  Video  from "../models/video.model.js";
import  User  from "../models/user.model.js";
import { Comment } from "../models/comment.model.js";
import {
    uploadOnCloudinary,
    deleteOnCloudinary
} from "../utils/cloudinary.js";
import ApiResponse from "../utils/ApiResponse.js";
import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";

// get all videos based on query, sort, pagination
// Get all videos based on query, sort, pagination
const getAllVideos = asyncHandler(async (req, res) => {
    const { page = 1, limit = 10, query, sortBy, sortType, userId } = req.query;

    // Debugging logs to check the input query parameters
    console.log("Query parameters:", { page, limit, query, sortBy, sortType, userId });

    const pipeline = [];

    // Full-text search index for MongoDB Atlas
    // Searching only in the title and description fields for the specified query
    if (query) {
        console.log("Search query:", query); // Debug log for the query

        pipeline.push({
            $search: {
                index: "search-videos", // The search index created in MongoDB Atlas
                text: {
                    query: query,
                    path: ["title", "description"] // Limiting search to title and description fields
                }
            }
        });
    }

    // If userId is provided, match only the videos owned by the specified user
    if (userId) {
        console.log("Filtering videos by userId:", userId); // Debug log for userId filtering

        // Check if the provided userId is a valid ObjectId
        if (!isValidObjectId(userId)) {
            throw new ApiError(400, "Invalid userId");
        }

        pipeline.push({
            $match: {
                owner: new mongoose.Types.ObjectId(userId) // Matching videos by userId
            }
        });
    }

    // Fetch only published videos (isPublished must be true)
    pipeline.push({ $match: { isPublished: true } });

    // Sorting based on specified sortBy and sortType parameters
    if (sortBy && sortType) {
        console.log(`Sorting videos by ${sortBy} in ${sortType === "asc" ? "ascending" : "descending"} order`);

        pipeline.push({
            $sort: {
                [sortBy]: sortType === "asc" ? 1 : -1 // Sort based on sortType (ascending or descending)
            }
        });
    } else {
        // Default sorting by creation date in descending order
        pipeline.push({ $sort: { createdAt: -1 } });
    }

    // Using $lookup to join the users collection and fetch owner details (username and avatar)
    pipeline.push(
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "ownerDetails",
                pipeline: [
                    {
                        $project: {
                            username: 1, // Only include username in the results
                            "avatar.url": 1 // Include avatar URL
                        }
                    }
                ]
            }
        },
        {
            $unwind: "$ownerDetails" // Unwind the ownerDetails array to include only one user per video
        }
    );

    // Debug log for pipeline structure
    console.log("Pipeline:", JSON.stringify(pipeline, null, 2));

    // Using aggregate pagination to fetch videos based on the pipeline
    const videoAggregate = Video.aggregate(pipeline);
    
    const options = {
        page: parseInt(page, 10), // Convert page to integer
        limit: parseInt(limit, 10) // Convert limit to integer
    };

    // Execute the aggregate query with pagination
    const video = await Video.aggregatePaginate(videoAggregate, options);

    // Debug log for the final fetched videos
    console.log("Fetched videos:", JSON.stringify(video, null, 2));

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Videos fetched successfully"));
});
// Upload video and thumbnail to Cloudinary, create and save video document in the database
const publishAVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;

    // Debug log for incoming request body
    console.log("Request body:", { title, description });

    // Check if required fields are present and non-empty
    if ([title, description].some((field) => field?.trim() === "")) {
        console.error("Validation Error: Missing required fields");
        throw new ApiError(400, "All fields are required");
    }

    const videoFileLocalPath = req.files?.videoFile[0].path;
    const thumbnailLocalPath = req.files?.thumbnail[0].path;

    // Debug log for the uploaded file paths
    console.log("Uploaded file paths:", { videoFileLocalPath, thumbnailLocalPath });

    // Check if video file and thumbnail paths are present
    if (!videoFileLocalPath) {
        console.error("Error: videoFileLocalPath is missing");
        throw new ApiError(400, "videoFileLocalPath is required");
    }

    if (!thumbnailLocalPath) {
        console.error("Error: thumbnailLocalPath is missing");
        throw new ApiError(400, "thumbnailLocalPath is required");
    }

    // Upload video file to Cloudinary
    const videoFile = await uploadOnCloudinary(videoFileLocalPath);
    // Debug log for video file upload
    console.log("Video file uploaded to Cloudinary:", videoFile);

    // Upload thumbnail to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);
    // Debug log for thumbnail upload
    console.log("Thumbnail uploaded to Cloudinary:", thumbnail);

    // Check if video file and thumbnail were successfully uploaded
    if (!videoFile) {
        console.error("Error: Failed to upload video file to Cloudinary");
        throw new ApiError(400, "Video file not found");
    }

    if (!thumbnail) {
        console.error("Error: Failed to upload thumbnail to Cloudinary");
        throw new ApiError(400, "Thumbnail not found");
    }

    // Create a new video document in the database
    const video = await Video.create({
        title,
        description,
        duration: videoFile.duration, // Assuming Cloudinary provides duration metadata
        videoFile: {
            url: videoFile.url,
            public_id: videoFile.public_id
        },
        thumbnail: {
            url: thumbnail.url,
            public_id: thumbnail.public_id
        },
        owner: req.user?._id, // Owner is the currently logged-in user
        isPublished: false // Video will be unpublished by default
    });

    // Debug log for created video document
    console.log("Video created:", video);

    // Check if video document was successfully saved to the database
    const videoUploaded = await Video.findById(video._id);
    
    // Debug log for the final video retrieval
    console.log("Final uploaded video fetched:", videoUploaded);

    if (!videoUploaded) {
        console.error("Error: Video upload failed");
        throw new ApiError(500, "Video upload failed, please try again!");
    }

    return res
        .status(200)
        .json(new ApiResponse(200, video, "Video uploaded successfully"));
});
// Get video details by video ID, including likes, owner info, and subscription status
const getVideoById = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Debug log for incoming video ID and user ID
    console.log("Received videoId:", videoId);
    console.log("Requesting userId:", req.user?._id);

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        console.error("Invalid videoId:", videoId);
        throw new ApiError(400, "Invalid videoId");
    }

    // Validate userId
    if (!isValidObjectId(req.user?._id)) {
        console.error("Invalid userId:", req.user?._id);
        throw new ApiError(400, "Invalid userId");
    }

    // Fetch video details with likes, owner info, and subscription status
    const video = await Video.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(videoId)
            }
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes"
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {
                        $lookup: {
                            from: "subscriptions",
                            localField: "_id",
                            foreignField: "channel",
                            as: "subscribers"
                        }
                    },
                    {
                        $addFields: {
                            subscribersCount: {
                                $size: "$subscribers"
                            },
                            isSubscribed: {
                                $cond: {
                                    if: {
                                        $in: [
                                            req.user?._id,
                                            "$subscribers.subscriber"
                                        ]
                                    },
                                    then: true,
                                    else: false
                                }
                            }
                        }
                    },
                    {
                        $project: {
                            username: 1,
                            "avatar.url": 1,
                            subscribersCount: 1,
                            isSubscribed: 1
                        }
                    }
                ]
            }
        },
        {
            $addFields: {
                likesCount: {
                    $size: "$likes"
                },
                owner: {
                    $first: "$owner"
                },
                isLiked: {
                    $cond: {
                        if: {$in: [req.user?._id, "$likes.likedBy"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {
                "videoFile.url": 1,
                title: 1,
                description: 1,
                views: 1,
                createdAt: 1,
                duration: 1,
                comments: 1,
                owner: 1,
                likesCount: 1,
                isLiked: 1
            }
        }
    ]);

    // Debug log for video data after aggregation
    console.log("Aggregated video data:", video);

    // Check if video was found
    if (!video) {
        console.error("Error: Failed to fetch video");
        throw new ApiError(500, "Failed to fetch video");
    }

    // Increment video views if video is found
    await Video.findByIdAndUpdate(videoId, {
        $inc: {
            views: 1
        }
    });

    // Debug log for view count increment
    console.log(`Video views incremented for videoId: ${videoId}`);

    // Add video to user's watch history
    await User.findByIdAndUpdate(req.user?._id, {
        $addToSet: {
            watchHistory: videoId
        }
    });

    // Debug log for adding video to user's watch history
    console.log(`Video added to watch history for userId: ${req.user?._id}`);

    // Return the video details in response
    return res
        .status(200)
        .json(
            new ApiResponse(200, video[0], "Video details fetched successfully")
        );
});
// Update video details like title, description, and thumbnail
const updateVideo = asyncHandler(async (req, res) => {
    const { title, description } = req.body;
    const { videoId } = req.params;

    // Debug log for incoming video ID and user ID
    console.log("Received videoId:", videoId);
    console.log("Requesting userId:", req.user?._id);

    // Validate video ID
    if (!isValidObjectId(videoId)) {
        console.error("Invalid videoId:", videoId);
        throw new ApiError(400, "Invalid videoId");
    }

    // Ensure title and description are provided
    if (!(title && description)) {
        console.error("Missing title or description");
        throw new ApiError(400, "title and description are required");
    }

    // Find video by ID
    const video = await Video.findById(videoId);

    // Check if video exists
    if (!video) {
        console.error("No video found with videoId:", videoId);
        throw new ApiError(404, "No video found");
    }

    // Check if requesting user is the owner of the video
    if (video?.owner.toString() !== req.user?._id.toString()) {
        console.error(
            `UserId ${req.user?._id} is not the owner of the video`
        );
        throw new ApiError(
            400,
            "You can't edit this video as you are not the owner"
        );
    }

    // Log old thumbnail public_id for reference
    const thumbnailToDelete = video.thumbnail.public_id;
    console.log("Old thumbnail public_id:", thumbnailToDelete);

    // Get new thumbnail path
    const thumbnailLocalPath = req.file?.path;

    // Check if thumbnail path is available
    if (!thumbnailLocalPath) {
        console.error("Thumbnail file is missing in the request");
        throw new ApiError(400, "thumbnail is required");
    }

    // Upload new thumbnail to Cloudinary
    const thumbnail = await uploadOnCloudinary(thumbnailLocalPath);

    // Check if thumbnail upload was successful
    if (!thumbnail) {
        console.error("Thumbnail upload failed");
        throw new ApiError(400, "Thumbnail not found");
    }

    // Log new thumbnail data for debugging
    console.log("New thumbnail uploaded:", thumbnail);

    // Update video with new title, description, and thumbnail
    const updatedVideo = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                title,
                description,
                thumbnail: {
                    public_id: thumbnail.public_id,
                    url: thumbnail.url
                }
            }
        },
        { new: true }
    );

    // Check if video update was successful
    if (!updatedVideo) {
        console.error("Failed to update video");
        throw new ApiError(500, "Failed to update video, please try again");
    }

    // Log updated video details for debugging
    console.log("Video updated successfully:", updatedVideo);

    // Delete old thumbnail from Cloudinary
    if (updatedVideo) {
        await deleteOnCloudinary(thumbnailToDelete);
        console.log("Old thumbnail deleted from Cloudinary:", thumbnailToDelete);
    }

    // Return updated video details in the response
    return res
        .status(200)
        .json(new ApiResponse(200, updatedVideo, "Video updated successfully"));
});
// Delete video by ID
const deleteVideo = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Log incoming request details for debugging
    console.log("Request to delete video with ID:", videoId);
    console.log("Request made by user with ID:", req.user?._id);

    // Validate video ID
    if (!isValidObjectId(videoId)) {
        console.error("Invalid videoId:", videoId);
        throw new ApiError(400, "Invalid videoId");
    }

    // Find video by ID
    const video = await Video.findById(videoId);

    // Check if video exists
    if (!video) {
        console.error("No video found with videoId:", videoId);
        throw new ApiError(404, "No video found");
    }

    // Check if requesting user is the owner of the video
    if (video?.owner.toString() !== req.user?._id.toString()) {
        console.error(
            `UserId ${req.user?._id} is not the owner of the video`
        );
        throw new ApiError(
            400,
            "You can't delete this video as you are not the owner"
        );
    }

    // Log before deleting the video
    console.log("Deleting video with ID:", video?._id);

    // Delete the video
    const videoDeleted = await Video.findByIdAndDelete(video?._id);

    // Check if video deletion was successful
    if (!videoDeleted) {
        console.error("Failed to delete video with ID:", video?._id);
        throw new ApiError(400, "Failed to delete the video, please try again");
    }

    // Log success message for video deletion
    console.log("Video deleted successfully:", video?._id);

    // Delete video thumbnail from Cloudinary
    console.log("Deleting video thumbnail from Cloudinary:", video.thumbnail.public_id);
    await deleteOnCloudinary(video.thumbnail.public_id);

    // Delete video file from Cloudinary
    console.log("Deleting video file from Cloudinary:", video.videoFile.public_id);
    await deleteOnCloudinary(video.videoFile.public_id, "video");

    // Delete associated likes
    console.log("Deleting all likes for videoId:", videoId);
    await Like.deleteMany({
        video: videoId
    });

    // Delete associated comments
    console.log("Deleting all comments for videoId:", videoId);
    await Comment.deleteMany({
        video: videoId
    });

    // Send response confirming video deletion
    console.log("Video and associated data deleted successfully for videoId:", videoId);
    return res
        .status(200)
        .json(new ApiResponse(200, {}, "Video deleted successfully"));
});
// Toggle publish status of a video
const togglePublishStatus = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Log the videoId for debugging purposes
    console.log("Request to toggle publish status for videoId:", videoId);
    console.log("Request made by user with ID:", req.user?._id);

    // Validate videoId
    if (!isValidObjectId(videoId)) {
        console.error("Invalid videoId:", videoId);
        throw new ApiError(400, "Invalid videoId");
    }

    // Find video by ID
    const video = await Video.findById(videoId);

    // Check if video exists
    if (!video) {
        console.error("Video not found for videoId:", videoId);
        throw new ApiError(404, "Video not found");
    }

    // Check if the user is the owner of the video
    if (video?.owner.toString() !== req.user?._id.toString()) {
        console.error(
            `User with ID ${req.user?._id} is not the owner of video with ID ${videoId}`
        );
        throw new ApiError(
            400,
            "You can't toggle publish status as you are not the owner"
        );
    }

    // Log current publish status
    console.log("Current publish status:", video?.isPublished);

    // Toggle the publish status
    const toggledVideoPublish = await Video.findByIdAndUpdate(
        videoId,
        {
            $set: {
                isPublished: !video?.isPublished
            }
        },
        { new: true }
    );

    // Check if toggling was successful
    if (!toggledVideoPublish) {
        console.error("Failed to toggle publish status for videoId:", videoId);
        throw new ApiError(500, "Failed to toggle video publish status");
    }

    // Log the updated publish status
    console.log(
        "Publish status toggled successfully. New status:",
        toggledVideoPublish.isPublished
    );

    // Send success response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                { isPublished: toggledVideoPublish.isPublished },
                "Video publish status toggled successfully"
            )
        );
});


export {
    publishAVideo,
    updateVideo,
    deleteVideo,
    getAllVideos,
    getVideoById,
    togglePublishStatus,
};
