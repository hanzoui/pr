#!/usr/bin/env bun

Bun.serve({
  port: 8080,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Default to index.html
    if (path === "/") path = "/index.html";

    // Remove leading slash
    path = path.slice(1);

    const file = Bun.file(path);

    if (await file.exists()) {
      return new Response(file, {
        headers: {
          "Content-Type": getContentType(path),
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response("Not Found", { status: 404 });
  },
});

function getContentType(path: string): string {
  if (path.endsWith(".html")) return "text/html";
  if (path.endsWith(".json")) return "application/json";
  if (path.endsWith(".js")) return "application/javascript";
  if (path.endsWith(".css")) return "text/css";
  return "text/plain";
}

console.log("Server running at http://localhost:8080");
console.log("Open http://localhost:8080 to view the interactive D3 report");
