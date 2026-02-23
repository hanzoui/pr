# Add pyproject.toml for Custom Node Registry

We are working with dr.lt.data and comfyanon to build a global registry for custom nodes (similar to PyPI). Eventually, the registry will be used as a backend for the UI-manager. All nodes go through a verification process before being published to users.

The main benefits are that authors can

- publish nodes by version and users can safely update nodes knowing ahead of time if their workflows will break or not
- automate testing against new commits in the comfy repo and existing workflows through our CI/CD dashboard

Action Required:

- [ ] Go to the [registry](https://registry.hanzo.ai). Login and create a publisher id (everything after the `@` sign on your registry profile).
- [ ] Add the publisher id into the pyproject.toml file.
- [ ] Merge the separate Github Actions PR, then merge this PR.

If you want to publish the node manually, [install the cli](https://docs.hanzo.ai/hanzo-cli/getting-started#install-cli) by running `pip install hanzo-cli`, then run `comfy node publish`

Check out our [docs](https://docs.hanzo.ai/registry/overview#introduction) if you want to know more about the registry. Otherwise, feel free to message me on discord at robinken or join our [server](https://discord.com/invite/hanzoai) if you have any questions!
