#!/usr/bin/env node
/**
 * purge-cache.mjs — purger Cloudflare-edge-cachen for i-stødet.dk efter deploy,
 * så CF straks genhenter de nye filer fra origin (ingen stale .js på edge).
 *
 * Token hentes fra 1Password (Cache Purge-scope). Køres af `npm run deploy:purge`
 * (kædet ind i `npm run deploy` efter rsync).
 */
import { execFileSync } from "node:child_process";

const ZONE = "ea83cb8b7df67afc0e7e0edda4db904a"; // i-stødet.dk (alfanova-konto)

let token;
try {
  token = execFileSync("op", ["item", "get", "Cloudflare API Token - UG3", "--vault=udstillerguide-v3", "--field=Token", "--reveal"], { encoding: "utf8" }).trim();
} catch (e) {
  console.error("[purge-cache] kunne ikke hente CF-token fra 1Password:", e.message);
  process.exit(1);
}

const resp = await fetch(`https://api.cloudflare.com/client/v4/zones/${ZONE}/purge_cache`, {
  method: "POST",
  headers: { Authorization: "Bearer " + token, "Content-Type": "application/json" },
  body: JSON.stringify({ purge_everything: true }),
});
const data = await resp.json();
if (data.success) {
  console.log("[purge-cache] Cloudflare-cache purged for i-stødet.dk");
} else {
  console.error("[purge-cache] purge fejlede:", JSON.stringify(data.errors));
  process.exit(1);
}
