import { describe, it, expect } from "vitest";
import { RedditClient } from "../src/reddit-client.js";
import { runTool } from "../src/tools/index.js";
import { SUBREDDIT_LISTING, POST_WITH_COMMENTS, USER_OVERVIEW, SEARCH_LISTING } from "./fixtures.js";

function makeMockClient(): RedditClient {
  const fetchImpl = (async (input: string | URL) => {
    const url = String(input);
    if (url.includes("/comments/post1")) {
      return new Response(JSON.stringify(POST_WITH_COMMENTS));
    }
    if (url.includes("/comments/nope")) {
      return new Response(JSON.stringify([{ data: { children: [] } }, { data: { children: [] } }]));
    }
    if (url.includes("/user/pg")) {
      return new Response(JSON.stringify(USER_OVERVIEW));
    }
    if (url.includes("/search.json")) {
      return new Response(JSON.stringify(SEARCH_LISTING));
    }
    if (url.match(/\/r\/[^/]+\/(hot|new|top|rising|controversial)\.json/)) {
      return new Response(JSON.stringify(SUBREDDIT_LISTING));
    }
    return new Response("", { status: 404 });
  }) as unknown as typeof fetch;
  return new RedditClient({ fetchImpl, maxRetries: 0 });
}

describe("runTool('subreddit_posts')", () => {
  it("returns posts from the requested subreddit + sort", async () => {
    const result = (await runTool(
      "subreddit_posts",
      { subreddit: "programming", sort: "hot", limit: 25 },
      makeMockClient(),
    )) as { subreddit: string; sort: string; posts: Array<{ id: string }> };
    expect(result.subreddit).toBe("programming");
    expect(result.sort).toBe("hot");
    expect(result.posts.length).toBeGreaterThan(0);
  });

  it("rejects invalid subreddit names", async () => {
    await expect(
      runTool("subreddit_posts", { subreddit: "has space", sort: "hot" }, makeMockClient()),
    ).rejects.toThrow();
  });
});

describe("runTool('post_details')", () => {
  it("returns post without comments by default", async () => {
    const result = (await runTool(
      "post_details",
      { post_id: "post1", subreddit: "askreddit" },
      makeMockClient(),
    )) as { id: string; title?: string; comments?: unknown[] };
    expect(result.id).toBe("post1");
    expect(result.title).toContain("favorite editor");
    expect(result.comments).toBeUndefined();
  });

  it("loads comment tree when with_comments=true", async () => {
    const result = (await runTool(
      "post_details",
      { post_id: "post1", subreddit: "askreddit", with_comments: true, max_comment_depth: 2 },
      makeMockClient(),
    )) as { comments?: Array<{ id: string; replies?: Array<{ id: string }> }> };
    expect(Array.isArray(result.comments)).toBe(true);
    expect(result.comments?.length).toBeGreaterThan(0);
    const c1 = result.comments!.find((c) => c.id === "c1");
    expect(c1?.replies?.[0]?.id).toBe("c2");
  });

  it("returns not_found when post missing", async () => {
    const result = (await runTool(
      "post_details",
      { post_id: "nope" },
      makeMockClient(),
    )) as { not_found: boolean };
    expect(result.not_found).toBe(true);
  });
});

describe("runTool('user_profile')", () => {
  it("returns posts + comments for a known user", async () => {
    const result = (await runTool(
      "user_profile",
      { username: "pg", kind: "overview" },
      makeMockClient(),
    )) as { username: string; posts: unknown[]; comments: unknown[] };
    expect(result.username).toBe("pg");
    expect(result.posts.length).toBeGreaterThan(0);
    expect(result.comments.length).toBeGreaterThan(0);
  });
});

describe("runTool('search')", () => {
  it("returns posts matching a query", async () => {
    const result = (await runTool(
      "search",
      { query: "rust", sort: "top", time_filter: "year" },
      makeMockClient(),
    )) as { query: string; posts: Array<{ id: string }> };
    expect(result.query).toBe("rust");
    expect(result.posts.length).toBeGreaterThan(0);
  });

  it("can restrict to a subreddit", async () => {
    const result = (await runTool(
      "search",
      { query: "rust", subreddit: "rust" },
      makeMockClient(),
    )) as { subreddit?: string; posts: unknown[] };
    expect(result.subreddit).toBe("rust");
    expect(result.posts.length).toBeGreaterThan(0);
  });
});
