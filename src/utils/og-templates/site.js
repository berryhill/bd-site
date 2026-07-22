import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";
import { buildSiteOgTree } from "./brand";

export default async () => {
  return satori(buildSiteOgTree(SITE), {
    width: 1200,
    height: 630,
    embedFont: true,
    fonts: await loadGoogleFonts(SITE.title + SITE.socialPreview.title),
  });
};
