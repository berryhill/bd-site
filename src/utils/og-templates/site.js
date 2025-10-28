import satori from "satori";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";

export default async () => {
  return satori(
    {
      type: "div",
      props: {
        style: {
          background: "#fffbeb",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                position: "absolute",
                top: "-1px",
                right: "-1px",
                border: "3px solid #800020",
                background: "#fef3c7",
                opacity: "0.3",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "center",
                margin: "2.5rem",
                width: "88%",
                height: "80%",
              },
            },
          },
          {
            type: "div",
            props: {
              style: {
                border: "3px solid #800020",
                background: "#fffbeb",
                borderRadius: "8px",
                display: "flex",
                justifyContent: "center",
                margin: "2rem",
                width: "88%",
                height: "80%",
              },
              children: {
                type: "div",
                props: {
                  style: {
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    margin: "20px",
                    width: "90%",
                    height: "90%",
                  },
                  children: [
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          flexDirection: "column",
                          justifyContent: "center",
                          alignItems: "center",
                          height: "90%",
                          maxHeight: "90%",
                          overflow: "hidden",
                          textAlign: "center",
                        },
                        children: [
                          {
                            type: "p",
                            props: {
                              style: {
                                fontSize: 72,
                                fontWeight: "bold",
                                color: "#1c1917",
                                letterSpacing: "-0.025em"
                              },
                              children: SITE.title,
                            },
                          },
                          {
                            type: "p",
                            props: {
                              style: {
                                fontSize: 24,
                                color: "#57534e",
                                lineHeight: 1.6,
                                marginTop: 20,
                                paddingLeft: 40,
                                paddingRight: 40,
                              },
                              children: SITE.desc,
                            },
                          },
                        ],
                      },
                    },
                    {
                      type: "div",
                      props: {
                        style: {
                          display: "flex",
                          justifyContent: "flex-end",
                          width: "100%",
                          marginBottom: "8px",
                          fontSize: 28,
                        },
                        children: {
                          type: "span",
                          props: {
                            style: {
                              overflow: "hidden",
                              fontWeight: "bold",
                              color: "#1c1917"
                            },
                            children: new URL(SITE.website).hostname,
                          },
                        },
                      },
                    },
                  ],
                },
              },
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
