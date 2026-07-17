// Dev helper: loads a page in headless Chromium and dumps elements that
// look like they contain a rupee price, plus surrounding context. Used to
// find real CSS selectors for a new provider adapter without needing
// devtools access. Not run in production/CI -- just `node inspect.mjs <url>`
// locally when adding/fixing a provider.
import { chromium } from "playwright";

const url = process.argv[2];
if (!url) {
  console.error("Usage: node inspect.mjs <url>");
  process.exit(1);
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({
  userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36",
});
const page = await context.newPage();

try {
  await page.goto(url, { waitUntil: "networkidle", timeout: 30000 });
} catch (err) {
  console.error("Navigation issue (continuing anyway):", err.message);
}
await page.waitForTimeout(3000);

console.log("=== PAGE TITLE ===");
console.log(await page.title());

console.log("=== URL AFTER LOAD (redirects?) ===");
console.log(page.url());

console.log("=== ELEMENTS CONTAINING RUPEE SIGN ===");
const matches = await page.evaluate(() => {
  const all = Array.from(document.querySelectorAll("body *"));
  const results = [];
  for (const el of all) {
    if (el.children.length > 0) continue; // leaf nodes only
    const text = el.textContent?.trim() || "";
    if (/₹|Rs\.?\s?\d/.test(text) && text.length < 60) {
      const classes = el.className && typeof el.className === "string" ? el.className : "";
      results.push(`<${el.tagName.toLowerCase()} class="${classes}"> ${text}`);
    }
  }
  return results.slice(0, 40);
});
console.log(matches.join("\n") || "(none found)");

console.log("=== BODY TEXT SAMPLE (first 2000 chars) ===");
const bodyText = await page.evaluate(() => document.body.innerText);
console.log(bodyText.slice(0, 2000));

await browser.close();
