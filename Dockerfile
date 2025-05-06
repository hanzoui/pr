FROM node

# install python
# RUN apt update -y && apt install -y python3 python3-pip python3-venv
# install bun
RUN apt update -y && apt install unzip && curl -fsSL https://bun.sh/install | bash

WORKDIR /app

COPY package.json bun.lock ./
RUN npm i -g bun && bun i && ln -s $(which bun) /usr/bin

# setup envs
ENV SALT=Q51fPMvQ7VdJnQjX
ENV GIT_USEREMAIL=comfy-pr-bot@github.com
ENV GIT_USERNAME=comfy-pr-bot
ENV FORK_PREFIX=PR-
ENV FORK_OWNER=comfy-pr-bot
ENV GH_TOKEN=

# RUN python3 -m venv .venv && \
#     chmod +x ./.venv/bin/* && \
#     bash -c " \
#     source ./.venv/bin/activate && \
#     pip3 install comfy-cli \
#     "
# COPY src ./
# COPY . .
# RUN chmod +x ./entry.sh
# ENTRYPOINT bash ./entry.sh

COPY . .
RUN bun run build
CMD bun start

HEALTHCHECK --interval=30m --timeout=1m --start-period=1m --retries=3 CMD curl localhost:80
