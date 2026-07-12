import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";
import { buildPostOgTree } from "./brand";

export default async post => {
  return satori(buildPostOgTree(post, SITE), {
    width: 1200,
    height: 630,
    embedFont: true,
    fonts: await loadGoogleFonts(
      post.data.title + post.data.author + SITE.title + SITE.website
    ),
  });
};
