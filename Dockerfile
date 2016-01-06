FROM nodesource/vivid:4
MAINTAINER Cheton Wu <cheton@gmail.com>

# cache package.json and node_modules to speed up builds
ADD package.json package.json
RUN npm install --production

# Add your source files
ADD . .

# Expose port
EXPOSE  8000

# Run app using nodemon
CMD ["npm", "start"]
