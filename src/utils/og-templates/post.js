import satori from "satori";
// import { html } from "satori-html";
import { SITE } from "@/config";
import loadGoogleFonts from "../loadGoogleFont";

// const markup = html`<div
//       style={{
//         background: "#fefbfb",
//         width: "100%",
//         height: "100%",
//         display: "flex",
//         alignItems: "center",
//         justifyContent: "center",
//       }}
//     >
//       <div
//         style={{
//           position: "absolute",
//           top: "-1px",
//           right: "-1px",
//           border: "4px solid #000",
//           background: "#ecebeb",
//           opacity: "0.9",
//           borderRadius: "4px",
//           display: "flex",
//           justifyContent: "center",
//           margin: "2.5rem",
//           width: "88%",
//           height: "80%",
//         }}
//       />

//       <div
//         style={{
//           border: "4px solid #000",
//           background: "#fefbfb",
//           borderRadius: "4px",
//           display: "flex",
//           justifyContent: "center",
//           margin: "2rem",
//           width: "88%",
//           height: "80%",
//         }}
//       >
//         <div
//           style={{
//             display: "flex",
//             flexDirection: "column",
//             justifyContent: "space-between",
//             margin: "20px",
//             width: "90%",
//             height: "90%",
//           }}
//         >
//           <p
//             style={{
//               fontSize: 72,
//               fontWeight: "bold",
//               maxHeight: "84%",
//               overflow: "hidden",
//             }}
//           >
//             {post.data.title}
//           </p>
//           <div
//             style={{
//               display: "flex",
//               justifyContent: "space-between",
//               width: "100%",
//               marginBottom: "8px",
//               fontSize: 28,
//             }}
//           >
//             <span>
//               by{" "}
//               <span
//                 style={{
//                   color: "transparent",
//                 }}
//               >
//                 "
//               </span>
//               <span style={{ overflow: "hidden", fontWeight: "bold" }}>
//                 {post.data.author}
//               </span>
//             </span>

//             <span style={{ overflow: "hidden", fontWeight: "bold" }}>
//               {SITE.title}
//             </span>
//           </div>
//         </div>
//       </div>
//     </div>`;

export default async post => {
  return satori(
    {
      type: "div",
      props: {
        style: {
          background: "#fffbeb",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "space-between",
          padding: "80px",
        },
        children: [
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "baseline",
                marginBottom: "40px",
              },
              children: [
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 48,
                      fontWeight: "bold",
                      color: "#1c1917",
                      letterSpacing: "-0.025em",
                    },
                    children: "berryhill",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 48,
                      fontWeight: "900",
                      color: "#ff6b35",
                    },
                    children: ".",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontSize: 48,
                      fontWeight: "bold",
                      color: "#800020",
                    },
                    children: "dev",
                  },
                },
              ],
            },
          },
          {
            type: "h1",
            props: {
              style: {
                fontSize: 72,
                fontWeight: "bold",
                color: "#1c1917",
                letterSpacing: "-0.025em",
                lineHeight: 1.1,
                margin: "0",
              },
              children: post.data.title,
            },
          },
          {
            type: "div",
            props: {
              style: {
                display: "flex",
                alignItems: "center",
                gap: "12px",
                fontSize: 24,
                color: "#57534e",
              },
              children: [
                {
                  type: "span",
                  props: {
                    children: "by",
                  },
                },
                {
                  type: "span",
                  props: {
                    style: {
                      fontWeight: "600",
                      color: "#1c1917",
                    },
                    children: post.data.author,
                  },
                },
              ],
            },
          },
        ],
      },
    },
    {
      width: 1200,
      height: 630,
      embedFont: true,
      fonts: await loadGoogleFonts(
        post.data.title + post.data.author + SITE.title + "by"
      ),
    }
  );
};
