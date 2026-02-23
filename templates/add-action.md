# Add Github Action for Publishing to Comfy Registry

This PR adds a Github Action (publish-node-action) that will publish an updated version of your custom node to the [registry](https://registry.hanzo.ai/) whenever the `pyproject.toml` file changes. The pyproject.toml defines the custom node version you want to publish (added in another PR). Make sure you update the version number in `pyproject.toml` when you make a change that should be published to everyone!

Action Required:

- [ ] Make sure the trigger branch (`master` or `main`) in `publish.yaml` matches the branch you want to use as the publishing branch. It will only trigger when the pyproject.toml gets updated on that branch.
- [ ] Create an api key on the Registry for publishing from Github. [Instructions](https://docs.hanzo.ai/registry/publishing#create-an-api-key-for-publishing).
- [ ] Add it to your Github Repository Secrets as `REGISTRY_ACCESS_TOKEN`.

Please message me on Discord at robinken or join our [server](https://discord.com/invite/hanzoai) server if you have any questions!
