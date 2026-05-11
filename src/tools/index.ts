import {
  PostDetailsArgsSchema,
  SearchArgsSchema,
  SubredditPostsArgsSchema,
  UserProfileArgsSchema,
  type ToolName,
} from "../types.js";
import { RedditClient, transformComment, transformPost } from "../reddit-client.js";

export async function runTool(
  tool: ToolName,
  args: unknown,
  client: RedditClient,
): Promise<unknown> {
  switch (tool) {
    case "subreddit_posts":
      return runSubredditPosts(args, client);
    case "post_details":
      return runPostDetails(args, client);
    case "user_profile":
      return runUserProfile(args, client);
    case "search":
      return runSearch(args, client);
  }
}

async function runSubredditPosts(rawArgs: unknown, client: RedditClient) {
  const args = SubredditPostsArgsSchema.parse(rawArgs);
  const raw = await client.subredditPosts(args.subreddit, args.sort, {
    limit: args.limit,
    time_filter: args.time_filter,
  });
  return {
    subreddit: args.subreddit,
    sort: args.sort,
    returned: raw.length,
    posts: raw.map(transformPost),
  };
}

async function runPostDetails(rawArgs: unknown, client: RedditClient) {
  const args = PostDetailsArgsSchema.parse(rawArgs);
  const { post, comments } = await client.postWithComments(args.post_id, args.subreddit);
  if (!post) return { post_id: args.post_id, not_found: true };
  const out = transformPost(post);
  if (args.with_comments && comments.length > 0) {
    out.comments = comments
      .slice(0, args.max_comments_per_level)
      .map((c) => transformComment(c, 1, args.max_comment_depth, args.max_comments_per_level));
  }
  return out;
}

async function runUserProfile(rawArgs: unknown, client: RedditClient) {
  const args = UserProfileArgsSchema.parse(rawArgs);
  const { posts, comments } = await client.userListing(
    args.username,
    args.kind,
    args.sort,
    { limit: args.limit },
  );
  const transformedPosts = posts.map(transformPost);
  const transformedComments = comments.map((c) =>
    transformComment(c, 1, 0, 0),
  );
  return {
    username: args.username,
    kind: args.kind,
    sort: args.sort,
    returned: transformedPosts.length + transformedComments.length,
    posts: transformedPosts,
    comments: transformedComments,
  };
}

async function runSearch(rawArgs: unknown, client: RedditClient) {
  const args = SearchArgsSchema.parse(rawArgs);
  const opts: Parameters<RedditClient["search"]>[1] = {
    sort: args.sort,
    time_filter: args.time_filter,
    limit: args.limit,
  };
  if (args.subreddit !== undefined) opts.subreddit = args.subreddit;
  const raw = await client.search(args.query, opts);
  return {
    query: args.query,
    subreddit: args.subreddit,
    returned: raw.length,
    posts: raw.map(transformPost),
  };
}
