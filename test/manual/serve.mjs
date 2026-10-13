// test/manual/serve.mjs — serves test/manual/shop.html at http://localhost:8080
// for trying the Dark Pattern Blocker by hand. Not a test, not shipped.
//
//   node test/manual/serve.mjs

import http from "node:http";
import fs from "node:fs";

const page = new URL("./shop.html", import.meta.url);

http
  .createServer((req, res) => {
    res.writeHead(200, { "content-type": "text/html; charset=utf-8" });
    res.end(fs.readFileSync(page));
  })
  .listen(8080, () => console.log("Fake shop at http://localhost:8080 (Ctrl+C to stop)"));
