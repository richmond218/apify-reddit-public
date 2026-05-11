export const SUBREDDIT_LISTING = {
  kind: "Listing",
  data: {
    children: [
      {
        kind: "t3",
        data: {
          id: "abc123",
          name: "t3_abc123",
          subreddit: "programming",
          author: "alice",
          title: "Why Rust is taking over",
          selftext: "",
          url: "https://example.com/rust",
          permalink: "/r/programming/comments/abc123/why_rust/",
          created_utc: 1700000000,
          score: 500,
          ups: 500,
          num_comments: 80,
          over_18: false,
          stickied: false,
          locked: false,
          is_video: false,
          is_self: false,
          link_flair_text: "discussion",
          domain: "example.com",
          upvote_ratio: 0.95,
        },
      },
      {
        kind: "t3",
        data: {
          id: "def456",
          subreddit: "programming",
          author: "bob",
          title: "Self post about TypeScript",
          selftext: "I've been using TypeScript for...",
          permalink: "/r/programming/comments/def456/typescript/",
          created_utc: 1700001000,
          score: 200,
          num_comments: 30,
          is_self: true,
          over_18: false,
        },
      },
    ],
    after: "t3_def456",
  },
};

export const POST_WITH_COMMENTS = [
  {
    kind: "Listing",
    data: {
      children: [
        {
          kind: "t3",
          data: {
            id: "post1",
            subreddit: "askreddit",
            author: "op_user",
            title: "What's your favorite editor?",
            selftext: "Curious.",
            permalink: "/r/askreddit/comments/post1/favorite_editor/",
            created_utc: 1700000000,
            score: 1000,
            num_comments: 250,
            is_self: true,
          },
        },
      ],
    },
  },
  {
    kind: "Listing",
    data: {
      children: [
        {
          kind: "t1",
          data: {
            id: "c1",
            author: "user1",
            body: "Neovim, always.",
            created_utc: 1700001000,
            score: 50,
            parent_id: "t3_post1",
            link_id: "t3_post1",
            permalink: "/r/askreddit/comments/post1/_/c1/",
            depth: 0,
            replies: {
              kind: "Listing",
              data: {
                children: [
                  {
                    kind: "t1",
                    data: {
                      id: "c2",
                      author: "user2",
                      body: "Same here.",
                      created_utc: 1700002000,
                      score: 20,
                      parent_id: "t1_c1",
                      link_id: "t3_post1",
                      depth: 1,
                      replies: "",
                    },
                  },
                ],
              },
            },
          },
        },
        {
          kind: "t1",
          data: {
            id: "c3",
            author: "user3",
            body: "VSCode for me.",
            created_utc: 1700003000,
            score: 30,
            parent_id: "t3_post1",
            link_id: "t3_post1",
            depth: 0,
            replies: "",
          },
        },
      ],
    },
  },
];

export const USER_OVERVIEW = {
  kind: "Listing",
  data: {
    children: [
      {
        kind: "t3",
        data: {
          id: "up1",
          subreddit: "programming",
          author: "pg",
          title: "Essay on hackers",
          permalink: "/r/programming/comments/up1/essay/",
          created_utc: 1700000000,
          score: 999,
          num_comments: 50,
          is_self: true,
        },
      },
      {
        kind: "t1",
        data: {
          id: "uc1",
          author: "pg",
          body: "Good point.",
          created_utc: 1700001000,
          score: 10,
          parent_id: "t3_up1",
          link_id: "t3_up1",
          depth: 0,
        },
      },
    ],
  },
};

export const SEARCH_LISTING = {
  kind: "Listing",
  data: {
    children: [
      {
        kind: "t3",
        data: {
          id: "s1",
          subreddit: "rust",
          author: "rustdev",
          title: "Rust 2.0 release notes",
          permalink: "/r/rust/comments/s1/rust_2/",
          created_utc: 1700000000,
          score: 2000,
          num_comments: 300,
          is_self: false,
          url: "https://blog.rust-lang.org/2.0",
        },
      },
    ],
  },
};
