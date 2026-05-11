# Apify Reddit Public Tool Server (MCP-style)

An Apify Actor that exposes Reddit's public `.json` endpoints as a small set of tools an LLM agent can call — one Actor run = one tool call. **No auth required** (uses Reddit's read-only public API). Designed for MCP clients and direct invocation alike.

## Tools

| Tool | Purpose |
|---|---|
| `subreddit_posts` | List hot / new / top / rising / controversial posts from a subreddit |
| `post_details` | Fetch a post by ID, optionally with its comment tree |
| `user_profile` | Fetch a user's submitted posts and/or comments |
| `search` | Reddit search (sitewide or restricted to a subreddit) |

## Input

```json
{
  "tool": "subreddit_posts",
  "args": { "subreddit": "programming", "sort": "hot", "limit": 25 }
}
```

Per-tool arg schemas are Zod-validated and listed in `src/types.ts`. The Actor's `input_schema.json` mirrors the public shape so Apify's UI renders a tool picker.

## Example: get a post with its top comments

```json
{
  "tool": "post_details",
  "args": {
    "post_id": "abc123",
    "subreddit": "askreddit",
    "with_comments": true,
    "max_comment_depth": 2,
    "max_comments_per_level": 50
  }
}
```

Output:

```json
{
  "id": "abc123",
  "subreddit": "askreddit",
  "author": "op_user",
  "title": "What's your favorite editor?",
  "text": "Curious.",
  "permalink": "https://www.reddit.com/r/askreddit/comments/abc123/...",
  "posted_at": "2023-11-14T22:13:20.000Z",
  "score": 1000,
  "comment_count": 250,
  "comments": [
    {
      "id": "c1",
      "author": "user1",
      "text": "Neovim, always.",
      "posted_at": "...",
      "score": 50,
      "replies": [ { "id": "c2", "text": "Same here.", "depth": 1 } ]
    }
  ]
}
```

## Why "one run = one tool call"

This shape lets the Actor opt into Apify's `PAY_PER_EVENT` pricing model: each MCP-style invocation is one billable event. The four tools map cleanly to the things an LLM agent actually wants from Reddit (browse, drill down, profile, search) — easy to pick, easy to bill, easy to cache.

## Run locally

```
npm install
npm run build
apify run --input-file=./examples/hot.json
```

## Tests

```
npm test
```

23 tests across `test/client.test.ts` (Reddit JSON client, retry + UA + parsing) and `test/tools.test.ts` (the four tools end-to-end with a mocked fetch).

## Architecture

```
src/
  main.ts             Apify entry — reads input, dispatches to runTool
  tools/index.ts      Single dispatcher; one async runner per tool
  reddit-client.ts    Reddit .json client with retry, UA, parsing
  types.ts            Zod schemas for input + outputs; inferred TS types
test/
  fixtures.ts         Realistic listing/post/comment/user/search fixtures
  client.test.ts      15 tests on the HTTP layer
  tools.test.ts       8 tests on the dispatcher
```

## License

MIT
