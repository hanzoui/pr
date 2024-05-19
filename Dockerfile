FROM node

WORKDIR /app

RUN apt update -y && \
    # install python
    apt install -y python3 python3-pip python3-venv \
    # prepare bun
    apt install unzip && curl -fsSL https://bun.sh/install | bash && ln -s $(which bun) /usr/bin
COPY package.json .
RUN bun i

# setup envs
ENV SALT=Q51fPMvQ7VdJnQjX
ENV GIT_USEREMAIL=comfy-ci@drip.art
ENV GIT_USERNAME=comfy-ci
ENV FORK_PREFIX=PR-
ENV FORK_ORG=drip-art
ENV GH_TOKEN=

COPY . .
RUN chmod +x ./entry.sh
ENTRYPOINT ./entry.sh
