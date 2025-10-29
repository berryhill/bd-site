import type { APIRoute } from "astro";

const getRobotsTxt = (sitemapURL: URL) => `
# Allow all crawlers by default
User-agent: *
Allow: /

# Explicitly allow LLM/AI crawlers for training and citations
# OpenAI
User-agent: GPTBot
Allow: /

User-agent: OAI-SearchBot
Allow: /

User-agent: ChatGPT-User
Allow: /

# Anthropic (Claude)
User-agent: ClaudeBot
Allow: /

User-agent: anthropic-ai
Allow: /

User-agent: claude-web
Allow: /

User-agent: Claude-User
Allow: /

# Google AI
User-agent: Google-Extended
Allow: /

User-agent: GoogleOther
Allow: /

# Perplexity
User-agent: PerplexityBot
Allow: /

# Common Crawl
User-agent: CCBot
Allow: /

# Meta AI
User-agent: Meta-ExternalAgent
Allow: /

User-agent: Meta-ExternalFetcher
Allow: /

User-agent: FacebookBot
Allow: /

# Apple AI
User-agent: Applebot-Extended
Allow: /

# Amazon AI
User-agent: Amazonbot
Allow: /

# ByteDance/TikTok
User-agent: Bytespider
Allow: /

# Other AI/ML Crawlers
User-agent: cohere-ai
Allow: /

User-agent: YouBot
Allow: /

User-agent: Diffbot
Allow: /

User-agent: ImagesiftBot
Allow: /

User-agent: Omgili
Allow: /

User-agent: Omgilibot
Allow: /

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const sitemapURL = new URL("sitemap-index.xml", site);
  return new Response(getRobotsTxt(sitemapURL));
};
