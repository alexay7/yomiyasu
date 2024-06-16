# Build step #1: build the React front end
FROM node:slim as build-step
WORKDIR /app
COPY package*.json ./
# Install pnpm
RUN npm install -g pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install app dependencies using pnpm
RUN pnpm install
COPY . .
# RUN pnpm test - if you want to test before to build
RUN pnpm run build

# Build step #2: build an nginx container
FROM nginx:stable
COPY --from=build-step /app/dist /usr/share/nginx/html
COPY deployment/nginx.default.conf /etc/nginx/conf.d/default.conf