FROM debian:stretch
MAINTAINER Zane Claes <zane@technicallywizardry.com>

# Install global dependencies
RUN apt-get update -y && \
  apt-get install --no-install-recommends -y \
    python-pip git curl make g++ udev

# Install NVM & Node 10
RUN git clone https://github.com/creationix/nvm.git /nvm && \
  cd /nvm && \
  git checkout `git describe --abbrev=0 --tags` && \
  chmod +x /nvm/nvm.sh && /nvm/nvm.sh

ENV NVM_DIR="/nvm"
RUN [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
  nvm install 10 && nvm use 10 && \
  npm i npm@latest -g

# Install CNCjs
RUN [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && \
  npm install --unsafe-perm -g cncjs

ADD bin/docker-entrypoint /bin/docker-entrypoint

EXPOSE 8000
CMD ["/bin/docker-entrypoint"]
