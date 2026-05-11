import { z } from "zod";

export const ToolNameSchema = z.enum([
  "subreddit_posts",
  "post_details",
  "user_profile",
  "search",
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

export const InputSchema = z
  .object({
    tool: ToolNameSchema,
    args: z.record(z.unknown()).default({}),
  })
  .strict();
export type Input = z.infer<typeof InputSchema>;

const SortFeed = z.enum(["hot", "new", "top", "rising", "controversial"]);
const TimeFilter = z.enum(["hour", "day", "week", "month", "year", "all"]);
const SortSearch = z.enum(["relevance", "hot", "top", "new", "comments"]);

export const SubredditPostsArgsSchema = z.object({
  subreddit: z.string().min(1).regex(/^[A-Za-z0-9_]{1,21}$/),
  sort: SortFeed.default("hot"),
  time_filter: TimeFilter.default("day"),
  limit: z.number().int().min(1).max(100).default(25),
});
export type SubredditPostsArgs = z.infer<typeof SubredditPostsArgsSchema>;

export const PostDetailsArgsSchema = z.object({
  post_id: z.string().min(1),
  subreddit: z.string().min(1).optional(),
  with_comments: z.boolean().default(false),
  max_comment_depth: z.number().int().min(0).max(10).default(3),
  max_comments_per_level: z.number().int().min(1).max(200).default(50),
});
export type PostDetailsArgs = z.infer<typeof PostDetailsArgsSchema>;

export const UserProfileArgsSchema = z.object({
  username: z.string().min(1).regex(/^[A-Za-z0-9_-]{1,20}$/),
  kind: z.enum(["overview", "submitted", "comments"]).default("overview"),
  sort: z.enum(["new", "hot", "top", "controversial"]).default("new"),
  limit: z.number().int().min(1).max(100).default(25),
});
export type UserProfileArgs = z.infer<typeof UserProfileArgsSchema>;

export const SearchArgsSchema = z.object({
  query: z.string().min(1),
  subreddit: z.string().min(1).optional(),
  sort: SortSearch.default("relevance"),
  time_filter: TimeFilter.default("all"),
  limit: z.number().int().min(1).max(100).default(25),
});
export type SearchArgs = z.infer<typeof SearchArgsSchema>;

// ---------- Reddit raw response shapes ----------

export const RedditPostRawSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  subreddit: z.string().optional(),
  author: z.string().optional(),
  title: z.string().optional(),
  selftext: z.string().optional(),
  url: z.string().optional(),
  permalink: z.string().optional(),
  created_utc: z.number().optional(),
  score: z.number().optional(),
  ups: z.number().optional(),
  num_comments: z.number().optional(),
  over_18: z.boolean().optional(),
  spoiler: z.boolean().optional(),
  stickied: z.boolean().optional(),
  locked: z.boolean().optional(),
  is_video: z.boolean().optional(),
  is_self: z.boolean().optional(),
  link_flair_text: z.string().nullable().optional(),
  domain: z.string().optional(),
  upvote_ratio: z.number().optional(),
});
export type RedditPostRaw = z.infer<typeof RedditPostRawSchema>;

export const RedditCommentRawSchema = z.object({
  id: z.string(),
  author: z.string().optional(),
  body: z.string().optional(),
  created_utc: z.number().optional(),
  score: z.number().optional(),
  parent_id: z.string().optional(),
  link_id: z.string().optional(),
  permalink: z.string().optional(),
  depth: z.number().optional(),
  stickied: z.boolean().optional(),
  replies: z.unknown().optional(),
});
export type RedditCommentRaw = z.infer<typeof RedditCommentRawSchema>;

// ---------- Public outputs ----------

export const PostOutputSchema = z.object({
  id: z.string(),
  subreddit: z.string().optional(),
  author: z.string().optional(),
  title: z.string().optional(),
  text: z.string().optional(),
  url: z.string().optional(),
  permalink: z.string().optional(),
  posted_at: z.string(),
  score: z.number().optional(),
  upvote_ratio: z.number().optional(),
  comment_count: z.number().optional(),
  flair: z.string().optional(),
  domain: z.string().optional(),
  is_self: z.boolean().optional(),
  is_video: z.boolean().optional(),
  is_nsfw: z.boolean().optional(),
  is_stickied: z.boolean().optional(),
  is_locked: z.boolean().optional(),
  comments: z.array(z.lazy((): z.ZodTypeAny => CommentOutputSchema)).optional(),
});
export type PostOutput = z.infer<typeof PostOutputSchema>;

export const CommentOutputSchema: z.ZodType<{
  id: string;
  author?: string;
  text?: string;
  posted_at: string;
  score?: number;
  permalink?: string;
  depth?: number;
  replies?: unknown[];
}> = z.object({
  id: z.string(),
  author: z.string().optional(),
  text: z.string().optional(),
  posted_at: z.string(),
  score: z.number().optional(),
  permalink: z.string().optional(),
  depth: z.number().optional(),
  replies: z.array(z.lazy((): z.ZodTypeAny => CommentOutputSchema)).optional(),
});
export type CommentOutput = z.infer<typeof CommentOutputSchema>;

export const UserOutputSchema = z.object({
  username: z.string(),
  kind: z.enum(["overview", "submitted", "comments"]),
  returned: z.number().int(),
  posts: z.array(PostOutputSchema).optional(),
  comments: z.array(CommentOutputSchema).optional(),
});
export type UserOutput = z.infer<typeof UserOutputSchema>;
