# BUILD STAGE
FROM debian:stretch as build-stage

ENV BUILD_DIR /root/build/cncjs
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION v12.22.1
ENV NODE_ENV production
ENV NODE_PATH $NVM_DIR/$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

RUN apt-get update -y && apt-get install -y -q --no-install-recommends \
  python-pip \
  git \
  curl \
  make \
  g++ \
  udev

RUN git clone https://github.com/nvm-sh/nvm.git "$NVM_DIR" \
  && cd "$NVM_DIR" \
  && git checkout `git describe --abbrev=0 --tags --match "v[0-9]*" $(git rev-list --tags --max-count=1)` \
  && . "$NVM_DIR/nvm.sh" \
  && nvm install "$NODE_VERSION" \
  && nvm alias default "$NODE_VERSION" \
  && nvm use --delete-prefix default

WORKDIR $BUILD_DIR
COPY ./dist/cncjs $BUILD_DIR

RUN npm install -g npm@latest && npm install -g yarn && yarn --production

# FINAL STAGE
FROM debian:stretch

ENV BUILD_DIR /root/build
ENV NVM_DIR /root/.nvm
ENV NODE_VERSION v12.22.1
ENV NODE_ENV production
ENV NODE_PATH $NVM_DIR/$NODE_VERSION/lib/node_modules
ENV PATH $NVM_DIR/versions/node/$NODE_VERSION/bin:$PATH

RUN apt-get update -y && apt-get install -y -q --no-install-recommends \
  python-pip \
  git \
  curl \
  make \
  g++ \
  udev

RUN git clone https://github.com/nvm-sh/nvm.git "$NVM_DIR" \
  && cd "$NVM_DIR" \
  && git checkout `git describe --abbrev=0 --tags --match "v[0-9]*" $(git rev-list --tags --max-count=1)` \
  && . "$NVM_DIR/nvm.sh" \
  && nvm install "$NODE_VERSION" \
  && nvm alias default "$NODE_VERSION" \
  && nvm use --delete-prefix default

WORKDIR /home/cncjs
COPY --from=build-stage $BUILD_DIR /home/cncjs

EXPOSE 8000
CMD [ "node", "-p", "require('./server-cli')()" ]
