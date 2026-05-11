import {
  RedditCommentRawSchema,
  RedditPostRawSchema,
  type CommentOutput,
  type PostOutput,
  type RedditCommentRaw,
  type RedditPostRaw,
} from "./types.js";

const REDDIT_BASE = "https://www.reddit.com";
const DEFAULT_UA = "apify-reddit-public/0.1 (+https://apify.com)";

export interface RedditClientOptions {
  fetchImpl?: typeof fetch;
  userAgent?: string;
  maxRetries?: number;
}

export class RedditApiError extends Error {
  override name = "RedditApiError";
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
  }
}

export class RedditClient {
  private readonly fetchImpl: typeof fetch;
  private readonly userAgent: string;
  private readonly maxRetries: number;

  constructor(opts: RedditClientOptions = {}) {
    this.fetchImpl = opts.fetchImpl ?? globalThis.fetch;
    this.userAgent = opts.userAgent ?? DEFAULT_UA;
    this.maxRetries = opts.maxRetries ?? 3;
  }

  async subredditPosts(
    subreddit: string,
    sort: "hot" | "new" | "top" | "rising" | "controversial",
    opts: { limit?: number; time_filter?: string } = {},
  ): Promise<RedditPostRaw[]> {
    const params = new URLSearchParams();
    params.set("limit", String(opts.limit ?? 25));
    params.set("raw_json", "1");
    if (sort === "top" || sort === "controversial") {
      params.set("t", opts.time_filter ?? "day");
    }
    const url = `${REDDIT_BASE}/r/${encodeURIComponent(subreddit)}/${sort}.json?${params}`;
    const body = await this.getJson<{
      data?: { children?: Array<{ kind: string; data: unknown }> };
    }>(url);
    return extractPosts(body);
  }

  /** Returns [post, comments]. Comments may be empty even if asked, when Reddit returns none. */
  async postWithComments(
    postId: string,
    subreddit?: string,
  ): Promise<{ post: RedditPostRaw | null; comments: RedditCommentRaw[] }> {
    const path = subreddit
      ? `/r/${encodeURIComponent(subreddit)}/comments/${encodeURIComponent(postId)}.json`
      : `/comments/${encodeURIComponent(postId)}.json`;
    const url = `${REDDIT_BASE}${path}?raw_json=1&limit=200`;
    const body = await this.getJson<unknown[]>(url);
    if (!Array.isArray(body) || body.length < 1) return { post: null, comments: [] };

    const postListing = body[0] as { data?: { children?: Array<{ kind: string; data: unknown }> } };
    const posts = extractPosts(postListing);
    const post = posts[0] ?? null;

    const commentsListing = (body[1] as { data?: { children?: Array<{ kind: string; data: unknown }> } } | undefined) ?? undefined;
    const comments = extractComments(commentsListing);

    return { post, comments };
  }

  async userListing(
    username: string,
    kind: "overview" | "submitted" | "comments",
    sort: "new" | "hot" | "top" | "controversial",
    opts: { limit?: number } = {},
  ): Promise<{ posts: RedditPostRaw[]; comments: RedditCommentRaw[] }> {
    const params = new URLSearchParams();
    params.set("limit", String(opts.limit ?? 25));
    params.set("sort", sort);
    params.set("raw_json", "1");
    const path =
      kind === "overview"
        ? `/user/${encodeURIComponent(username)}.json`
        : `/user/${encodeURIComponent(username)}/${kind}.json`;
    const url = `${REDDIT_BASE}${path}?${params}`;
    const body = await this.getJson<{
      data?: { children?: Array<{ kind: string; data: unknown }> };
    }>(url);
    return {
      posts: extractPosts(body),
      comments: extractComments(body),
    };
  }

  async search(
    query: string,
    opts: {
      subreddit?: string;
      sort?: "relevance" | "hot" | "top" | "new" | "comments";
      time_filter?: string;
      limit?: number;
    } = {},
  ): Promise<RedditPostRaw[]> {
    const params = new URLSearchParams();
    params.set("q", query);
    params.set("sort", opts.sort ?? "relevance");
    params.set("t", opts.time_filter ?? "all");
    params.set("limit", String(opts.limit ?? 25));
    params.set("raw_json", "1");
    if (opts.subreddit) params.set("restrict_sr", "1");
    const path = opts.subreddit
      ? `/r/${encodeURIComponent(opts.subreddit)}/search.json`
      : `/search.json`;
    const url = `${REDDIT_BASE}${path}?${params}`;
    const body = await this.getJson<{
      data?: { children?: Array<{ kind: string; data: unknown }> };
    }>(url);
    return extractPosts(body);
  }

  private async getJson<T>(url: string): Promise<T | null> {
    let lastError: Error | null = null;
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const res = await this.fetchImpl(url, {
          headers: {
            Accept: "application/json",
            "User-Agent": this.userAgent,
          },
        });
        if (res.status === 429 || res.status >= 500) {
          if (attempt < this.maxRetries) {
            await sleep(exponentialBackoff(attempt));
            continue;
          }
          throw new RedditApiError(`Reddit ${url} → ${res.status} after ${attempt + 1} attempts`, res.status);
        }
        if (res.status === 404) return null;
        if (!res.ok) throw new RedditApiError(`Reddit ${url} → ${res.status}`, res.status);
        const text = await res.text();
        if (!text) return null;
        return JSON.parse(text) as T;
      } catch (err) {
        lastError = err as Error;
        if (err instanceof RedditApiError && err.status !== undefined && err.status < 500 && err.status !== 429) {
          throw err;
        }
        if (attempt >= this.maxRetries) throw lastError;
        await sleep(exponentialBackoff(attempt));
      }
    }
    throw lastError ?? new Error("Unreachable retry loop");
  }
}

// ---------- Parsing helpers ----------

function extractPosts(listing: unknown): RedditPostRaw[] {
  const children = (listing as { data?: { children?: Array<{ kind: string; data: unknown }> } })?.data?.children ?? [];
  const out: RedditPostRaw[] = [];
  for (const child of children) {
    if (child.kind !== "t3") continue;
    const parsed = RedditPostRawSchema.safeParse(child.data);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

function extractComments(listing: unknown): RedditCommentRaw[] {
  const children = (listing as { data?: { children?: Array<{ kind: string; data: unknown }> } })?.data?.children ?? [];
  const out: RedditCommentRaw[] = [];
  for (const child of children) {
    if (child.kind !== "t1") continue;
    const parsed = RedditCommentRawSchema.safeParse(child.data);
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

// ---------- Transforms ----------

export function transformPost(raw: RedditPostRaw): PostOutput {
  const out: PostOutput = {
    id: raw.id,
    posted_at: raw.created_utc ? new Date(raw.created_utc * 1000).toISOString() : new Date(0).toISOString(),
  };
  if (raw.subreddit !== undefined) out.subreddit = raw.subreddit;
  if (raw.author !== undefined) out.author = raw.author;
  if (raw.title !== undefined) out.title = raw.title;
  if (raw.selftext !== undefined && raw.selftext !== "") out.text = raw.selftext;
  if (raw.url !== undefined) out.url = raw.url;
  if (raw.permalink !== undefined) out.permalink = `https://www.reddit.com${raw.permalink}`;
  if (raw.score !== undefined) out.score = raw.score;
  if (raw.upvote_ratio !== undefined) out.upvote_ratio = raw.upvote_ratio;
  if (raw.num_comments !== undefined) out.comment_count = raw.num_comments;
  if (raw.link_flair_text) out.flair = raw.link_flair_text;
  if (raw.domain !== undefined) out.domain = raw.domain;
  if (raw.is_self !== undefined) out.is_self = raw.is_self;
  if (raw.is_video !== undefined) out.is_video = raw.is_video;
  if (raw.over_18 !== undefined) out.is_nsfw = raw.over_18;
  if (raw.stickied !== undefined) out.is_stickied = raw.stickied;
  if (raw.locked !== undefined) out.is_locked = raw.locked;
  return out;
}

export function transformComment(
  raw: RedditCommentRaw,
  depth: number,
  maxDepth: number,
  maxPerLevel: number,
): CommentOutput {
  const out: CommentOutput = {
    id: raw.id,
    posted_at: raw.created_utc ? new Date(raw.created_utc * 1000).toISOString() : new Date(0).toISOString(),
  };
  if (raw.author !== undefined) out.author = raw.author;
  if (raw.body !== undefined) out.text = raw.body;
  if (raw.score !== undefined) out.score = raw.score;
  if (raw.permalink !== undefined) out.permalink = `https://www.reddit.com${raw.permalink}`;
  if (raw.depth !== undefined) out.depth = raw.depth;

  if (depth < maxDepth && raw.replies && typeof raw.replies === "object") {
    const replies = extractComments(raw.replies);
    if (replies.length > 0) {
      out.replies = replies
        .slice(0, maxPerLevel)
        .map((r) => transformComment(r, depth + 1, maxDepth, maxPerLevel));
    }
  }
  return out;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function exponentialBackoff(attempt: number): number {
  return Math.min(8000, 500 * 2 ** attempt) + Math.floor(Math.random() * 250);
}
