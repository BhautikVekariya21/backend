import mongoose, { isValidObjectId } from "mongoose";
import { Like } from "../models/like.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";

// Toggle like for video
const toggleVideoLike = asyncHandler(async (req, res) => {
    const { videoId } = req.params;

    // Check if the videoId is valid
    if (!isValidObjectId(videoId)) {
        console.log("Invalid videoId:", videoId); // Debugging: log invalid videoId
        throw new ApiError(400, "Invalid videoId");
    }

    // Check if the video is already liked by the user
    const likedAlready = await Like.findOne({
        video: videoId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        // If already liked, remove the like
        console.log("Like found, removing like for video:", videoId); // Debugging
        await Like.findByIdAndDelete(likedAlready?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }

    // Add like if not already liked
    console.log("Adding like for video:", videoId); // Debugging
    await Like.create({
        video: videoId,
        likedBy: req.user?._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));
});

// Toggle like for comment
const toggleCommentLike = asyncHandler(async (req, res) => {
    const { commentId } = req.params;

    // Validate commentId
    if (!isValidObjectId(commentId)) {
        console.log("Invalid commentId:", commentId); // Debugging: log invalid commentId
        throw new ApiError(400, "Invalid commentId");
    }

    // Check if comment is already liked
    const likedAlready = await Like.findOne({
        comment: commentId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        // If already liked, remove the like
        console.log("Like found, removing like for comment:", commentId); // Debugging
        await Like.findByIdAndDelete(likedAlready?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { isLiked: false }));
    }

    // Add like if not already liked
    console.log("Adding like for comment:", commentId); // Debugging
    await Like.create({
        comment: commentId,
        likedBy: req.user?._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));
});

// Toggle like for tweet
const toggleTweetLike = asyncHandler(async (req, res) => {
    const { tweetId } = req.params;

    // Validate tweetId
    if (!isValidObjectId(tweetId)) {
        console.log("Invalid tweetId:", tweetId); // Debugging: log invalid tweetId
        throw new ApiError(400, "Invalid tweetId");
    }

    // Check if tweet is already liked
    const likedAlready = await Like.findOne({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    if (likedAlready) {
        // If already liked, remove the like
        console.log("Like found, removing like for tweet:", tweetId); // Debugging
        await Like.findByIdAndDelete(likedAlready?._id);

        return res
            .status(200)
            .json(new ApiResponse(200, { tweetId, isLiked: false }));
    }

    // Add like if not already liked
    console.log("Adding like for tweet:", tweetId); // Debugging
    await Like.create({
        tweet: tweetId,
        likedBy: req.user?._id,
    });

    return res
        .status(200)
        .json(new ApiResponse(200, { isLiked: true }));
});

// Get liked videos
const getLikedVideos = asyncHandler(async (req, res) => {
    console.log("Fetching liked videos for user:", req.user?._id); // Debugging

    const likedVideosAggegate = await Like.aggregate([
        {
            $match: {
                likedBy: new mongoose.Types.ObjectId(req.user?._id),
            },
        },
        {
            $lookup: {
                from: "videos",
                localField: "video",
                foreignField: "_id",
                as: "likedVideo",
                pipeline: [
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "ownerDetails",
                        },
                    },
                    {
                        $unwind: "$ownerDetails",
                    },
                ],
            },
        },
        {
            $unwind: "$likedVideo",
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 0,
                likedVideo: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    owner: 1,
                    title: 1,
                    description: 1,
                    views: 1,
                    duration: 1,
                    createdAt: 1,
                    isPublished: 1,
                    ownerDetails: {
                        username: 1,
                        fullName: 1,
                        "avatar.url": 1,
                    },
                },
            },
        },
    ]);

    if (!likedVideosAggegate.length) {
        console.log("No liked videos found for user:", req.user?._id); // Debugging
    } else {
        console.log("Liked videos fetched successfully for user:", req.user?._id); // Debugging
    }

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                likedVideosAggegate,
                "Liked videos fetched successfully"
            )
        );
});

export { toggleVideoLike, toggleCommentLike, toggleTweetLike, getLikedVideos };
