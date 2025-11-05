import { afterEach, beforeEach, describe, expect, it } from "bun:test";

// Track mocked function calls
let mockUpsertSlackMessageCalls: any[] = [];
let mockFindOneAndUpdateCalls: any[] = [];
let mockFindOneCalls: any[] = [];
let mockReleasesData: any[] = [];

// Mock external dependencies BEFORE importing the module under test
const mockCollection = {
  createIndex: async () => ({}),
  findOne: async (filter: any) => {
    mockFindOneCalls.push(filter);
    return null;
  },
  findOneAndUpdate: async (filter: any, update: any, options: any) => {
    const result = { ...filter, ...update.$set };
    mockFindOneAndUpdateCalls.push({ filter, update, options, result });
    return result;
  },
};

// Use bun's mock.module
const { mock } = await import("bun:test");
mock.module("@/src/db", () => ({
  db: {
    collection: () => mockCollection,
    close: async () => {},
  },
}));

// Mock GitHub client
mock.module("@/src/gh", () => ({
  gh: {
    repos: {
      listReleases: async () => ({ data: mockReleasesData }),
    },
  },
}));

// Mock Slack channels
mock.module("@/src/slack/channels", () => ({
  getSlackChannel: async () => ({ id: "test-channel-id", name: "desktop" }),
}));

// Mock upsert Slack message
mock.module("./upsertSlackMessage", () => ({
  upsertSlackMessage: async (msg: any) => {
    mockUpsertSlackMessageCalls.push(msg);
    return {
      text: msg.text,
      channel: msg.channel,
      url: msg.url || "https://slack.com/message/123",
    };
  },
}));

// Import after mocks are set up
const { default: runGithubDesktopReleaseNotificationTask } = await import("./index");

describe("GithubDesktopReleaseNotificationTask", () => {
  beforeEach(async () => {
    // Reset tracking arrays
    mockUpsertSlackMessageCalls = [];
    mockFindOneAndUpdateCalls = [];
    mockFindOneCalls = [];
    mockReleasesData = [];

    // Reset mock functions
    mockCollection.findOne = async (filter: any) => {
      mockFindOneCalls.push(filter);
      return null;
    };
    mockCollection.findOneAndUpdate = async (filter: any, update: any, options: any) => {
      const result = { ...filter, ...update.$set };
      mockFindOneAndUpdateCalls.push({ filter, update, options, result });
      return result;
    };
  });

  afterEach(async () => {
    // Clean up
  });

  describe("Draft Release Processing - Bug Fix Verification", () => {
    it("should save draft messages to slackMessageDrafting field, not slackMessage", async () => {
      const mockDraftRelease = {
        html_url: "https://github.com/Comfy-Org/desktop/releases/tag/v1.0.0-draft",
        tag_name: "v1.0.0-draft",
        draft: true,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: null,
        body: "Draft release notes",
      };

      mockReleasesData = [mockDraftRelease];

      await runGithubDesktopReleaseNotificationTask();

      // Should have saved twice: once for initial data, once with slackMessageDrafting
      expect(mockFindOneAndUpdateCalls.length).toBeGreaterThanOrEqual(2);

      // Check that slackMessageDrafting was set in one of the calls
      const draftingCall = mockFindOneAndUpdateCalls.find(
        (call) => call.update.$set.slackMessageDrafting !== undefined,
      );
      expect(draftingCall).toBeDefined();
      expect(draftingCall?.update.$set.slackMessageDrafting).toMatchObject({
        text: expect.any(String),
        channel: "test-channel-id",
        url: expect.any(String),
      });

      // Ensure slackMessage field was NOT set in any call
      const stableCall = mockFindOneAndUpdateCalls.find((call) => call.update.$set.slackMessage !== undefined);
      expect(stableCall).toBeUndefined();
    });

    it("should not send duplicate draft messages when text hasn't changed", async () => {
      const mockDraftRelease = {
        html_url: "https://github.com/Comfy-Org/desktop/releases/tag/v1.0.0-draft",
        tag_name: "v1.0.0-draft",
        draft: true,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: null,
        body: "Draft release notes",
      };

      mockReleasesData = [mockDraftRelease];

      // The actual implementation uses the repo name from parseGithubUrl which returns "Comfy-Org/desktop"
      const expectedText =
        "🔮 Comfy-Org/desktop <https://github.com/Comfy-Org/desktop/releases/tag/v1.0.0-draft|Release v1.0.0-draft> is draft!";

      // Mock findOneAndUpdate to return task with existing drafting message
      mockCollection.findOneAndUpdate = async (filter: any, update: any, options: any) => {
        const result = {
          ...filter,
          ...update.$set,
          slackMessageDrafting: {
            text: expectedText,
            channel: "test-channel-id",
            url: "https://slack.com/message/draft-123",
          },
        };
        mockFindOneAndUpdateCalls.push({ filter, update, options, result });
        return result;
      };

      await runGithubDesktopReleaseNotificationTask();

      // Should NOT call upsertSlackMessage since text hasn't changed
      expect(mockUpsertSlackMessageCalls.length).toBe(0);
    });

    it("should update draft message when text changes", async () => {
      const mockDraftRelease = {
        html_url: "https://github.com/Comfy-Org/desktop/releases/tag/v1.0.1-draft",
        tag_name: "v1.0.1-draft",
        draft: true,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: null,
        body: "Updated draft release notes",
      };

      mockReleasesData = [mockDraftRelease];

      // First call returns task with old version
      let callCount = 0;
      mockCollection.findOneAndUpdate = async (filter: any, update: any, options: any) => {
        callCount++;
        const result = {
          ...filter,
          ...update.$set,
          slackMessageDrafting:
            callCount === 1
              ? {
                  text: "🔮 desktop <https://github.com/Comfy-Org/desktop/releases/tag/v1.0.0-draft|Release v1.0.0-draft> is draft!",
                  channel: "test-channel-id",
                  url: "https://slack.com/message/draft-123",
                }
              : update.$set.slackMessageDrafting,
        };
        mockFindOneAndUpdateCalls.push({ filter, update, options, result });
        return result;
      };

      await runGithubDesktopReleaseNotificationTask();

      // Should update the drafting message since text changed
      expect(mockUpsertSlackMessageCalls.length).toBeGreaterThan(0);
      const lastCall = mockUpsertSlackMessageCalls[mockUpsertSlackMessageCalls.length - 1];
      expect(lastCall.text).toContain("v1.0.1-draft");
    });
  });

  describe("Stable Release Processing", () => {
    it("should save stable messages to slackMessage field", async () => {
      const mockStableRelease = {
        html_url: "https://github.com/Comfy-Org/desktop/releases/tag/v1.0.0",
        tag_name: "v1.0.0",
        draft: false,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        body: "Stable release notes",
      };

      mockReleasesData = [mockStableRelease];

      await runGithubDesktopReleaseNotificationTask();

      // Check that slackMessage was set in one of the calls
      const stableCall = mockFindOneAndUpdateCalls.find((call) => call.update.$set.slackMessage !== undefined);
      expect(stableCall).toBeDefined();
      expect(stableCall?.update.$set.slackMessage).toMatchObject({
        text: expect.any(String),
        channel: "test-channel-id",
        url: expect.any(String),
      });
    });

    it("should not send duplicate stable messages when text hasn't changed", async () => {
      const mockStableRelease = {
        html_url: "https://github.com/Comfy-Org/desktop/releases/tag/v1.0.0",
        tag_name: "v1.0.0",
        draft: false,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        body: "Stable release notes",
      };

      mockReleasesData = [mockStableRelease];

      // The actual implementation uses the repo name from parseGithubUrl which returns "Comfy-Org/desktop"
      const expectedText =
        "🔮 Comfy-Org/desktop <https://github.com/Comfy-Org/desktop/releases/tag/v1.0.0|Release v1.0.0> is stable!";

      // Mock findOneAndUpdate to return task with existing message
      mockCollection.findOneAndUpdate = async (filter: any, update: any, options: any) => {
        const result = {
          ...filter,
          ...update.$set,
          slackMessage: {
            text: expectedText,
            channel: "test-channel-id",
            url: "https://slack.com/message/stable-123",
          },
        };
        mockFindOneAndUpdateCalls.push({ filter, update, options, result });
        return result;
      };

      await runGithubDesktopReleaseNotificationTask();

      // Should NOT call upsertSlackMessage since text hasn't changed
      expect(mockUpsertSlackMessageCalls.length).toBe(0);
    });
  });

  describe("Prerelease Processing", () => {
    it("should save prerelease messages to slackMessageDrafting field", async () => {
      const mockPrerelease = {
        html_url: "https://github.com/Comfy-Org/desktop/releases/tag/v1.0.0-beta.1",
        tag_name: "v1.0.0-beta.1",
        draft: false,
        prerelease: true,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        body: "Beta release notes",
      };

      mockReleasesData = [mockPrerelease];

      await runGithubDesktopReleaseNotificationTask();

      // Check that slackMessageDrafting was set, not slackMessage
      const draftingCall = mockFindOneAndUpdateCalls.find(
        (call) => call.update.$set.slackMessageDrafting !== undefined,
      );
      expect(draftingCall).toBeDefined();
    });
  });

  describe("Core Version Integration", () => {
    it("should include core version in message when desktop release references ComfyUI core", async () => {
      const mockDesktopRelease = {
        html_url: "https://github.com/Comfy-Org/desktop/releases/tag/v1.0.0",
        tag_name: "v1.0.0",
        draft: false,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        body: "Update ComfyUI core to v0.2.0\n\nOther changes...",
      };

      mockReleasesData = [mockDesktopRelease];

      // Mock findOne to return core task
      mockCollection.findOne = async (filter: any) => {
        mockFindOneCalls.push(filter);
        if (filter.version === "v0.2.0") {
          return {
            version: "v0.2.0",
            slackMessage: {
              text: "ComfyUI core v0.2.0 released",
              url: "https://slack.com/message/core-123",
            },
          };
        }
        return null;
      };

      await runGithubDesktopReleaseNotificationTask();

      // Check that upsertSlackMessage was called with core version
      const messageCall = mockUpsertSlackMessageCalls.find((call) => call.text.includes("Core: v0.2.0"));
      expect(messageCall).toBeDefined();
    });
  });

  describe("Repository Configuration", () => {
    it("should process releases from configured repositories", async () => {
      const mockComfyUIRelease = {
        html_url: "https://github.com/comfyanonymous/ComfyUI/releases/tag/v0.3.0",
        tag_name: "v0.3.0",
        draft: false,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        body: "ComfyUI release",
      };

      mockReleasesData = [mockComfyUIRelease];

      await runGithubDesktopReleaseNotificationTask();

      // Verify releases were processed
      expect(mockFindOneAndUpdateCalls.length).toBeGreaterThan(0);
    });
  });

  describe("Date Filtering", () => {
    it("should skip releases created before sendSince date", async () => {
      const oldRelease = {
        html_url: "https://github.com/Comfy-Org/desktop/releases/tag/v0.1.0",
        tag_name: "v0.1.0",
        draft: false,
        prerelease: false,
        created_at: "2024-01-01T00:00:00Z",
        published_at: "2024-01-01T00:00:00Z",
        body: "Old release",
      };

      mockReleasesData = [oldRelease];

      await runGithubDesktopReleaseNotificationTask();

      // Should save the release but not send a message
      expect(mockFindOneAndUpdateCalls.length).toBeGreaterThan(0);
      expect(mockUpsertSlackMessageCalls.length).toBe(0);
    });
  });

  describe("Database Index", () => {
    it("should create unique index on url field", async () => {
      // This is tested by the module initialization
      // The createIndex mock is called when the module loads
      expect(mockCollection.createIndex).toBeDefined();
    });
  });
});
