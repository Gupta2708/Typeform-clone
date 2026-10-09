import { cp } from "node:fs/promises";
import path from "node:path";

const output = path.resolve(process.env.NEXT_DIST_DIR ?? ".next");
await cp(
  path.join(output, "static"),
  path.join(output, "standalone", ".next", "static"),
  { recursive: true },
);
console.log("Standalone server includes static assets and bundled fonts.");
