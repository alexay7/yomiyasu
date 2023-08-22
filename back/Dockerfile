# Base image
FROM node:16-slim

# Create app directory
WORKDIR /usr/src/app

# Install mecab dictionary
RUN apt-get update && apt-get install -y mecab libmecab-dev mecab-ipadic-utf8

# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

# Install app dependencies
RUN npm install

# Bundle app source
COPY . .

# Creates a "dist" folder with the production build
RUN npm run build

EXPOSE 3001
# Start the server using the production build
CMD [ "node", "dist/main.js" ]