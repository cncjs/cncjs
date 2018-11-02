FROM node:8
MAINTAINER Cheton Wu <cheton@gmail.com>

ADD package.json package.json
RUN npm i npm@latest -g
RUN npm install --production

ADD . .
EXPOSE 8000
CMD ["bin/cnc"]
