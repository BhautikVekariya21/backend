import { Playlist } from "../models/playlist.model.js";
import Video from "../models/video.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/apiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import mongoose, { isValidObjectId } from "mongoose";

const createPlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;

    // Log the incoming data for debugging
    console.log('Create Playlist Request:', { userId: req.user?._id, name, description });

    // Check if name and description are provided
    if (!name || !description) {
        console.log('Missing name or description');
        throw new ApiError(400, "name and description both are required");
    }

    // Create a new playlist
    const playlist = await Playlist.create({
        name,
        description,
        owner: req.user?._id,
    });

    // Check if playlist creation was successful
    if (!playlist) {
        console.log('Failed to create playlist');
        throw new ApiError(500, "failed to create playlist");
    }

    // Log the successful creation of the playlist
    console.log('Playlist created successfully:', playlist);

    return res
        .status(200)
        .json(new ApiResponse(200, playlist, "playlist created successfully"));
});

const updatePlaylist = asyncHandler(async (req, res) => {
    const { name, description } = req.body;
    const { playlistId } = req.params;

    // Log the incoming data for debugging
    console.log('Update Playlist Request:', { userId: req.user?._id, playlistId, name, description });

    // Check if name and description are provided
    if (!name || !description) {
        console.log('Missing name or description');
        throw new ApiError(400, "name and description both are required");
    }

    // Validate the playlistId
    if (!isValidObjectId(playlistId)) {
        console.log('Invalid playlistId:', playlistId);
        throw new ApiError(400, "Invalid PlaylistId");
    }

    // Find the playlist by ID
    const playlist = await Playlist.findById(playlistId);

    // Check if playlist exists
    if (!playlist) {
        console.log('Playlist not found:', playlistId);
        throw new ApiError(404, "Playlist not found");
    }

    // Check if the user is the owner of the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        console.log('User is not the owner of the playlist:', { userId: req.user?._id, ownerId: playlist.owner });
        throw new ApiError(400, "only owner can edit the playlist");
    }

    // Update the playlist
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $set: {
                name,
                description,
            },
        },
        { new: true }
    );

    // Log the updated playlist
    console.log('Playlist updated successfully:', updatedPlaylist);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "playlist updated successfully"
            )
        );
});

const deletePlaylist = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    // Log the playlist ID for debugging
    console.log('Delete Playlist Request:', { userId: req.user?._id, playlistId });

    // Validate the playlistId
    if (!isValidObjectId(playlistId)) {
        console.log('Invalid playlistId:', playlistId);
        throw new ApiError(400, "Invalid PlaylistId");
    }

    // Find the playlist by ID
    const playlist = await Playlist.findById(playlistId);

    // Check if playlist exists
    if (!playlist) {
        console.log('Playlist not found:', playlistId);
        throw new ApiError(404, "Playlist not found");
    }

    // Check if the user is the owner of the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        console.log('User is not the owner of the playlist:', { userId: req.user?._id, ownerId: playlist.owner });
        throw new ApiError(400, "only owner can delete the playlist");
    }

    // Delete the playlist
    await Playlist.findByIdAndDelete(playlist?._id);

    // Log the successful deletion
    console.log('Playlist deleted successfully:', playlistId);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                {},
                "playlist deleted successfully"
            )
        );
});

const addVideoToPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    // Log the request details
    console.log('Add Video to Playlist Request:', { userId: req.user?._id, playlistId, videoId });

    // Validate playlistId and videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        console.log('Invalid playlistId or videoId:', { playlistId, videoId });
        throw new ApiError(400, "Invalid PlaylistId or videoId");
    }

    // Find the playlist and video
    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    // Check if playlist and video exist
    if (!playlist) {
        console.log('Playlist not found:', playlistId);
        throw new ApiError(404, "Playlist not found");
    }
    if (!video) {
        console.log('Video not found:', videoId);
        throw new ApiError(404, "video not found");
    }

    // Check if the user is the owner of the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        console.log('User is not the owner of the playlist:', { userId: req.user?._id, ownerId: playlist.owner });
        throw new ApiError(400, "only owner can add video to their playlist");
    }

    // Update the playlist by adding the video
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlist?._id,
        {
            $addToSet: {
                videos: videoId,
            },
        },
        { new: true }
    );

    // Check if the update was successful
    if (!updatedPlaylist) {
        console.log('Failed to add video to playlist');
        throw new ApiError(
            400,
            "failed to add video to playlist please try again"
        );
    }

    // Log the updated playlist
    console.log('Video added to playlist successfully:', updatedPlaylist);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Added video to playlist successfully"
            )
        );
});

const removeVideoFromPlaylist = asyncHandler(async (req, res) => {
    const { playlistId, videoId } = req.params;

    // Log the request details
    console.log('Remove Video from Playlist Request:', { userId: req.user?._id, playlistId, videoId });

    // Validate playlistId and videoId
    if (!isValidObjectId(playlistId) || !isValidObjectId(videoId)) {
        console.log('Invalid playlistId or videoId:', { playlistId, videoId });
        throw new ApiError(400, "Invalid PlaylistId or videoId");
    }

    // Find the playlist and video
    const playlist = await Playlist.findById(playlistId);
    const video = await Video.findById(videoId);

    // Check if playlist and video exist
    if (!playlist) {
        console.log('Playlist not found:', playlistId);
        throw new ApiError(404, "Playlist not found");
    }
    if (!video) {
        console.log('Video not found:', videoId);
        throw new ApiError(404, "video not found");
    }

    // Check if the user is the owner of the playlist
    if (playlist.owner.toString() !== req.user?._id.toString()) {
        console.log('User is not the owner of the playlist:', { userId: req.user?._id, ownerId: playlist.owner });
        throw new ApiError(
            404,
            "only owner can remove video from their playlist"
        );
    }

    // Update the playlist by removing the video
    const updatedPlaylist = await Playlist.findByIdAndUpdate(
        playlistId,
        {
            $pull: {
                videos: videoId,
            },
        },
        { new: true }
    );

    // Log the updated playlist
    console.log('Video removed from playlist successfully:', updatedPlaylist);

    return res
        .status(200)
        .json(
            new ApiResponse(
                200,
                updatedPlaylist,
                "Removed video from playlist successfully"
            )
        );
});

const getPlaylistById = asyncHandler(async (req, res) => {
    const { playlistId } = req.params;

    // Log the playlist ID
    console.log('Get Playlist By ID Request:', { playlistId });

    // Validate the playlistId
    if (!isValidObjectId(playlistId)) {
        console.log('Invalid playlistId:', playlistId);
        throw new ApiError(400, "Invalid PlaylistId");
    }

    // Find the playlist
    const playlist = await Playlist.findById(playlistId);

    // Check if playlist exists
    if (!playlist) {
        console.log('Playlist not found:', playlistId);
        throw new ApiError(404, "Playlist not found");
    }

    // Aggregate to get playlist details along with videos
    const playlistVideos = await Playlist.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(playlistId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos",
            }
        },
        {
            $match: {
                "videos.isPublished": true
            }
        },
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                },
                owner: {
                    $first: "$owner"
                }
            }
        },
        {
            $project: {
                name: 1,
                description: 1,
                createdAt: 1,
                updatedAt: 1,
                totalVideos: 1,
                totalViews: 1,
                videos: {
                    _id: 1,
                    "videoFile.url": 1,
                    "thumbnail.url": 1,
                    title: 1,
                    description: 1,
                    duration: 1,
                    createdAt: 1,
                    views: 1
                },
                owner: {
                    username: 1,
                    fullName: 1,
                    "avatar.url": 1
                }
            }
        }
    ]);

    // Log the fetched playlist data
    console.log('Playlist fetched successfully:', playlistVideos[0]);

    return res
        .status(200)
        .json(new ApiResponse(200, playlistVideos[0], "playlist fetched successfully"));
});

const getUserPlaylists = asyncHandler(async (req, res) => {
    const { userId } = req.params;

    // Log the user ID
    console.log('Get User Playlists Request:', { userId });

    // Validate the userId
    if (!isValidObjectId(userId)) {
        console.log('Invalid userId:', userId);
        throw new ApiError(400, "Invalid userId");
    }

    // Aggregate to get user playlists
    const playlists = await Playlist.aggregate([
        {
            $match: {
                owner: new mongoose.Types.ObjectId(userId)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "videos",
                foreignField: "_id",
                as: "videos"
            }
        },
        {
            $addFields: {
                totalVideos: {
                    $size: "$videos"
                },
                totalViews: {
                    $sum: "$videos.views"
                }
            }
        },
        {
            $project: {
                _id: 1,
                name: 1,
                description: 1,
                totalVideos: 1,
                totalViews: 1,
                updatedAt: 1
            }
        }
    ]);

    // Log the fetched playlists
    console.log('User playlists fetched successfully:', playlists);

    return res
        .status(200)
        .json(new ApiResponse(200, playlists, "User playlists fetched successfully"));
});

export {
    createPlaylist,
    updatePlaylist,
    deletePlaylist,
    addVideoToPlaylist,
    removeVideoFromPlaylist,
    getPlaylistById,
    getUserPlaylists,
};
