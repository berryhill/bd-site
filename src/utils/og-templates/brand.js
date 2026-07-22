export const OG_BRAND = {
  background: "#081018",
  foreground: "#e8f1f2",
  foregroundMuted: "#7f9297",
  foregroundSecondary: "#b7c7c9",
  accent: "#76f5a4",
  accentSecondary: "#f6b76b",
  border: "#22333c",
  panel: "#101b24",
  muted: "#1b2a33",
  highlight: "#152d24",
  fontFamily: "IBM Plex Mono",
};

const OLD_OFF_BRAND_COLORS = new Set(["#1c1917", "#ff8c42", "#a0153e"]);

export function assertBrandColor(value) {
  if (OLD_OFF_BRAND_COLORS.has(value)) {
    throw new Error(`OG template is using an old off-brand color: ${value}`);
  }

  return value;
}

export function truncatePreviewText(value, maxLength) {
  if (typeof value !== "string") {
    throw new TypeError("Preview text must be a string");
  }

  if (!Number.isInteger(maxLength) || maxLength < 8) {
    throw new RangeError(
      "Preview text maxLength must be an integer of at least 8"
    );
  }

  if (value.length <= maxLength) return value;

  return `${value.slice(0, maxLength - 1).trimEnd()}…`;
}

function div(style, children) {
  return {
    type: "div",
    props: {
      style: {
        display: "flex",
        ...style,
      },
      children,
    },
  };
}

function span(style, children) {
  return {
    type: "span",
    props: {
      style,
      children,
    },
  };
}

function brandMark(size = 48) {
  return div(
    {
      display: "flex",
      alignItems: "baseline",
      fontFamily: OG_BRAND.fontFamily,
      letterSpacing: "-0.04em",
    },
    [
      span(
        {
          fontSize: size,
          fontWeight: 700,
          color: assertBrandColor(OG_BRAND.foreground),
        },
        "berryhill"
      ),
      span(
        {
          fontSize: size,
          fontWeight: 700,
          color: assertBrandColor(OG_BRAND.accent),
        },
        "."
      ),
      span(
        {
          fontSize: size,
          fontWeight: 700,
          color: assertBrandColor(OG_BRAND.accentSecondary),
        },
        "dev"
      ),
    ]
  );
}

function statusPill(label, value, color = OG_BRAND.accent) {
  return div(
    {
      display: "flex",
      alignItems: "center",
      gap: 10,
      border: `1px solid ${OG_BRAND.border}`,
      borderRadius: 999,
      padding: "10px 16px",
      background: OG_BRAND.muted,
      fontFamily: OG_BRAND.fontFamily,
      fontSize: 20,
      lineHeight: 1,
    },
    [
      span({ color: OG_BRAND.foregroundMuted, fontWeight: 400 }, label),
      span({ color, fontWeight: 700 }, value),
    ]
  );
}

function shellLine(command, output, accent = OG_BRAND.accent) {
  return div(
    {
      display: "flex",
      flexDirection: "column",
      gap: 8,
      fontFamily: OG_BRAND.fontFamily,
      fontSize: 22,
      lineHeight: 1.28,
    },
    [
      div({ display: "flex", gap: 10 }, [
        span({ color: accent, fontWeight: 700 }, "$"),
        span({ color: OG_BRAND.foreground, fontWeight: 700 }, command),
      ]),
      span({ color: OG_BRAND.foregroundSecondary, fontWeight: 400 }, output),
    ]
  );
}

function backgroundDecorations() {
  return [
    div(
      {
        position: "absolute",
        inset: 0,
        background:
          "linear-gradient(135deg, rgba(118,245,164,0.12) 0%, rgba(8,16,24,0) 34%), linear-gradient(45deg, rgba(246,183,107,0.10) 0%, rgba(8,16,24,0) 28%)",
      },
      []
    ),
    div(
      {
        position: "absolute",
        top: 50,
        right: 72,
        width: 340,
        height: 340,
        border: `1px solid ${OG_BRAND.border}`,
        borderRadius: 32,
        background: "rgba(16, 27, 36, 0.48)",
      },
      []
    ),
    div(
      {
        position: "absolute",
        bottom: 58,
        left: 62,
        width: 520,
        height: 1,
        background: OG_BRAND.border,
      },
      []
    ),
    div(
      {
        position: "absolute",
        bottom: 58,
        left: 62,
        width: 156,
        height: 3,
        background: OG_BRAND.accent,
      },
      []
    ),
  ];
}

export function buildSiteOgTree(site) {
  if (!site || typeof site !== "object") {
    throw new TypeError("Site config is required to build the site OG preview");
  }

  if (typeof site.desc !== "string" || !site.desc.trim()) {
    throw new TypeError(
      "Site description is required to build the site OG preview"
    );
  }

  const positioning = site.socialPreview?.title;
  if (typeof positioning !== "string" || !positioning.trim()) {
    throw new TypeError(
      "Site social preview title is required to build the site OG preview"
    );
  }

  return {
    type: "div",
    props: {
      style: {
        position: "relative",
        overflow: "hidden",
        background: assertBrandColor(OG_BRAND.background),
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "72px",
        fontFamily: OG_BRAND.fontFamily,
      },
      children: [
        ...backgroundDecorations(),
        div(
          {
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            gap: 34,
            width: 900,
            border: `1px solid ${OG_BRAND.border}`,
            borderRadius: 28,
            background: "rgba(16, 27, 36, 0.92)",
            padding: "54px 58px",
          },
          [
            brandMark(64),
            div(
              {
                display: "flex",
                fontSize: 54,
                lineHeight: 1.08,
                color: OG_BRAND.foreground,
                fontWeight: 700,
                letterSpacing: "-0.02em",
              },
              truncatePreviewText(positioning, 72)
            ),
            span(
              {
                color: OG_BRAND.foregroundMuted,
                fontSize: 24,
                lineHeight: 1.25,
                fontWeight: 500,
              },
              "operator notes · shipped systems · review gates"
            ),
          ]
        ),
      ],
    },
  };
}

export function buildPostOgTree(post, site) {
  if (!post || !post.data || typeof post.data !== "object") {
    throw new TypeError("Post data is required to build a post OG preview");
  }

  if (typeof post.data.title !== "string" || !post.data.title.trim()) {
    throw new TypeError("Post title is required to build a post OG preview");
  }

  const author =
    typeof post.data.author === "string" && post.data.author.trim()
      ? post.data.author
      : site.author;

  return {
    type: "div",
    props: {
      style: {
        position: "relative",
        overflow: "hidden",
        background: assertBrandColor(OG_BRAND.background),
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "56px 68px",
        fontFamily: OG_BRAND.fontFamily,
      },
      children: [
        ...backgroundDecorations(),
        div(
          {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          },
          [brandMark(44), statusPill("post", "field note", OG_BRAND.accent)]
        ),
        div(
          {
            display: "flex",
            flexDirection: "column",
            gap: 24,
            width: 880,
            borderLeft: `4px solid ${OG_BRAND.accent}`,
            paddingLeft: 32,
          },
          [
            div(
              {
                display: "flex",
                fontSize: 70,
                lineHeight: 1.06,
                color: OG_BRAND.foreground,
                fontWeight: 700,
                letterSpacing: "-0.045em",
              },
              truncatePreviewText(post.data.title, 96)
            ),
            div(
              {
                display: "flex",
                gap: 14,
                alignItems: "center",
                fontFamily: OG_BRAND.fontFamily,
                fontSize: 24,
                color: OG_BRAND.foregroundSecondary,
              },
              [
                span(
                  { color: OG_BRAND.accentSecondary, fontWeight: 700 },
                  "by"
                ),
                span({ color: OG_BRAND.foreground, fontWeight: 700 }, author),
                span({ color: OG_BRAND.foregroundMuted }, "//"),
                span({ color: OG_BRAND.foregroundMuted }, "operator notes"),
              ]
            ),
          ]
        ),
        div(
          {
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
            fontFamily: OG_BRAND.fontFamily,
            fontSize: 22,
          },
          [
            shellLine(
              "review --gate external-link-preview",
              "terminal brand system active",
              OG_BRAND.accentSecondary
            ),
            span({ color: OG_BRAND.foregroundMuted }, site.website),
          ]
        ),
      ],
    },
  };
}
