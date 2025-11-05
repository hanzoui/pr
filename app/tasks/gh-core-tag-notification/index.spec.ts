import { afterEach, beforeEach, describe, expect, it } from "bun:test";

// Track mocked function calls
let mockUpsertSlackMessageCalls: any[] = [];
let mockFindOneAndUpdateCalls: any[] = [];
let mockFindOneCalls: any[] = [];
let mockTagsData: any[] = [];
let mockCommitData: any = null;
let mockGitTagData: any = null;

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
      listTags: async () => ({ data: mockTagsData }),
      getCommit: async () => ({ data: mockCommitData }),
    },
    git: {
      getTag: async () => {
        if (mockGitTagData) {
          return { data: mockGitTagData };
        }
        throw new Error("Not an annotated tag");
      },
    },
  },
}));

// Mock Slack channels
mock.module("@/src/slack/channels", () => ({
  getSlackChannel: async () => ({ id: "test-channel-id", name: "desktop" }),
}));

// Mock upsert Slack message
mock.module("../gh-desktop-release-notification/upsertSlackMessage", () => ({
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
const { default: runGithubCoreTagNotificationTask } = await import("./index");

describe("GithubCoreTagNotificationTask", () => {
  beforeEach(() => {
    // Reset tracking arrays
    mockUpsertSlackMessageCalls = [];
    mockFindOneAndUpdateCalls = [];
    mockFindOneCalls = [];
    mockTagsData = [];
    mockCommitData = {
      commit: {
        author: { date: new Date().toISOString() },
        committer: { date: new Date().toISOString() },
      },
    };
    mockGitTagData = null;

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

  afterEach(() => {
    // Clean up
  });

  it("should fetch tags from the ComfyUI repository", async () => {
    const mockTags = [
      {
        name: "v0.2.1",
        commit: {
          sha: "abc123def456",
          url: "https://api.github.com/repos/comfyanonymous/ComfyUI/commits/abc123def456",
        },
        zipball_url: "https://api.github.com/repos/comfyanonymous/ComfyUI/zipball/v0.2.1",
        tarball_url: "https://api.github.com/repos/comfyanonymous/ComfyUI/tarball/v0.2.1",
        node_id: "REF_kwDOI_",
      },
    ];

    mockTagsData = mockTags;

    await runGithubCoreTagNotificationTask();

    // Verify tags were processed
    expect(mockFindOneAndUpdateCalls.length).toBeGreaterThan(0);
  });

  it("should save new tags to the database", async () => {
    const mockTags = [
      {
        name: "v0.2.2",
        commit: {
          sha: "def789ghi012",
          url: "https://api.github.com/repos/comfyanonymous/ComfyUI/commits/def789ghi012",
        },
      },
    ];

    mockTagsData = mockTags;
    mockGitTagData = {
      tag: "v0.2.2",
      tagger: {
        date: new Date().toISOString(),
        name: "Test Author",
        email: "test@example.com",
      },
      message: "Release v0.2.2 with new features",
    };

    await runGithubCoreTagNotificationTask();

    expect(mockFindOneAndUpdateCalls.length).toBeGreaterThan(0);
  });

  it("should send Slack notifications for new tags", async () => {
    const mockTags = [
      {
        name: "v0.2.3",
        commit: {
          sha: "123abc456def",
          url: "https://api.github.com/repos/comfyanonymous/ComfyUI/commits/123abc456def",
        },
      },
    ];

    mockTagsData = mockTags;

    await runGithubCoreTagNotificationTask();

    expect(mockUpsertSlackMessageCalls.length).toBeGreaterThan(0);
    const messageCall = mockUpsertSlackMessageCalls.find((call) => call.text.includes("v0.2.3"));
    expect(messageCall).toBeDefined();
  });

  it("should not send duplicate notifications for existing tags", async () => {
    const mockTags = [
      {
        name: "v0.2.0",
        commit: {
          sha: "existing123",
          url: "https://api.github.com/repos/comfyanonymous/ComfyUI/commits/existing123",
        },
      },
    ];

    mockTagsData = mockTags;

    // Mock findOne to return existing task
    mockCollection.findOne = async (filter: any) => {
      mockFindOneCalls.push(filter);
      if (filter.tagName === "v0.2.0") {
        return {
          tagName: "v0.2.0",
          commitSha: "existing123",
          url: "https://github.com/comfyanonymous/ComfyUI/releases/tag/v0.2.0",
          slackMessage: {
            text: "Already sent",
            channel: "test-channel-id",
            url: "https://slack.com/message/old",
          },
        };
      }
      return null;
    };

    await runGithubCoreTagNotificationTask();

    expect(mockUpsertSlackMessageCalls.length).toBe(0);
  });

  it("should handle annotated tags with messages", async () => {
    const mockTags = [
      {
        name: "v0.3.0",
        commit: {
          sha: "annotated123",
          url: "https://api.github.com/repos/comfyanonymous/ComfyUI/commits/annotated123",
        },
      },
    ];

    const tagMessage = "Major release with breaking changes";

    mockTagsData = mockTags;
    mockGitTagData = {
      tag: "v0.3.0",
      tagger: {
        date: new Date().toISOString(),
        name: "Test Author",
        email: "test@example.com",
      },
      message: tagMessage,
    };

    await runGithubCoreTagNotificationTask();

    const messageCall = mockUpsertSlackMessageCalls.find((call) => call.text.includes(tagMessage));
    expect(messageCall).toBeDefined();
  });

  it("should respect sendSince configuration", async () => {
    const oldDate = new Date("2024-01-01T00:00:00Z");
    const mockTags = [
      {
        name: "v0.1.0",
        commit: {
          sha: "old123",
          url: "https://api.github.com/repos/comfyanonymous/ComfyUI/commits/old123",
        },
      },
    ];

    mockTagsData = mockTags;
    mockCommitData = {
      commit: {
        author: { date: oldDate.toISOString() },
        committer: { date: oldDate.toISOString() },
      },
    };
    mockGitTagData = {
      tag: "v0.1.0",
      tagger: {
        date: oldDate.toISOString(),
      },
    };

    await runGithubCoreTagNotificationTask();

    // Should save the tag but not send a message (old date)
    expect(mockUpsertSlackMessageCalls.length).toBe(0);
  });
});
