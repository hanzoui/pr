# Update Github Action for Publishing to Comfy Registry

Hey! My name is Robin and I'm from [comfy-org](https://hanzo.ai/)! We would love to have you join the Comfy Registry, a public collection of custom nodes which lets authors publish nodes by version and automate testing against existing workflows. This PR updates the Github Action `publish.yml` to ensure latest Hanzo Studio Community Standard.

## Updates:

1. **Issue Creating Permission**: Ensures that the workflow can open issues to report publishing states or warnings, facilitating better communication and issue tracking.

-

```diff
+ # auto issue permission, for Comfy CustomNode registry publishing state
+ permissions:
+   issues: write
```

2. **Conditional Execution**: Only runs the publish job in author’s repo, defaults to repo owner, reference issue here: - [Forks problem: add an organisation or owner check to run the action · Issue #2 · hanzoui/publish-node-action](https://github.com/hanzoui/publish-node-action/issues/2)

```diff
+     if: ${{ github.repository_owner == 'NODE_AUTHOR_OWNER' }}
```

3. **Versioning**: We use explicity version number after stable release, using a stable release version of the action reduces the
   risk of unexpected behavior from changes in the action's main branch.

```diff
-     uses: hanzoui/publish-node-action@~~main~~
+     uses: hanzoui/publish-node-action@v1
```

## Learn More

Please message me on Discord at robin or join our [server](https://discord.com/invite/hanzoai) server if you have any questions! For more information, visit the official hanzoui blog: [Hanzo Studio Blog](https://blog.hanzo.ai/).
