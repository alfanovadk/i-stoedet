const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const { assetUrl: assetUrlFn } = require("@udstillerguide/11ty-media/lib/asset-url");

module.exports = function (eleventyConfig) {
  // immediate:true så vores assetUrl-override er final (11ty 3.x deferrer ellers plugins).
  eleventyConfig.addPlugin(require("@udstillerguide/11ty-media"), { immediate: true });

  // Statiske marketing-assets.
  eleventyConfig.addPassthroughCopy("src/assets");
  // PWA'en kopieres byte-for-byte til _site/app/.
  eleventyConfig.addPassthroughCopy({ "src/app": "app" });

  eleventyConfig.addWatchTarget("src/assets/css/");
  eleventyConfig.addWatchTarget("src/assets/js/");

  // assetUrl: MEDIA_URL-prefix (no-op når MEDIA_URL er tom). Per-fil cache-bust via assetVersion.
  const mediaUrl = process.env.MEDIA_URL || "";
  eleventyConfig.addFilter("assetUrl", (assetPath) => assetUrlFn(assetPath, mediaUrl, null));

  const versionCache = new Map();
  eleventyConfig.addFilter("assetVersion", (srcPath) => {
    if (versionCache.has(srcPath)) return versionCache.get(srcPath);
    try {
      const filePath = path.join(__dirname, "src", srcPath.replace(/^\//, ""));
      const hash = crypto.createHash("sha1").update(fs.readFileSync(filePath)).digest("hex").slice(0, 8);
      versionCache.set(srcPath, hash);
      return hash;
    } catch (e) {
      return "0";
    }
  });

  // kr-formatering: 12.34 -> "12,34". Bruges i besparelses-tal.
  eleventyConfig.addFilter("kr", (n) => Number(n).toLocaleString("da-DK", { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  eleventyConfig.addFilter("kr0", (n) => Number(n).toLocaleString("da-DK", { maximumFractionDigits: 0 }));

  // ── Ikoner: KUN Font Awesome (genbruger PWA'ens paths) + Elly-maskotten. Ingen emojis. ──
  // {% icon "car", 28 %}  ·  {% elly 88 %}
  const FA = {
    car: ["0 0 512 512", "M135.2 117.4L109.1 192H402.9l-26.1-74.6C372.3 104.6 360.2 96 346.6 96H165.4c-13.6 0-25.7 8.6-30.2 21.4zM39.6 196.8L74.8 96.3C88.3 57.8 124.6 32 165.4 32H346.6c40.8 0 77.1 25.8 90.6 64.3l35.2 100.5c23.2 9.6 39.6 32.5 39.6 59.2V400v48c0 17.7-14.3 32-32 32H448c-17.7 0-32-14.3-32-32V400H96v48c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32V400 256c0-26.7 16.4-49.6 39.6-59.2zM128 288a32 32 0 1 0 -64 0 32 32 0 1 0 64 0zm288 32a32 32 0 1 0 0-64 32 32 0 1 0 0 64z"],
    utensils: ["0 0 448 512", "M416 0C400 0 288 32 288 176V288c0 35.3 28.7 64 64 64h32V480c0 17.7 14.3 32 32 32s32-14.3 32-32V352 240 32c0-17.7-14.3-32-32-32zM64 16C64 7.8 57.9 1 49.7 .1S34.2 4.6 32.4 12.5L2.1 148.8C.7 155.1 0 161.5 0 167.9c0 45.9 35.1 83.6 80 87.7V480c0 17.7 14.3 32 32 32s32-14.3 32-32V255.6c44.9-4.1 80-41.8 80-87.7c0-6.4-.7-12.8-2.1-19.1L191.6 12.5c-1.8-8-9.3-13.3-17.4-12.4S160 7.8 160 16V150.2c0 5.4-4.4 9.8-9.8 9.8c-5.1 0-9.3-3.9-9.8-9L127.9 14.6C127.2 6.3 120.3 0 112 0s-15.2 6.3-15.9 14.6L83.7 151c-.5 5.1-4.7 9-9.8 9c-5.4 0-9.8-4.4-9.8-9.8V16zm48.3 152l-.3 0-.3 0 .3-.7 .3 .7z"],
    shirt: ["0 0 640 512", "M211.8 0c7.8 0 14.3 5.7 16.7 13.2C240.8 51.9 277.1 80 320 80s79.2-28.1 91.5-66.8C413.9 5.7 420.4 0 428.2 0h12.6c22.5 0 44.2 7.9 61.5 22.3L628.5 127.4c6.6 5.5 10.7 13.5 11.4 22.1s-2.1 17.1-7.8 23.6l-56 64c-11.4 13.1-31.2 14.6-44.6 3.5L480 197.7V448c0 35.3-28.7 64-64 64H224c-35.3 0-64-28.7-64-64V197.7l-51.5 42.9c-13.3 11.1-33.1 9.6-44.6-3.5l-56-64c-5.7-6.5-8.5-15-7.8-23.6s4.8-16.6 11.4-22.1L137.7 22.3C155 7.9 176.7 0 199.2 0h12.6z"],
    fire: ["0 0 448 512", "M159.3 5.4c7.8-7.3 19.9-7.2 27.7 .1c27.6 25.9 53.5 53.8 77.7 84c11-14.4 23.5-30.1 37-42.9c7.9-7.4 20.1-7.4 28 .1c34.6 33 63.9 76.6 84.5 118c20.3 40.8 33.8 82.5 33.8 111.9C448 404.2 348.2 512 224 512C98.4 512 0 404.1 0 276.5c0-38.4 17.8-85.3 45.4-131.7C73.3 97.7 112.7 48.6 159.3 5.4zM225.7 416c25.3 0 47.7-7 68.8-21c42.1-29.4 53.4-88.2 28.1-134.4c-4.5-9-16-9.6-22.5-2l-25.2 29.3c-6.6 7.6-18.5 7.4-24.7-.5c-16.5-21-46-58.5-62.8-79.8c-6.3-8-18.3-8.1-24.7-.1c-33.8 42.5-50.8 69.3-50.8 99.4C112 375.4 162.6 416 225.7 416z"],
  };
  eleventyConfig.addShortcode("icon", (name, size, color) => {
    const ic = FA[name];
    if (!ic) return "";
    const dim = size ? (typeof size === "number" ? size + "px" : size) : "1em";
    return `<svg viewBox="${ic[0]}" width="${dim}" height="${dim}" fill="${color || "currentColor"}" aria-hidden="true" focusable="false" style="display:inline-block;vertical-align:-0.125em;overflow:visible;"><path d="${ic[1]}"/></svg>`;
  });
  // Elly-maskotten (statisk, glad) — den ENESTE ikke-FA-grafik der må bruges på sitet.
  eleventyConfig.addShortcode("elly", (size, stroke) => {
    const s = size || 96, k = stroke || "#11352b";
    return `<svg viewBox="0 0 120 120" width="${s}" height="${s}" aria-hidden="true" focusable="false" style="display:inline-block;overflow:visible;">` +
      `<path d="M70 6 L30 62 L56 62 L46 114 L94 48 L66 48 Z" fill="#FFD23F" stroke="${k}" stroke-width="4.5" stroke-linejoin="round"/>` +
      `<circle cx="55" cy="44" r="8" fill="#fff" stroke="${k}" stroke-width="2"/>` +
      `<circle cx="73" cy="44" r="8" fill="#fff" stroke="${k}" stroke-width="2"/>` +
      `<circle cx="57" cy="46" r="3.4" fill="${k}"/><circle cx="75" cy="46" r="3.4" fill="${k}"/>` +
      `<path d="M54 56 Q64 64 74 56" stroke="${k}" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;
  });

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    templateFormats: ["njk", "md", "html"],
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
};
