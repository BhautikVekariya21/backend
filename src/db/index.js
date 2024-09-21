import mongoose from "mongoose";
import { DB_NAME } from "../constants.js";

const connection = async () => {
  try {
    const connectionInstance = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log(`Connected to Mongoose database! DB Host: ${connectionInstance.connection.host}`);
  } catch (error) {
    console.error("Couldn't connect to Mongoose database", error);
    process.exit(1);
  }
};

export default connection;
