# Use the official Node.js 20 Alpine image as a base
FROM node:20-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of your application code to the container
COPY . .

# Expose the application port from the environment variable
ARG PORT
EXPOSE $PORT

# Command to run your application
CMD ["npm", "run", "dev"]
