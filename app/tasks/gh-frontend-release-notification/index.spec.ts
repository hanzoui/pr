import { describe, expect, it, jest, beforeEach, afterEach } from "@jest/globals";
import { db } from "@/src/db";
import { gh } from "@/src/gh";
import { parseGithubRepoUrl } from "@/src/parseOwnerRepo";
import { getSlackChannel } from "@/src/slack/channels";
import runGithubFrontendReleaseNotificationTask, {
  GithubFrontendReleaseNotificationTask,
} from "./index";

jest.mock("@/src/gh");
jest.mock("@/src/slack/channels");
jest.mock("../gh-desktop-release-notification/upsertSlackMessage");

const mockGh = gh as jest.Mocked<typeof gh>;
const mockGetSlackChannel = getSlackChannel as jest.MockedFunction<typeof getSlackChannel>;

describe("GithubFrontendReleaseNotificationTask", () => {
  let collection: any;

  beforeEach(async () => {
    jest.clearAllMocks();
    
    collection = {
      findOne: jest.fn(),
      findOneAndUpdate: jest.fn(),
      createIndex: jest.fn(),
    };
    
    jest.spyOn(db, 'collection').mockReturnValue(collection);
    
    mockGetSlackChannel.mockResolvedValue({
      id: "test-channel-id",
      name: "frontend",
    } as any);
  });

  afterEach(async () => {
    jest.restoreAllMocks();
  });

  describe("parseGithubRepoUrl", () => {
    it("should correctly parse ComfyUI_frontend repo URL", () => {
      const result = parseGithubRepoUrl("https://github.com/Comfy-Org/ComfyUI_frontend");
      expect(result).toEqual({
        owner: "Comfy-Org",
        repo: "ComfyUI_frontend",
      });
    });
  });

  describe("Release Processing", () => {
    it("should process stable releases", async () => {
      const mockRelease = {
        html_url: "https://github.com/Comfy-Org/ComfyUI_frontend/releases/tag/v1.0.0",
        tag_name: "v1.0.0",
        draft: false,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        body: "Release notes",
      };

      mockGh.repos = {
        listReleases: jest.fn().mockResolvedValue({
          data: [mockRelease],
        }),
      } as any;

      collection.findOneAndUpdate.mockResolvedValue({
        url: mockRelease.html_url,
        version: mockRelease.tag_name,
        status: "stable",
        isStable: true,
        createdAt: new Date(mockRelease.created_at),
        releasedAt: new Date(mockRelease.published_at),
      });

      await runGithubFrontendReleaseNotificationTask();

      expect(mockGh.repos.listReleases).toHaveBeenCalledWith({
        owner: "Comfy-Org",
        repo: "ComfyUI_frontend",
        per_page: 3,
      });

      expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
        { url: mockRelease.html_url },
        expect.objectContaining({
          $set: expect.objectContaining({
            url: mockRelease.html_url,
            version: mockRelease.tag_name,
            status: "stable",
            isStable: true,
          }),
        }),
        { upsert: true, returnDocument: "after" }
      );
    });

    it("should process prerelease", async () => {
      const mockPrerelease = {
        html_url: "https://github.com/Comfy-Org/ComfyUI_frontend/releases/tag/v1.0.0-beta.1",
        tag_name: "v1.0.0-beta.1",
        draft: false,
        prerelease: true,
        created_at: new Date().toISOString(),
        published_at: new Date().toISOString(),
        body: "Beta release notes",
      };

      mockGh.repos = {
        listReleases: jest.fn().mockResolvedValue({
          data: [mockPrerelease],
        }),
      } as any;

      collection.findOneAndUpdate.mockResolvedValue({
        url: mockPrerelease.html_url,
        version: mockPrerelease.tag_name,
        status: "prerelease",
        isStable: false,
        createdAt: new Date(mockPrerelease.created_at),
        releasedAt: new Date(mockPrerelease.published_at),
      });

      await runGithubFrontendReleaseNotificationTask();

      expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
        { url: mockPrerelease.html_url },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: "prerelease",
            isStable: false,
          }),
        }),
        { upsert: true, returnDocument: "after" }
      );
    });

    it("should process draft releases", async () => {
      const mockDraft = {
        html_url: "https://github.com/Comfy-Org/ComfyUI_frontend/releases/tag/v2.0.0",
        tag_name: "v2.0.0",
        draft: true,
        prerelease: false,
        created_at: new Date().toISOString(),
        published_at: null,
        body: "Draft release notes",
      };

      mockGh.repos = {
        listReleases: jest.fn().mockResolvedValue({
          data: [mockDraft],
        }),
      } as any;

      collection.findOneAndUpdate.mockResolvedValue({
        url: mockDraft.html_url,
        version: mockDraft.tag_name,
        status: "draft",
        isStable: false,
        createdAt: new Date(mockDraft.created_at),
        releasedAt: undefined,
      });

      await runGithubFrontendReleaseNotificationTask();

      expect(collection.findOneAndUpdate).toHaveBeenCalledWith(
        { url: mockDraft.html_url },
        expect.objectContaining({
          $set: expect.objectContaining({
            status: "draft",
            isStable: false,
            releasedAt: undefined,
          }),
        }),
        { upsert: true, returnDocument: "after" }
      );
    });

    it("should skip old releases before sendSince date", async () => {
      const oldRelease = {
        html_url: "https://github.com/Comfy-Org/ComfyUI_frontend/releases/tag/v0.1.0",
        tag_name: "v0.1.0",
        draft: false,
        prerelease: false,
        created_at: "2024-01-01T00:00:00Z",
        published_at: "2024-01-01T00:00:00Z",
        body: "Old release",
      };

      mockGh.repos = {
        listReleases: jest.fn().mockResolvedValue({
          data: [oldRelease],
        }),
      } as any;

      collection.findOneAndUpdate.mockResolvedValue({
        url: oldRelease.html_url,
        version: oldRelease.tag_name,
        status: "stable",
        isStable: true,
        createdAt: new Date(oldRelease.created_at),
        releasedAt: new Date(oldRelease.published_at),
      });

      await runGithubFrontendReleaseNotificationTask();

      expect(collection.findOneAndUpdate).toHaveBeenCalledTimes(1);
    });
  });

  describe("Database Index", () => {
    it("should create unique index on url field", async () => {
      expect(collection.createIndex).toHaveBeenCalledWith({ url: 1 }, { unique: true });
    });
  });
});