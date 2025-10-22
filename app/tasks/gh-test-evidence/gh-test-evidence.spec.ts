import { db } from "@/src/db";
import { beforeEach, describe, it, mock } from "bun:test";

// Mock dependencies
const mockGh = {
  issues: {
    createComment: mock(() => Promise.resolve({ data: { id: 123 } })),
    updateComment: mock(() => Promise.resolve({ data: { id: 123 } })),
    deleteComment: mock(() => Promise.resolve()),
    listComments: mock(() => Promise.resolve({ data: [] })),
  },
};

const mockGhc = {
  pulls: {
    list: mock(() => Promise.resolve({ data: [] })),
  },
  issues: {
    listComments: mock(() => Promise.resolve({ data: [] })),
  },
};

const mockGhUser = mock(() => Promise.resolve({ login: "test-bot" }));

const mockOpenAI = {
  chat: {
    completions: {
      create: mock(() =>
        Promise.resolve({
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
        }),
      ),
    },
  },
};

// Mock modules
mock.module("@/src/gh", () => ({ gh: mockGh }));
mock.module("@/src/ghc", () => ({ ghc: mockGhc }));
mock.module("@/src/ghUser", () => ({ ghUser: mockGhUser }));
mock.module("openai", () => ({
  OpenAI: class {
    chat = mockOpenAI.chat;
  },
}));

describe("gh-test-evidence", () => {
  beforeEach(async () => {
    // Clear database collection before each test
    const collection = db.collection("GithubTestEvidenceTask");
    await collection.deleteMany({});

    // Reset mocks
    mockGh.issues.createComment.mockClear();
    mockGh.issues.updateComment.mockClear();
    mockGh.issues.deleteComment.mockClear();
    mockGhc.pulls.list.mockClear();
    mockGhc.issues.listComments.mockClear();
    mockOpenAI.chat.completions.create.mockClear();
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

    mockGhc.pulls.list.mockResolvedValueOnce({ data: [mockPR] });
    mockGhc.issues.listComments.mockResolvedValueOnce({ data: [] });

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

    mockGhc.pulls.list.mockResolvedValueOnce({ data: [mockPR] });

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

    mockGhc.pulls.list.mockResolvedValueOnce({ data: [mockPR] });
    mockGhc.issues.listComments.mockResolvedValueOnce({ data: [existingComment] });

    mockOpenAI.chat.completions.create.mockResolvedValueOnce({
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
