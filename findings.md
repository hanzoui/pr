# Findings: Slack Bolt Refactoring

## Key Discoveries from Template Analysis

### 1. Listener-Based Architecture Pattern

**Source:** `/v1/code/slack-samples/bolt-js-assistant-template/tree/main/`

**Key Files:**

- `app.js` (27 lines) - Minimal initialization
- `listeners/index.js` (12 lines) - Registration hub
- `listeners/events/app_mention.js` (67 lines) - Event handler
- `listeners/assistant/message.js` (164 lines) - Message handler with streaming

**Pattern:**

```typescript
// In app.js
import { registerListeners } from "./listeners/index.js";
registerListeners(app);
await app.start();

// In listeners/index.js
export const registerListeners = (app) => {
  events.register(app);
  actions.register(app);
  assistant.register(app);
};

// In listeners/events/index.js
export const register = (app) => {
  app.event("app_mention", appMentionCallback);
};
```

**Benefits:**

- Clear separation of concerns
- Each file has single responsibility
- Easy to test individual handlers
- Scalable architecture

---

### 2. Event Handler Signature Pattern

**Template Pattern:**

```typescript
export const appMentionCallback = async ({ event, client, logger, say }) => {
  try {
    // Implementation
  } catch (e) {
    logger.error(e);
    await say({ text: `Error: ${e}` });
  }
};
```

**Key Observations:**

- Always wrap in try-catch
- Always log errors with logger.error()
- Always provide graceful user feedback via say()
- Use dependency injection (parameters) not globals

---

### 3. Streaming Response Pattern

**Template shows:**

```typescript
const streamer = client.chatStream({
  channel: channel,
  recipient_team_id: teamId,
  recipient_user_id: userId,
  thread_ts: thread_ts,
});

for await (const chunk of llmResponse) {
  if (chunk.type === "response.output_text.delta") {
    await streamer.append({ markdown_text: chunk.delta });
  }
}
await streamer.stop({ blocks: [feedbackBlock] });
```

**Benefits:**

- User sees response within 100ms
- Better perceived performance
- Natural streaming UX

---

## Current bot/index.ts Architecture Analysis

### File Size and Structure

- **Total lines:** 1368
- **Main function:** `spawnBotOnSlackMessageEvent()` (lines 358-1325) - 967 lines!
- **Helper functions:** Lines 101-122, 1327-1367

### Key Components

#### 1. Initialization (Lines 1-127)

- Imports (35 lines)
- Logger setup (71 lines)
- State management with Keyv
- TaskInputFlows Map
- Helper functions: addWorkingTask(), removeWorkingTask()

#### 2. Main Startup (Lines 128-355)

- Health check logic (lines 133-181)
- Port killing and server setup (lines 183-217)
- Missed message processing (lines 223-230)
- Continue flag logic (lines 233-256)
- RestartManager setup (lines 260-278)
- SocketModeClient initialization (lines 280-354)

#### 3. Event Handlers (Lines 284-344)

- app_mention handler (lines 285-292)
- message handler (lines 293-344)
- Error handlers (line 346)
- Connection handlers (lines 347-349)

#### 4. Core Bot Logic (Lines 358-1325)

- Function: `spawnBotOnSlackMessageEvent()`
- Message deduplication (lines 374-377)
- Channel authorization (lines 384-390)
- Thread context gathering (lines 401-444)
- Intent detection with LLM (lines 560-594)
- Agent spawning with claude-yes (lines 1063-1120)
- Terminal output streaming (lines 1123-1291)
- Task cleanup (lines 1293-1324)

#### 5. Helper Functions (Lines 1327-1367)

- `sleep()` (lines 1327-1329)
- `getSlackMessageFromUrl()` (lines 1331-1335)
- `commonPrefix()` (lines 1337-1349)
- `sanitized()` (lines 1350-1352)
- `spawnBotOnSlackMessageUrl()` (lines 1354-1367)

---

## Dependencies Used

### Current Dependencies (from bot/index.ts)

- `@slack/socket-mode` - Socket mode client
- `@slack/web-api` - Slack API
- `winston` - Logging
- `keyv` - State storage (with multiple backends)
- `sflow` - Stream processing
- `z-chat-completion` - LLM structured outputs
- `terminal-render` - Terminal text rendering
- Custom imports from `@/lib`, `@/src`, `bot/`

### Template Dependencies

- `@slack/bolt` (includes web-api)
- `dotenv`
- `openai`

**Note:** Current bot uses SocketModeClient directly instead of Bolt's App class

---

## Critical Features to Preserve

### 1. Working Tasks State Management

- `addWorkingTask()` / `removeWorkingTask()` functions
- State key: `current-working-tasks`
- Used for tracking active tasks and resume functionality

### 2. RestartManager

- Smart restart when idle (TaskInputFlows.size === 0)
- File watching for auto-reload
- Clean exit codes

### 3. Continue Flag Logic

- `--continue` flag to resume crashed tasks
- Reads from `current-working-tasks` state
- Calls `spawnBotOnSlackMessageEvent()` for each task

### 4. Health Check System

- `/status` endpoint shows processing message URLs
- 10-second polling for non-PTY launches
- Process coordination to prevent conflicts

### 5. Agent Workspace Setup

- Creates working directory: `/bot/slack/{channel}/{workspaceId}`
- Writes CLAUDE.md with instructions
- Creates .claude/skills/ directory
- Clones pr-bot repo for reference
- Spawns claude-yes CLI

### 6. Terminal Output Streaming

- Uses TerminalTextRender to parse ANSI codes
- LLM-based message updates from agent output
- Live Slack message updates with reactions

### 7. Message Deduplication

- State key: `msg-{event.ts}`
- 10-second debounce
- Prevents duplicate processing

---

## Refactoring Challenges

### 1. Socket Mode vs Bolt App

**Current:** Uses `SocketModeClient` directly
**Template:** Uses Bolt's `App` class

**Options:**
a. Keep SocketModeClient, extract listeners as functions
b. Migrate to Bolt App class (more invasive)

**Decision:** Keep SocketModeClient for now, focus on structure

### 2. Complex Agent Spawning Logic

The `spawnBotOnSlackMessageEvent()` function is 967 lines and does:

- Message deduplication
- Channel authorization
- Thread context gathering
- LLM-based intent detection
- Working directory setup
- Skills installation
- Agent spawning
- Terminal output streaming
- Live Slack updates
- Task state management

**Challenge:** How to break this down without losing cohesion?

**Approach:** Extract into smaller functions:

- `checkMessageAuthorization()`
- `gatherThreadContext()`
- `detectUserIntent()`
- `setupAgentWorkspace()`
- `spawnAgentProcess()`
- `streamAgentOutput()`
- `updateSlackMessage()`

### 3. State Management

Multiple state keys used throughout:

- `current-working-tasks`
- `msg-{ts}`
- `task-{workspaceId}`
- `task-quick-respond-msg-{eventId}`

**Challenge:** Keep state logic centralized

**Approach:** Create `bot/state/` module to encapsulate state operations

---

## Template Features We Won't Use (Yet)

### 1. Assistant API Class

- Template uses `new Assistant({ ... })`
- Requires Bolt App class
- Provides thread context management
- **Deferred:** Keep current architecture for now

### 2. Streaming Responses

- Template uses `client.chatStream()`
- Current bot uses LLM-based message updates
- **Deferred:** More complex migration, different approach

### 3. Feedback Buttons

- Template adds feedback collection
- **Deferred:** Nice-to-have, not critical

---

## File Extraction Plan

### High Priority (Phase 2)

1. `listeners/events/app_mention.ts` - Extract lines 358-1325
2. `listeners/events/message.ts` - Extract lines 293-344
3. `listeners/events/index.ts` - Registration hub
4. `listeners/index.ts` - Main registration function

### Medium Priority (Phase 3-4)

5. `utils/helpers.ts` - Extract helper functions (sanitized, commonPrefix, etc)
6. `state/working_tasks.ts` - Extract addWorkingTask/removeWorkingTask
7. `agent/workspace.ts` - Extract workspace setup logic
8. `agent/spawner.ts` - Extract agent spawning logic

### Low Priority (Phase 5+)

9. `middleware/error_handler.ts` - Centralized error handling
10. `agent/terminal_stream.ts` - Extract terminal streaming logic

---

## Questions to Resolve

1. Should we migrate to Bolt App class or keep SocketModeClient?
   - **Decision:** Keep SocketModeClient for minimal changes

2. How to handle the massive spawnBotOnSlackMessageEvent function?
   - **Decision:** Keep in single file initially, extract helper functions

3. Where should State management logic live?
   - **Decision:** Create state/ module for working tasks management

4. Should we change the agent spawning approach?
   - **Decision:** No, keep claude-yes CLI approach

---

## Success Metrics

- [ ] bot/index.ts: < 100 lines
- [ ] Largest file: < 300 lines
- [ ] All files: < 150 lines average
- [ ] Listener registration: Single function call
- [ ] Tests: Pass (or create minimal smoke tests)
- [ ] Functionality: 100% preserved

---

## Last Updated

2026-01-13 - Initial findings from template analysis and bot/index.ts analysis
