import express from "express";
import { createServer as createViteServer } from "vite";
import axios from "axios";
import * as cheerio from "cheerio";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API route to fetch website data
  app.post("/api/scan", async (req, res) => {
    const { url } = req.body;

    if (!url) {
      return res.status(400).json({ error: "URL is required" });
    }

    try {
      const formattedUrl = url.startsWith("http") ? url : `https://${url}`;
      const response = await axios.get(formattedUrl, {
        headers: {
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
        timeout: 10000,
      });

      const html = response.data;
      const $ = cheerio.load(html);

      // Extract basic metadata
      const metadata = {
        title: $("title").text() || "No title found",
        description: $('meta[name="description"]').attr("content") || "No description found",
        h1Count: $("h1").length,
        h2Count: $("h2").length,
        imageCount: $("img").length,
        imagesWithoutAlt: $("img:not([alt])").length,
        linksCount: $("a").length,
        canonical: $('link[rel="canonical"]').attr("href") || "Not specified",
        ogTitle: $('meta[property="og:title"]').attr("content"),
        ogDescription: $('meta[property="og:description"]').attr("content"),
        favicon: $('link[rel="icon"]').attr("href") || $('link[rel="shortcut icon"]').attr("href"),
      };

      // Extract a snippet of the text content for AI analysis
      const bodyText = $("body").text().replace(/\s+/g, " ").trim().substring(0, 5000);

      res.json({
        url: formattedUrl,
        metadata,
        contentSnippet: bodyText,
        rawHtml: html.substring(0, 10000), // Limit size
      });
    } catch (error: any) {
      console.error("Scan error:", error.message);
      res.status(500).json({ error: `Failed to scan website: ${error.message}` });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
