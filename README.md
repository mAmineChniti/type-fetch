# type-fetch

A lightweight, type-safe HTTP client library for making API requests in TypeScript. Built with simplicity and developer experience in mind.

## Features

- 🚀 Type-safe API requests with full TypeScript support
- 🔄 Built-in retry mechanism with configurable options
- 💾 Response caching for GET requests
- 📦 Automatic content-type handling
- 🔍 Debug logging for easier development

## Installation

```bash
npm install @thatguyjamal/type-fetch
# or
pnpm add @thatguyjamal/type-fetch
```

## Usage

```typescript
import { TFetchClient } from "@thatguyjamal/type-fetch";

// Create a client instance
const client = new TFetchClient({
  debug: true,
  retry: { count: 3, delay: 1000 },
});

// Define your response type
type Post = {
  id: number;
  title: string;
  body: string;
  userId: number;
};

// Make a type-safe GET request
const { data, error } = await client.get<Post>(
  "https://api.example.com/posts/1"
);

// Make a POST request with typed data
const { data, error } = await client.post<Post>(
  "https://api.example.com/posts",
  {
    type: "json",
    data: {
      title: "New Post",
      body: "Content",
      userId: 1,
    },
  }
);
```

## License

[MIT](./LICENSE)

## API documentation

The typescript type outputs can be found [here](./dist/index.d.ts).
