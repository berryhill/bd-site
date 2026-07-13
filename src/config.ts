export const SITE = {
  website: "https://berryhill.dev/", // replace this with your deployed domain
  author: "Berryhill",
  profile: "https://berryhill.dev/",
  desc: "Field notes on AI-native discovery systems, agent governance, provenance, review gates, protocol boundaries, and the operator work required to turn agent output into shipped proof.",
  title: "berryhill.dev",
  ogImage: "",
  lightAndDarkMode: false,
  postPerIndex: 6,
  postPerPage: 6,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: false,
  showBackButton: true, // show back button in post detail
  editPost: {
    // Keep the public brand surface focused on readers, not upstream theme maintenance.
    enabled: false,
    text: "Suggest a correction",
    url: "https://github.com/berryhill/bd-site/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Bangkok", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
  calendly: "https://calendly.com/matt-berryhill/30min", // Calendly scheduling link
} as const;
