FROM node

WORKDIR /app

# install python
RUN apt update -y && \
    apt install -y python3 python3-pip python3-venv

# prepare bun
RUN npm i -g bun
COPY package.json .
RUN bun i

# setup envs
ENV GIT_CONFIG_USER_EMAIL=comfy-ci@drip.art
ENV GIT_CONFIG_USER_NAME=comfy-ci
ENV FORK_PREFIX=PR-
ENV FORK_ORG=drip-art
ENV GH_TOKEN=

COPY . .
RUN chmod +x ./entry.sh
ENTRYPOINT ./entry.sh