# Use a Node.js base image
FROM node:20

# Set the working directory
WORKDIR /app

# Copy package files
COPY package.json package-lock.json ./

# Install dependencies
RUN npm install --legacy-peer-deps

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Start the application
# Use npm run run:match to start the game match loop
CMD [ "npm", "run", "run:match" ]
