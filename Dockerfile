FROM node:8
MAINTAINER Cheton Wu <cheton@gmail.com>

# cache package.json and node_modules to speed up builds
ADD package.json package.json
RUN npm i npm@latest -g
RUN npm install --production
RUN npm install -g nodemon

ADD . .
EXPOSE 8000
CMD ["nodemon", "bin/cnc"]
