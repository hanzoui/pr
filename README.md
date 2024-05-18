# Comfy-Registry-PR

Dev Goals:

- [x] fork repo
- [x] clone repo locally
- [x] create pyproject branch, run comfy node init . Push branch.
- [x] create publish branch, create in a Github workflow file. Push branch.
- [x] create PR to original repository with template PR description.
- [x] Submit PR

- [ ] Delete the repo which is Done (merged or rejected)


git clone https://github.com/drip-art/Comfy-Registry-PR/tree/main#

### Setup Envs

#### 1. Github API Token

GO https://github.com/settings/tokens?type=beta to get an Github Access key

Check 3 permissions for all of your repositories
- Pull requests Access: Read and write
- Workflows Access: Read and write
- Metadata Access: Read-only

#### 2. Github Access Key (to push code)

run `ssh-keygen`
And add into here https://github.com/settings/keys

#### 3. 


#### Other Configurations

by default:

ENV GIT_CONFIG_USER_EMAIL=comfy-ci@drip.art
ENV GIT_CONFIG_USER_NAME=comfy-ci

Unset it into current authorized user's name and email (from your github api token).