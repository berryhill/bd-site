import {
  type SocialPreviewImageReachabilityIssue,
  type SocialPreviewIssue,
  extractSocialPreviewMetadata,
  validateSocialPreviewMetadata,
} from "./socialPreviewMeta.ts";

const TWITTERBOT_USER_AGENT = "Twitterbot/1.0";
const TWITTERBOT_ROBOTS_USER_AGENT = "Twitterbot";
const DEFAULT_ATTEMPTS = 5;
const DEFAULT_INTERVAL_MS = 500;
const EXPECTED_PNG_WIDTH = 1200;
const EXPECTED_PNG_HEIGHT = 630;

export interface SocialPreviewReadinessIssue {
  stage: "html" | "metadata" | "image" | "robots";
  field?: string;
  url: string;
  reason: string;
}

export interface SocialPreviewRobotsDirective {
  field: "postUrl" | "ogImage";
  url: string;
  path: string;
  allowed: boolean;
  group: string;
  directive: string;
}

export interface SocialPreviewRobotsEvidence {
  robotsUrl: string;
  userAgent: string;
  checkedPaths: SocialPreviewRobotsDirective[];
}

export interface SocialPreviewReadinessResult {
  ready: boolean;
  postUrl: string;
  attempts: number;
  metadata?: ReturnType<typeof extractSocialPreviewMetadata>;
  imageUrl?: string;
  imageBytes?: number;
  imageDimensions?: { width: number; height: number };
  robots?: SocialPreviewRobotsEvidence[];
  issues: SocialPreviewReadinessIssue[];
}

export interface SocialPreviewReadinessOptions {
  attempts?: number;
  intervalMs?: number;
  fetcher?: typeof fetch;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function toIssueFromMetadata(
  issue: SocialPreviewIssue,
  postUrl: string
): SocialPreviewReadinessIssue {
  return {
    stage: "metadata",
    field: issue.field,
    url: postUrl,
    reason: issue.reason,
  };
}

function toIssueFromImage(
  issue: SocialPreviewImageReachabilityIssue
): SocialPreviewReadinessIssue {
  return {
    stage: "image",
    field: issue.field,
    url: issue.url,
    reason: issue.reason,
  };
}

function readPngDimensions(bytes: Uint8Array) {
  const pngSignature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (bytes.byteLength < 24) {
    return {
      valid: false as const,
      reason: "Image body is too small to be a valid PNG",
    };
  }

  for (const [index, expected] of pngSignature.entries()) {
    if (bytes[index] !== expected) {
      return { valid: false as const, reason: "Image body is not a valid PNG" };
    }
  }

  const chunkType = String.fromCharCode(...bytes.slice(12, 16));
  if (chunkType !== "IHDR") {
    return { valid: false as const, reason: "PNG is missing an IHDR chunk" };
  }

  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return {
    valid: true as const,
    width: view.getUint32(16),
    height: view.getUint32(20),
  };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function parseRobotsGroups(robotsTxt: string) {
  const groups: Array<{
    agents: string[];
    rules: Array<{ directive: string; path: string; line: string }>;
  }> = [];
  let currentAgents: string[] = [];
  let currentRules: Array<{ directive: string; path: string; line: string }> =
    [];

  const flushGroup = () => {
    if (currentAgents.length === 0) return;
    groups.push({ agents: currentAgents, rules: currentRules });
    currentAgents = [];
    currentRules = [];
  };

  for (const rawLine of robotsTxt.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*/, "").trim();
    if (!line) continue;
    const separatorIndex = line.indexOf(":");
    if (separatorIndex === -1) continue;

    const key = line.slice(0, separatorIndex).trim().toLowerCase();
    const value = line.slice(separatorIndex + 1).trim();

    if (key === "user-agent") {
      if (currentRules.length > 0) flushGroup();
      currentAgents.push(value);
      continue;
    }

    if (key === "allow" || key === "disallow") {
      if (currentAgents.length === 0) continue;
      currentRules.push({ directive: key, path: value, line });
    }
  }

  flushGroup();
  return groups;
}

function robotsPatternMatches(rulePath: string, targetPath: string) {
  if (!rulePath) return false;
  const anchored = rulePath.endsWith("$");
  const body = anchored ? rulePath.slice(0, -1) : rulePath;
  const pattern = escapeRegExp(body).replace(/\\\*/g, ".*");
  const regex = new RegExp(`^${pattern}${anchored ? "$" : ""}`);
  return regex.test(targetPath);
}

function getRobotsDecision(
  robotsTxt: string,
  userAgent: string,
  targetUrl: string
) {
  const groups = parseRobotsGroups(robotsTxt);
  const targetAgent = userAgent.toLowerCase();
  const exactGroup = groups.find(group =>
    group.agents.some(agent => agent.toLowerCase() === targetAgent)
  );
  const wildcardGroup = groups.find(group =>
    group.agents.some(agent => agent === "*")
  );
  const group = exactGroup ?? wildcardGroup;
  const url = new URL(targetUrl);
  const path = `${url.pathname}${url.search}`;

  if (!group) {
    return {
      path,
      allowed: true,
      group: "none",
      directive: "no matching robots group",
    };
  }

  const matchingRules = group.rules
    .filter(rule => robotsPatternMatches(rule.path, path))
    .sort((left, right) => {
      const lengthDiff = right.path.length - left.path.length;
      if (lengthDiff !== 0) return lengthDiff;
      if (left.directive === right.directive) return 0;
      return left.directive === "allow" ? -1 : 1;
    });
  const winningRule = matchingRules[0];

  if (!winningRule) {
    return {
      path,
      allowed: true,
      group: group.agents.join(", "),
      directive: "no matching directive",
    };
  }

  return {
    path,
    allowed: winningRule.directive === "allow",
    group: group.agents.join(", "),
    directive: winningRule.line,
  };
}

async function validateTwitterbotRobotsPolicy(
  postUrl: string,
  imageUrl: string,
  fetcher: typeof fetch
): Promise<{
  robots: SocialPreviewRobotsEvidence[];
  issues: SocialPreviewReadinessIssue[];
}> {
  const targets = [
    { field: "postUrl" as const, url: postUrl },
    { field: "ogImage" as const, url: imageUrl },
  ];
  const robotsByOrigin = new Map<string, typeof targets>();

  for (const target of targets) {
    const origin = new URL(target.url).origin;
    robotsByOrigin.set(origin, [...(robotsByOrigin.get(origin) ?? []), target]);
  }

  const robots: SocialPreviewRobotsEvidence[] = [];
  const issues: SocialPreviewReadinessIssue[] = [];

  for (const [origin, originTargets] of robotsByOrigin) {
    const robotsUrl = new URL("/robots.txt", origin).href;

    try {
      const response = await fetcher(robotsUrl, {
        headers: { "User-Agent": TWITTERBOT_USER_AGENT },
        redirect: "follow",
      });
      const robotsTxt = await response.text();

      if (!response.ok) {
        issues.push({
          stage: "robots",
          url: robotsUrl,
          reason:
            `robots.txt returned ${response.status} ${response.statusText}`.trim(),
        });
        robots.push({
          robotsUrl,
          userAgent: TWITTERBOT_ROBOTS_USER_AGENT,
          checkedPaths: [],
        });
        continue;
      }

      const checkedPaths = originTargets.map(target => {
        const decision = getRobotsDecision(
          robotsTxt,
          TWITTERBOT_ROBOTS_USER_AGENT,
          target.url
        );
        return { field: target.field, url: target.url, ...decision };
      });

      for (const checkedPath of checkedPaths) {
        if (!checkedPath.allowed) {
          issues.push({
            stage: "robots",
            field: checkedPath.field,
            url: checkedPath.url,
            reason: `robots.txt disallows ${TWITTERBOT_ROBOTS_USER_AGENT} from ${checkedPath.path} via ${checkedPath.directive} in User-agent: ${checkedPath.group}`,
          });
        }
      }

      robots.push({
        robotsUrl,
        userAgent: TWITTERBOT_ROBOTS_USER_AGENT,
        checkedPaths,
      });
    } catch (error) {
      issues.push({
        stage: "robots",
        url: robotsUrl,
        reason: `robots.txt fetch failed: ${error instanceof Error ? error.message : String(error)}`,
      });
      robots.push({
        robotsUrl,
        userAgent: TWITTERBOT_ROBOTS_USER_AGENT,
        checkedPaths: [],
      });
    }
  }

  return { robots, issues };
}

async function validateAdvertisedImage(
  imageUrl: string,
  fetcher: typeof fetch
): Promise<{
  issues: SocialPreviewReadinessIssue[];
  imageBytes?: number;
  imageDimensions?: { width: number; height: number };
}> {
  try {
    const response = await fetcher(imageUrl, {
      headers: { "User-Agent": TWITTERBOT_USER_AGENT },
      redirect: "follow",
    });
    const contentType = response.headers.get("content-type") ?? "";
    const bytes = new Uint8Array(await response.arrayBuffer());

    if (!response.ok) {
      return {
        issues: [
          toIssueFromImage({
            field: "ogImage",
            url: imageUrl,
            reason:
              `Image URL returned ${response.status} ${response.statusText}`.trim(),
          }),
        ],
      };
    }

    if (!contentType.toLowerCase().startsWith("image/png")) {
      return {
        issues: [
          toIssueFromImage({
            field: "ogImage",
            url: imageUrl,
            reason: `Image URL returned non-PNG content type ${contentType || "unknown"}`,
          }),
        ],
      };
    }

    const dimensions = readPngDimensions(bytes);
    if (!dimensions.valid) {
      return {
        imageBytes: bytes.byteLength,
        issues: [
          toIssueFromImage({
            field: "ogImage",
            url: imageUrl,
            reason: dimensions.reason,
          }),
        ],
      };
    }

    if (
      dimensions.width !== EXPECTED_PNG_WIDTH ||
      dimensions.height !== EXPECTED_PNG_HEIGHT
    ) {
      return {
        imageBytes: bytes.byteLength,
        imageDimensions: { width: dimensions.width, height: dimensions.height },
        issues: [
          toIssueFromImage({
            field: "ogImage",
            url: imageUrl,
            reason: `Image dimensions were ${dimensions.width}×${dimensions.height}; expected ${EXPECTED_PNG_WIDTH}×${EXPECTED_PNG_HEIGHT}`,
          }),
        ],
      };
    }

    return {
      imageBytes: bytes.byteLength,
      imageDimensions: { width: dimensions.width, height: dimensions.height },
      issues: [],
    };
  } catch (error) {
    return {
      issues: [
        toIssueFromImage({
          field: "ogImage",
          url: imageUrl,
          reason: `Image URL fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        }),
      ],
    };
  }
}

async function checkSocialPreviewReadinessOnce(
  postUrl: string,
  fetcher: typeof fetch
): Promise<Omit<SocialPreviewReadinessResult, "attempts">> {
  try {
    const response = await fetcher(postUrl, {
      headers: { "User-Agent": TWITTERBOT_USER_AGENT },
      redirect: "follow",
    });
    const html = await response.text();

    if (!response.ok) {
      return {
        ready: false,
        postUrl,
        issues: [
          {
            stage: "html",
            url: postUrl,
            reason:
              `Post URL returned ${response.status} ${response.statusText}`.trim(),
          },
        ],
      };
    }

    const metadataResult = validateSocialPreviewMetadata(html);
    const metadata = metadataResult.metadata;
    const issues = metadataResult.issues.map(issue =>
      toIssueFromMetadata(issue, postUrl)
    );

    if (metadata.ogImage && metadata.twitterImage) {
      try {
        const ogImageUrl = new URL(metadata.ogImage);
        const twitterImageUrl = new URL(metadata.twitterImage);
        if (ogImageUrl.href !== metadata.ogImage) {
          issues.push({
            stage: "metadata",
            field: "ogImage",
            url: postUrl,
            reason: "og:image must be an absolute URL",
          });
        }
        if (twitterImageUrl.href !== metadata.twitterImage) {
          issues.push({
            stage: "metadata",
            field: "twitterImage",
            url: postUrl,
            reason: "twitter:image must be an absolute URL",
          });
        }
      } catch {
        issues.push({
          stage: "metadata",
          field: "ogImage",
          url: postUrl,
          reason: "Social image URLs must be absolute URLs",
        });
      }
    }

    if (metadata.twitterCard !== "summary_large_image") {
      issues.push({
        stage: "metadata",
        field: "twitterCard",
        url: postUrl,
        reason: "twitter:card must be summary_large_image",
      });
    }

    if (!metadata.ogImage || !metadata.twitterImage) {
      return { ready: false, postUrl, metadata, issues };
    }

    if (metadata.ogImage !== metadata.twitterImage) {
      return { ready: false, postUrl, metadata, issues };
    }

    const imageResult = await validateAdvertisedImage(
      metadata.ogImage,
      fetcher
    );
    const robotsResult = await validateTwitterbotRobotsPolicy(
      postUrl,
      metadata.ogImage,
      fetcher
    );
    const allIssues = [
      ...issues,
      ...imageResult.issues,
      ...robotsResult.issues,
    ];

    return {
      ready: allIssues.length === 0,
      postUrl,
      metadata,
      imageUrl: metadata.ogImage,
      imageBytes: imageResult.imageBytes,
      imageDimensions: imageResult.imageDimensions,
      robots: robotsResult.robots,
      issues: allIssues,
    };
  } catch (error) {
    return {
      ready: false,
      postUrl,
      issues: [
        {
          stage: "html",
          url: postUrl,
          reason: `Post URL fetch failed: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
    };
  }
}

export async function waitForSocialPreviewReadiness(
  postUrl: string,
  options: SocialPreviewReadinessOptions = {}
): Promise<SocialPreviewReadinessResult> {
  const attempts = Math.max(1, options.attempts ?? DEFAULT_ATTEMPTS);
  const intervalMs = Math.max(0, options.intervalMs ?? DEFAULT_INTERVAL_MS);
  const fetcher = options.fetcher ?? fetch;
  let lastResult: Omit<SocialPreviewReadinessResult, "attempts"> | undefined;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    lastResult = await checkSocialPreviewReadinessOnce(postUrl, fetcher);
    if (lastResult.ready) return { ...lastResult, attempts: attempt };
    if (attempt < attempts && intervalMs > 0) await wait(intervalMs);
  }

  return {
    ready: false,
    postUrl,
    attempts,
    metadata: lastResult?.metadata,
    imageUrl: lastResult?.imageUrl,
    imageBytes: lastResult?.imageBytes,
    imageDimensions: lastResult?.imageDimensions,
    robots: lastResult?.robots,
    issues: lastResult?.issues ?? [
      {
        stage: "html",
        url: postUrl,
        reason:
          "Social preview readiness timed out without a verification result",
      },
    ],
  };
}
