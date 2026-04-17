import { viteBundler } from "@vuepress/bundler-vite";
import { markdownChartPlugin } from "@vuepress/plugin-markdown-chart";
import { defaultTheme } from "@vuepress/theme-default";
import { defineUserConfig } from "vuepress";

export default defineUserConfig({
  lang: "en-US",
  title: "HyperAgents",
  description:
    "Self-improving agent framework powered by LangChain and LangGraph — documentation.",
  head: [
    ["link", { rel: "icon", type: "image/png", href: "/logo.png" }],
    ["meta", { name: "theme-color", content: "#3eaf7c" }],
    [
      "meta",
      {
        name: "keywords",
        content:
          "AI, Generative AI, LangChain, LangGraph, Quality Diversity, Evolution, LLM, Agents",
      },
    ],
  ],
  bundler: viteBundler(),
  theme: defaultTheme({
    logo: "/logo.png",
    repo: "Framework-Island/hyperagents",
    docsDir: "docs_site/docs",
    navbar: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/concepts.html" },
      { text: "Examples", link: "/guide/quick-start.html" },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          children: [
            "/guide/introduction.md",
            "/guide/quick-start.md",
            "/guide/concepts.md",
            "/guide/architecture.md",
            "/guide/limitations.md",
          ],
        },
      ],
      "/reference/": [
        {
          text: "Reference",
          children: ["/reference/api.md"],
        },
      ],
    },
    editLink: false,
    contributors: false,
    lastUpdated: false,
  }),
  plugins: [
    markdownChartPlugin({
      mermaid: true,
    }),
  ],
});
