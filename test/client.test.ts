import { describe, it, expect, vi } from "vitest";
import { RedditClient, RedditApiError, transformPost, transformComment } from "../src/reddit-client.js";
import { SUBREDDIT_LISTING, POST_WITH_COMMENTS, USER_OVERVIEW, SEARCH_LISTING } from "./fixtures.js";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(typeof body === "string" ? body : JSON.stringify(body), { status });
}

describe("RedditClient.subredditPosts", () => {
  it("fetches a subreddit listing and returns t3 children", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(SUBREDDIT_LISTING)) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl });
    const posts = await client.subredditPosts("programming", "hot", { limit: 25 });
    expect(posts).toHaveLength(2);
    expect(posts[0]?.id).toBe("abc123");
    const url = String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toContain("/r/programming/hot.json");
    expect(url).toContain("limit=25");
  });

  it("adds t= param only for top/controversial", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(SUBREDDIT_LISTING)) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl });
    await client.subredditPosts("programming", "top", { limit: 10, time_filter: "week" });
    const url = String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toContain("t=week");
  });

  it("sends User-Agent header", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(SUBREDDIT_LISTING)) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl, userAgent: "my-app/1.0" });
    await client.subredditPosts("programming", "new");
    const init = (fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![1] as
      | { headers: Record<string, string> }
      | undefined;
    expect(init?.headers["User-Agent"]).toBe("my-app/1.0");
  });
});

describe("RedditClient.postWithComments", () => {
  it("returns the post + flat list of top-level comments", async () => {
    const fetchImpl = (async () => jsonResponse(POST_WITH_COMMENTS)) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl });
    const { post, comments } = await client.postWithComments("post1", "askreddit");
    expect(post?.id).toBe("post1");
    expect(comments).toHaveLength(2);
    expect(comments.map((c) => c.id).sort()).toEqual(["c1", "c3"]);
  });

  it("returns null post when listing empty", async () => {
    const fetchImpl = (async () => jsonResponse([{ data: { children: [] } }, { data: { children: [] } }])) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl });
    const { post, comments } = await client.postWithComments("nope");
    expect(post).toBeNull();
    expect(comments).toHaveLength(0);
  });
});

describe("RedditClient.userListing", () => {
  it("hits /user/<name>.json for overview", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(USER_OVERVIEW)) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl });
    const { posts, comments } = await client.userListing("pg", "overview", "new");
    expect(posts).toHaveLength(1);
    expect(comments).toHaveLength(1);
    const url = String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toContain("/user/pg.json");
  });

  it("hits /user/<name>/submitted.json for submitted kind", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(USER_OVERVIEW)) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl });
    await client.userListing("pg", "submitted", "top");
    const url = String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toContain("/user/pg/submitted.json");
    expect(url).toContain("sort=top");
  });
});

describe("RedditClient.search", () => {
  it("hits /search.json with query + sort", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(SEARCH_LISTING)) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl });
    const posts = await client.search("rust 2.0", { sort: "top", time_filter: "year" });
    expect(posts).toHaveLength(1);
    const url = String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toContain("/search.json");
    expect(url).toContain("q=rust+2.0");
    expect(url).toContain("sort=top");
    expect(url).toContain("t=year");
  });

  it("restricts to subreddit when provided", async () => {
    const fetchImpl = vi.fn(async () => jsonResponse(SEARCH_LISTING)) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl });
    await client.search("rust", { subreddit: "rust" });
    const url = String((fetchImpl as unknown as { mock: { calls: unknown[][] } }).mock.calls[0]![0]);
    expect(url).toContain("/r/rust/search.json");
    expect(url).toContain("restrict_sr=1");
  });
});

describe("RedditClient — error handling", () => {
  it("retries 429 then succeeds", async () => {
    let call = 0;
    const fetchImpl = (async () => {
      call++;
      if (call === 1) return new Response("rate limit", { status: 429 });
      return jsonResponse(SUBREDDIT_LISTING);
    }) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl, maxRetries: 2 });
    const posts = await client.subredditPosts("test", "hot");
    expect(posts).toHaveLength(2);
    expect(call).toBe(2);
  });

  it("throws RedditApiError on persistent 503", async () => {
    const fetchImpl = (async () => new Response("oh no", { status: 503 })) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl, maxRetries: 1 });
    await expect(client.subredditPosts("x", "hot")).rejects.toBeInstanceOf(RedditApiError);
  });

  it("returns null/empty on 404", async () => {
    const fetchImpl = (async () => new Response("", { status: 404 })) as unknown as typeof fetch;
    const client = new RedditClient({ fetchImpl, maxRetries: 0 });
    const posts = await client.subredditPosts("doesnotexist", "hot");
    expect(posts).toEqual([]);
  });
});

describe("transformPost / transformComment", () => {
  it("converts a raw post into a PostOutput with absolute permalink", () => {
    const raw = SUBREDDIT_LISTING.data.children[0]!.data;
    const out = transformPost(raw as Parameters<typeof transformPost>[0]);
    expect(out.id).toBe("abc123");
    expect(out.permalink).toBe("https://www.reddit.com/r/programming/comments/abc123/why_rust/");
    expect(out.posted_at).toMatch(/^2023-/);
    expect(out.flair).toBe("discussion");
    expect(out.upvote_ratio).toBe(0.95);
  });

  it("recurses comment replies up to maxDepth", () => {
    const rawComment = POST_WITH_COMMENTS[1]!.data.children[0]!.data;
    const out = transformComment(rawComment as Parameters<typeof transformComment>[0], 1, 3, 50);
    expect(out.id).toBe("c1");
    expect(out.replies).toHaveLength(1);
    expect(out.replies?.[0]?.id).toBe("c2");
  });

  it("stops recursion at maxDepth", () => {
    const rawComment = POST_WITH_COMMENTS[1]!.data.children[0]!.data;
    const out = transformComment(rawComment as Parameters<typeof transformComment>[0], 1, 1, 50);
    expect(out.id).toBe("c1");
    expect(out.replies).toBeUndefined();
  });
});
