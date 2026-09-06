require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");

const app = express();
const port = process.env.PORT || 3000;
const publicDirectory = __dirname;
const indexPath = path.join(publicDirectory, "index.html");

function isMobileUserAgent(userAgent = "") {
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini|mobile/i.test(userAgent);
}

function renderIndex(request) {
  const html = fs.readFileSync(indexPath, "utf8");
  const deviceClass = isMobileUserAgent(request.get("user-agent")) ? "is-mobile" : "is-desktop";
  const supabaseConfig = `<script>window.FINTRACKER_CONFIG=${JSON.stringify({ supabaseUrl: process.env.SUPABASE_URL || "", supabaseAnonKey: process.env.SUPABASE_ANON_KEY || "" })};</script>`;

  return html.replace("</head>", `${supabaseConfig}</head>`).replace(
    /<body([^>]*)class="([^"]*)"([^>]*)>/i,
    (_match, beforeClass, classes, afterClass) => `<body${beforeClass}class="${classes} ${deviceClass}"${afterClass}>`
  );
}

app.disable("x-powered-by");

app.get("/", (request, response) => {
  response.type("html").send(renderIndex(request));
});

app.use(express.static(publicDirectory, { index: false }));

app.listen(port, () => {
  console.log(`FinTracker BFF running at http://localhost:${port}`);
});

module.exports = { app, isMobileUserAgent, renderIndex };