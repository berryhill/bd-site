export const SITE = {
  website: "https://berryhill.dev/", // replace this with your deployed domain
  author: "Berryhill",
  profile: "https://berryhill.dev/",
  desc: "A minimal, responsive and SEO-friendly blog.",
  title: "berryhill.dev",
  ogImage: "astropaper-og.jpg",
  lightAndDarkMode: false,
  postPerIndex: 6,
  postPerPage: 4,
  scheduledPostMargin: 15 * 60 * 1000, // 15 minutes
  showArchives: true,
  showBackButton: true, // show back button in post detail
  editPost: {
    enabled: true,
    text: "Edit page",
    url: "https://github.com/berryhilldev/bd-site/edit/main/",
  },
  dynamicOgImage: true,
  dir: "ltr", // "rtl" | "auto"
  lang: "en", // html lang code. Set this empty and default will be "en"
  timezone: "Asia/Bangkok", // Default global timezone (IANA format) https://en.wikipedia.org/wiki/List_of_tz_database_time_zones
} as const;
