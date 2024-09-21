// require('dotenv').config({path:'./env'})
import dotenv from "dotenv"
import mongoose from "mongoose";
import { DB_NAME } from "./constants.js";
import express from "express";
import connection from "./db/index.js";
const app = express();

dotenv.config({
    path:'./env'
})

// ;(async () => {
//   try {
//     // Connect to MongoDB
//     await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);

//     // Handle express app errors
//     app.on("error", (error) => {
//       console.error("Express app error:", error);
//       throw error;
//     });

//     // Start listening on the specified port
//     app.listen(process.env.PORT, () => {
//       console.log(`App listening on port ${process.env.PORT}`);
//     });
//   } catch (error) {
//     console.error("Error connecting to MongoDB", error);
//     throw error;
//   }
// })();
