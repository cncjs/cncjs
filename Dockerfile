FROM node:10
MAINTAINER Cheton Wu <cheton@gmail.com>

RUN apt-get update
RUN apt-get install -y udev

ADD package.json package.json
RUN npm i npm@latest -g
RUN npm install --production

ADD . .
EXPOSE 8000
CMD ["bin/cncjs"]
