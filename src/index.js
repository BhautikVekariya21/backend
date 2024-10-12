import dotenv from "dotenv";
import express from "express";
import connection from "./db/index.js";
import app from './app.js'
// Load environment variables from the `.env` file
dotenv.config({
  path: './env',
});

const PORT = process.env.PORT || 5005; // Changed default port to 5005

// Connect to the database
connection()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running at port: ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Failed to connect to the database", error);
    process.exit(1);  // Exit if DB connection fails
  });

// Handle express app errors
app.on("error", (error) => {
  console.error("Express app error:", error);
  throw error;
});
