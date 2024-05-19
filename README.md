# Comfy-Registry-PR


## Project Goals: (aka roadmap)

- [x] fork repo
- [x] clone repo locally
- [x] create pyproject branch, run comfy node init . Push branch.
- [x] create publish branch, create in a Github workflow file. Push branch.
- [x] create PR to original repository with template PR description.
- [x] Submit PR

- [ ] Delete the repo which is Done (merged or rejected)

## Usage

### 1. Setup Envs

#### Github API Token (GH_TOKEN)

GO https://github.com/settings/tokens?type=beta to get an Github Access key

Check 3 permissions for all of your repositories
- Pull requests Access: Read and write
- Workflows Access: Read and write
- Metadata Access: Read-only

And save your GH_TOKEN into .env file

.env

```
GH_TOKEN=ghp_WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW
```

#### Github SSH Key (.ssh/id_rsa, .ssh/id_rsa.pub)

(to push code automaticaly, btw prob. you already setup)

Run `ssh-keygen`, got `id_rsa.pub`, Then add into here https://github.com/settings/keys

### 2. Run!

Ways to run this script

1. Local run
2. Docker run (also local)
3. Docker run at cloud (TODO)

#### 1. Local native usage.

##### Linux/MacOS Run here

```sh
git clone https://github.com/drip-art/Comfy-Registry-PR

# setup comfy-cli environment
cd Comfy-Registry-PR
python -m venv .venv
chmod +x ./.venv/bin/*
source ./.venv/bin/activate 
pip3 install comfy-cli



# setup bun for js-script
curl -fsSL https://bun.sh/install | bash
bun i

# and
bun index.ts [REPO_PATH_NEED_TO_PR]
# for example
bun index.ts https://github.com/snomiao/ComfyNode-Registry-test

```


##### Windows Run here

```bat

git clone https://github.com/drip-art/Comfy-Registry-PR

@REM setup comfy-cli environment
cd Comfy-Registry-PR
python -m venv .venv
.\.venv\Scripts\activate
pip3 install comfy-cli

@REM run with tsx
npx -y cross-env REPO=https://github.com/snomiao/ComfyNode-Registry-test npx -y tsx index.ts

```

#### 2. Docker usage (not stable)

```sh
docker run --rm -it \
    -v $HOME/.ssh:/root/.ssh:ro \
    -e GH_TOKEN=ghp_WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW \
    -e TARGET_REPO=https://github.com/snomiao/ComfyNode-Registry-test \
    snomiao/comfy-registry-pr
```

3. docker-compose usage (not stable)

```sh
docker a run --rm -it \
    -v $HOME/.ssh:/root/.ssh:ro \
    -e GH_TOKEN=ghp_WWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWWW \
    -e TARGET_REPO=https://github.com/snomiao/ComfyNode-Registry-test \
    snomiao/comfy-registry-pr
```

#### Other Configurations

by default:

```dockerfile

ENV FORK_ORG=drip-art
ENV FORK_PREFIX=PR-

# Unset it into current authorized user's name and email (from your github api token).
ENV GIT_CONFIG_USER_EMAIL=comfy-ci@drip.art
ENV GIT_CONFIG_USER_NAME=comfy-ci
```
