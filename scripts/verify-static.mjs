import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("..", import.meta.url));
const expectedOrigin = "https://starmilk.org/";
const failures = [];

function check(condition, message) {
  if (!condition) failures.push(message);
}

function collectJavaScript(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    if ([".git", ".github", "node_modules"].includes(entry.name)) return [];
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return collectJavaScript(path);
    return entry.isFile() && entry.name.endsWith(".js") ? [path] : [];
  });
}

const index = readFileSync(join(root, "index.html"), "utf8");
check(index.includes(`<link rel="canonical" href="${expectedOrigin}" />`), "index.html is missing the canonical starmilk.org URL");
check(index.includes(`<meta property="og:url" content="${expectedOrigin}" />`), "index.html Open Graph URL is not canonical");
check(index.includes("<meta name=\"twitter:image\" content=\"https://starmilk.org/star-wizard.jpg\" />"), "index.html Twitter image is not hosted on the canonical domain");
check(index.includes(`"url": "${expectedOrigin}"`) && index.includes("\"image\": \"https://starmilk.org/star-wizard.jpg\""), "index.html MusicGroup JSON-LD is not canonical");
check(readFileSync(join(root, "CNAME"), "utf8").trim() === "starmilk.org", "CNAME must contain exactly starmilk.org");

for (const filename of ["manifest.json", "starmilk-tracks.json"]) {
  try {
    JSON.parse(readFileSync(join(root, filename), "utf8"));
  } catch (error) {
    failures.push(`${filename} is not valid JSON: ${error instanceof Error ? error.message : String(error)}`);
  }
}

for (const file of collectJavaScript(root)) {
  try {
    execFileSync(process.execPath, ["--check", file], { stdio: "pipe" });
  } catch (error) {
    failures.push(`${relative(root, file)} has invalid JavaScript syntax: ${error.stderr?.toString().trim() || error.message}`);
  }
}

if (failures.length) {
  console.error("STARMILK static verification failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log("STARMILK static verification passed.");
