import {
  parseGithubRepoUrl,
  stringifyGithubOrigin,
  stringifyGithubRepoUrl,
  stringifyOwnerRepo,
} from "./parseOwnerRepo";

describe("parseOwnerRepo", () => {
  describe("parseGithubRepoUrl", () => {
    it("should parse SSH GitHub URL", () => {
      const result = parseGithubRepoUrl("git@github.com:owner/repo");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("should parse SSH GitHub URL with .git extension", () => {
      const result = parseGithubRepoUrl("git@github.com:owner/repo.git");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("should parse HTTPS GitHub URL", () => {
      const result = parseGithubRepoUrl("https://github.com/owner/repo");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("should parse HTTPS GitHub URL with .git extension", () => {
      const result = parseGithubRepoUrl("https://github.com/owner/repo.git");
      expect(result).toEqual({
        owner: "owner",
        repo: "repo",
      });
    });

    it("should handle owner/repo with hyphens and underscores", () => {
      const result = parseGithubRepoUrl("git@github.com:my-org_name/my-repo_name");
      expect(result).toEqual({
        owner: "my-org_name",
        repo: "my-repo_name",
      });
    });

    it("should handle owner/repo with numbers", () => {
      const result = parseGithubRepoUrl("https://github.com/user123/repo456");
      expect(result).toEqual({
        owner: "user123",
        repo: "repo456",
      });
    });

    it("should handle real-world example URLs", () => {
      const result1 = parseGithubRepoUrl("git@github.com:Comfy-Org/ComfyUI-Registry");
      expect(result1).toEqual({
        owner: "Comfy-Org",
        repo: "ComfyUI-Registry",
      });

      const result2 = parseGithubRepoUrl("https://github.com/snomiao/ComfyUI-FD-Tagger.git");
      expect(result2).toEqual({
        owner: "snomiao",
        repo: "ComfyUI-FD-Tagger",
      });
    });
  });

  describe("stringifyOwnerRepo", () => {
    it("should stringify owner and repo", () => {
      const result = stringifyOwnerRepo({ owner: "owner", repo: "repo" });
      expect(result).toBe("owner/repo");
    });

    it("should handle special characters", () => {
      const result = stringifyOwnerRepo({ owner: "my-org_name", repo: "my-repo_name" });
      expect(result).toBe("my-org_name/my-repo_name");
    });

    it("should handle numbers", () => {
      const result = stringifyOwnerRepo({ owner: "user123", repo: "repo456" });
      expect(result).toBe("user123/repo456");
    });
  });

  describe("stringifyGithubRepoUrl", () => {
    it("should create HTTPS GitHub URL", () => {
      const result = stringifyGithubRepoUrl({ owner: "owner", repo: "repo" });
      expect(result).toBe("https://github.com/owner/repo");
    });

    it("should handle special characters", () => {
      const result = stringifyGithubRepoUrl({ owner: "my-org_name", repo: "my-repo_name" });
      expect(result).toBe("https://github.com/my-org_name/my-repo_name");
    });

    it("should handle real-world examples", () => {
      const result = stringifyGithubRepoUrl({ owner: "Comfy-Org", repo: "ComfyUI-Registry" });
      expect(result).toBe("https://github.com/Comfy-Org/ComfyUI-Registry");
    });
  });

  describe("stringifyGithubOrigin", () => {
    it("should return SSH URL regardless of token presence", async () => {
      // The function always returns SSH URL according to the current implementation
      const result = await stringifyGithubOrigin({ owner: "owner", repo: "repo" });
      expect(result).toBe("git@github.com:owner/repo");
    });

    it("should handle special characters in owner/repo", async () => {
      const result = await stringifyGithubOrigin({ owner: "my-org_name", repo: "my-repo_name" });
      expect(result).toBe("git@github.com:my-org_name/my-repo_name");
    });

    it("should handle real-world examples", async () => {
      const result = await stringifyGithubOrigin({ owner: "Comfy-Org", repo: "ComfyUI-Registry" });
      expect(result).toBe("git@github.com:Comfy-Org/ComfyUI-Registry");
    });
  });

  describe("integration tests", () => {
    it("should work end-to-end with parseGithubRepoUrl and stringifyOwnerRepo", () => {
      const originalUrl = "git@github.com:Comfy-Org/ComfyUI-Registry.git";
      const parsed = parseGithubRepoUrl(originalUrl);
      const stringified = stringifyOwnerRepo(parsed);
      expect(stringified).toBe("Comfy-Org/ComfyUI-Registry");
    });

    it("should work end-to-end with parseGithubRepoUrl and stringifyGithubRepoUrl", () => {
      const originalUrl = "git@github.com:snomiao/ComfyUI-FD-Tagger";
      const parsed = parseGithubRepoUrl(originalUrl);
      const httpsUrl = stringifyGithubRepoUrl(parsed);
      expect(httpsUrl).toBe("https://github.com/snomiao/ComfyUI-FD-Tagger");
    });

    it("should work end-to-end with parseGithubRepoUrl and stringifyGithubOrigin", async () => {
      const originalUrl = "https://github.com/owner/repo.git";
      const parsed = parseGithubRepoUrl(originalUrl);
      const sshUrl = await stringifyGithubOrigin(parsed);
      expect(sshUrl).toBe("git@github.com:owner/repo");
    });
  });
});
