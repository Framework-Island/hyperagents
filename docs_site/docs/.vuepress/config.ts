import { viteBundler } from "@vuepress/bundler-vite";
import { markdownChartPlugin } from "@vuepress/plugin-markdown-chart";
import { defaultTheme } from "@vuepress/theme-default";
import { defineUserConfig } from "vuepress";

export default defineUserConfig({
  lang: "en-US",
  title: "HyperAgents",
  description:
    "Self-improving agent framework powered by LangChain and LangGraph — documentation.",
  bundler: viteBundler(),
  theme: defaultTheme({
    logo: null,
    navbar: [
      { text: "Home", link: "/" },
      { text: "Guide", link: "/guide/introduction.html" },
      { text: "Workflows", link: "/guide/workflows.html" },
      { text: "Reference", link: "/reference/api.html" },
      { text: "Limitations", link: "/guide/limitations.html" },
      {
        text: "GitHub",
        link: "https://github.com/Framework-Island/hyperagents",
      },
    ],
    sidebar: {
      "/guide/": [
        {
          text: "Guide",
          children: [
            "/guide/introduction.md",
            "/guide/quick-start.md",
            "/guide/architecture.md",
            "/guide/workflows.md",
            "/guide/concepts.md",
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
