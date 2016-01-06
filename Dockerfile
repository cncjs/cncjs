# NodeSource Docker Images
# https://github.com/nodesource/docker-node
FROM nodesource/vivid:4
MAINTAINER Cheton Wu <cheton@gmail.com>

RUN npm install -g nodemon

# cache package.json and node_modules to speed up builds
ADD package.json package.json
RUN npm install --production

WORKDIR /src
ADD . /src
EXPOSE 8000
CMD ["nodemon", "/src/bin/cnc"]
