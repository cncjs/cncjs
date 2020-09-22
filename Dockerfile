FROM debian:stretch
MAINTAINER Cheton Wu <cheton@gmail.com>

# Install base dependencies
RUN apt-get update -y && apt-get install -y -q --no-install-recommends \
  python-pip \
  git \
  curl \
  make \
  g++ \
  udev

ENV APP_DIR /home/cncjs
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION v12.18.4
ENV NODE_ENV production

RUN git clone https://github.com/nvm-sh/nvm.git "$NVM_DIR" \
  && cd "$NVM_DIR" \
  && git checkout `git describe --abbrev=0 --tags --match "v[0-9]*" $(git rev-list --tags --max-count=1)` \
  && . "$NVM_DIR/nvm.sh" \
  && nvm install "$NODE_VERSION" \
  && nvm alias default "$NODE_VERSION" \
  && nvm use --delete-prefix default

ENV NODE_PATH $NVM_DIR/$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

COPY ./dist/cncjs $APP_DIR

WORKDIR $APP_DIR

# Install dependencies
RUN npm install -g npm@latest && npm install -g yarn && yarn --production

EXPOSE 8000
CMD [ "node", "-p", "require('./server-cli')()" ]
