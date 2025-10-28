import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";

export default async () => {
  return satori(
    {
      type: "div",
      props: {
        style: {
          background: "#1c1917",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "baseline",
                marginBottom: "60px",
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 96,
                      fontWeight: "bold",
                      color: "#fafaf9",
                      letterSpacing: "-0.025em",
                    },
                    children: "berryhill",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 96,
                      fontWeight: "900",
                      color: "#ff8c42",
                    },
                    children: ".",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 96,
                      fontWeight: "bold",
                      color: "#a0153e",
                    },
                    children: "dev",
                  },
                },
              ],
            },
          },
          {
            type: "p",
            props: {
              style: {
                fontSize: 28,
                color: "#d6d3d1",
                lineHeight: 1.6,
                maxWidth: "900px",
              },
              children: SITE.desc,
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: await loadGoogleFonts(SITE.title + SITE.desc + SITE.website),
    }
  );
};
