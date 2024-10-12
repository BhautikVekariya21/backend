import mongoose from "mongoose";
import Video from "../models/video.model.js";
import { Subscription } from "../models/subscription.model.js";
import { Like } from "../models/like.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asyncHandler.js";

// Controller to get the channel stats
const getChannelStats = asyncHandler(async (req, res) => {
    // Log the request user ID
    const userId = req.user?._id;
    console.log("Fetching channel stats for user:", userId);

    // Aggregate to get the total number of subscribers
    const totalSubscribers = await Subscription.aggregate([
        {
            $match: {
                channel: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $group: {
                _id: null,
                subscribersCount: {
                    $sum: 1,
                },
            },
        },
    ]);

    console.log("Total subscribers:", totalSubscribers);

    // Aggregate to get the total likes, views, and video count
    const video = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $project: {
                totalLikes: {
                    $size: "$likes",
                },
                totalViews: "$views",
                totalVideos: 1,
            },
        },
        {
            $group: {
                _id: null,
                totalLikes: {
                    $sum: "$totalLikes",
                },
                totalViews: {
                    $sum: "$totalViews",
                },
                totalVideos: {
                    $sum: 1,
                },
            },
        },
    ]);

    console.log("Video stats:", video);

    // Prepare the channel stats object
    const channelStats = {
        totalSubscribers: totalSubscribers[0]?.subscribersCount || 0,
        totalLikes: video[0]?.totalLikes || 0,
        totalViews: video[0]?.totalViews || 0,
        totalVideos: video[0]?.totalVideos || 0,
    };

    console.log("Final channel stats:", channelStats);

    // Return the channel stats in the response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                channelStats,
                "Channel stats fetched successfully"
            )
        );
});

// Controller to get all videos uploaded by the channel
const getChannelVideos = asyncHandler(async (req, res) => {
    // Log the request user ID
    const userId = req.user?._id;
    console.log("Fetching videos for channel:", userId);

    // Aggregate to fetch the videos and their like counts
    const videos = await Video.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId),
            },
        },
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "video",
                as: "likes",
            },
        },
        {
            $addFields: {
                createdAt: {
                    $dateToParts: { date: "$createdAt" },
                },
                likesCount: {
                    $size: "$likes",
                },
            },
        },
        {
            $sort: {
                createdAt: -1,
            },
        },
        {
            $project: {
                _id: 1,
                "videoFile.url": 1,
                "thumbnail.url": 1,
                title: 1,
                description: 1,
                createdAt: {
                    year: 1,
                    month: 1,
                    day: 1,
                },
                isPublished: 1,
                likesCount: 1,
            },
        },
    ]);

    console.log("Videos fetched:", videos.length);

    // Return the videos in the response
    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                videos,
                "Videos fetched successfully"
            )
        );
});

export { getChannelStats, getChannelVideos };
