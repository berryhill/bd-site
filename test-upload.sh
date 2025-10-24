#!/bin/bash

# Test script for uploading a markdown post via API

curl -X POST http://localhost:4321/api/posts \
  -H "Content-Type: application/json" \
  -d '{
    "title": "My First API-Created Post",
    "description": "This post was created via the API endpoint",
    "tags": ["api", "test", "automation"],
    "featured": false,
    "draft": false,
    "content": "# Hello from the API!\n\nThis is a test post created through the POST endpoint.\n\n## Features\n\n- Automatic slug generation\n- Frontmatter creation\n- File writing to blog directory\n\n## Code Example\n\n```javascript\nconst greeting = \"Hello, World!\";\nconsole.log(greeting);\n```\n\nPretty cool, right?"
  }'
