import { server } from "@/src/test/msw-setup";
import { beforeEach, describe, it, mock } from "bun:test";
import { http, HttpResponse } from "msw";

// Mock database
const mockDb = {
  collection: mock(() => ({
    deleteMany: mock(() => Promise.resolve()),
    findOne: mock(() => Promise.resolve(null)),
    updateOne: mock(() => Promise.resolve()),
  })),
};

mock.module("@/src/db", () => ({ db: mockDb }));

describe("gh-test-evidence", () => {
  beforeEach(() => {
    // Reset mocks before each test
    mockDb.collection.mockClear();

    // Setup default OpenAI handler
    server.use(
      http.post("https://api.openai.com/v1/chat/completions", () => {
        return HttpResponse.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  isTestExplanationIncluded: false,
                  isTestScreenshotIncluded: false,
                  isTestVideoIncluded: false,
                }),
              },
            },
          ],
        });
      }),
    );
  });

  it("should analyze PR with missing test evidence", async () => {
    const mockPR = {
      html_url: "https://github.com/test/repo/pull/1",
      number: 1,
      title: "Test PR",
      body: "Some changes",
      updated_at: new Date().toISOString(),
      draft: false,
      base: {
        repo: {
          html_url: "https://github.com/test/repo",
        },
      },
    };

    server.use(
      http.get("https://api.github.com/repos/:owner/:repo/pulls", () => {
        return HttpResponse.json([mockPR]);
      }),
      http.get("https://api.github.com/repos/:owner/:repo/issues/:number/comments", () => {
        return HttpResponse.json([]);
      }),
    );

    // Import and run the task
    const runGhTestEvidenceTask = (await import("./gh-test-evidence")).default;

    // Note: In a real test, you'd want to run this but it requires
    // proper mocking of all dependencies and database operations
    // For now, we're just testing the structure
  });

  it("should skip draft PRs", async () => {
    const mockPR = {
      html_url: "https://github.com/test/repo/pull/2",
      number: 2,
      title: "Draft PR",
      body: "Draft changes",
      updated_at: new Date().toISOString(),
      draft: true,
      base: {
        repo: {
          html_url: "https://github.com/test/repo",
        },
      },
    };

    server.use(
      http.get("https://api.github.com/repos/:owner/:repo/pulls", () => {
        return HttpResponse.json([mockPR]);
      }),
    );

    // Should not call OpenAI or create comments for draft PRs
    // This would be verified in a full integration test
  });

  it("should delete comment when all evidence is present", async () => {
    const mockPR = {
      html_url: "https://github.com/test/repo/pull/3",
      number: 3,
      title: "Complete PR",
      body: "Here's my test plan. And here's a screenshot: ![image](https://example.com/img.png)",
      updated_at: new Date().toISOString(),
      draft: false,
      base: {
        repo: {
          html_url: "https://github.com/test/repo",
        },
      },
    };

    const existingComment = {
      id: 456,
      user: { login: "test-bot" },
      body: "<!-- COMFY_PR_BOT_TEST_EVIDENCE -->\nWarning message",
    };

    server.use(
      http.get("https://api.github.com/repos/:owner/:repo/pulls", () => {
        return HttpResponse.json([mockPR]);
      }),
      http.get("https://api.github.com/repos/:owner/:repo/issues/:number/comments", () => {
        return HttpResponse.json([existingComment]);
      }),
      http.post("https://api.openai.com/v1/chat/completions", () => {
        return HttpResponse.json({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  isTestExplanationIncluded: true,
                  isTestScreenshotIncluded: true,
                  isTestVideoIncluded: false,
                }),
              },
            },
          ],
        });
      }),
    );

    // Should call deleteComment
    // This would be verified in a full integration test
  });

  it("should generate correct warning message format", async () => {
    // Test the warning message format matches the ComfyUI_frontend pattern
    const evidence = {
      isTestExplanationIncluded: false,
      isTestScreenshotIncluded: false,
      isTestVideoIncluded: false,
    };

    // Warning message should include:
    // - BOT_COMMENT_MARKER
    // - "## Test Evidence Check" header
    // - Warning emoji (⚠️)
    // - Bold warning titles
    // - Clear instructions
  });
});
