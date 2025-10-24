// Test script for uploading a markdown post via API
// Run with: node test-upload.js

const testPost = {
  title: "My First API-Created Post",
  description: "This post was created via the API endpoint",
  tags: ["api", "test", "automation"],
  featured: false,
  draft: false,
  content: `# Hello from the API!

This is a test post created through the POST endpoint.

## Features

- Automatic slug generation
- Frontmatter creation
- File writing to blog directory

## Code Example

\`\`\`javascript
const greeting = "Hello, World!";
console.log(greeting);
\`\`\`

Pretty cool, right?`
};

async function uploadPost() {
  try {
    const response = await fetch('http://localhost:4321/api/posts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(testPost)
    });

    const result = await response.json();

    if (response.ok) {
      console.log('✅ Success!');
      console.log('Message:', result.message);
      console.log('Slug:', result.slug);
      console.log('Filename:', result.filename);
    } else {
      console.log('❌ Error:', result.error);
      if (result.details) {
        console.log('Details:', result.details);
      }
    }
  } catch (error) {
    console.error('❌ Request failed:', error.message);
  }
}

uploadPost();
