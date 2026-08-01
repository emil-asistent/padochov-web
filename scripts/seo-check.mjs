#!/usr/bin/env node
/**
 * Kontrola SEO a GEO základů na živém webu.
 *
 *   node scripts/seo-check.mjs [https://rezidencepadochov.cz]
 *
 * Hlídá přesně to, co se tady už jednou rozbilo nebo se rozbít může: Cloudflare si umí
 * vrátit vlastní robots.txt i blokaci AI robotů, po deployi drží stará cache, čisté URL
 * závisí na nginx pravidlech a strukturovaná data se snadno rozejdou s obsahem.
 */

const BASE = (process.argv[2] || "https://rezidencepadochov.cz").replace(/\/$/, "");

const PAGES = [
  "/",
  "/lokalita",
  "/o-projektu",
  "/nabizene-domy-a-cenik",
  "/standardy",
  "/galerie",
  "/kontakt",
  "/dum-01",
  "/dum-02",
  "/dum-03",
  "/dum-04",
  "/dum-05",
  "/dum-06",
];

// roboti, přes které chodí odpovědi jazykových modelů; když je Cloudflare zase začne
// blokovat, web z AI odpovědí zmizí a nikde to jinak nepoznáš
const AI_ROBOTI = ["GPTBot/1.2", "ClaudeBot/1.0", "PerplexityBot/1.0", "Googlebot/2.1", "SeznamBot/4.0"];

let pass = 0;
let fail = 0;
const problems = [];

function ok(name, detail = "") {
  pass++;
  console.log(`  ok   ${name}${detail ? "  " + detail : ""}`);
}
function bad(name, detail = "") {
  fail++;
  problems.push(`${name}${detail ? " — " + detail : ""}`);
  console.log(`  FAIL ${name}${detail ? "  " + detail : ""}`);
}

async function get(path, opts = {}) {
  const res = await fetch(BASE + path, { redirect: "manual", ...opts });
  const body = res.status < 400 ? await res.text() : "";
  return { status: res.status, headers: res.headers, body };
}

console.log(`\nSEO a GEO kontrola: ${BASE}\n`);

// --- soubory pro roboty ---
console.log("soubory pro roboty");
{
  const r = await get("/robots.txt");
  if (r.status !== 200) bad("robots.txt", `status ${r.status}`);
  else if (!/Sitemap:/i.test(r.body)) bad("robots.txt obsahuje Sitemap", "nejspíš ho přebíjí Cloudflare managed robots");
  else if (/Disallow: \/$/m.test(r.body)) bad("robots.txt nezakazuje celý web");
  else ok("robots.txt", "s direktivou Sitemap");

  const s = await get("/sitemap.xml");
  if (s.status !== 200) bad("sitemap.xml", `status ${s.status}`);
  else {
    const urls = [...s.body.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
    urls.length >= PAGES.length
      ? ok("sitemap.xml", `${urls.length} adres`)
      : bad("sitemap.xml", `jen ${urls.length} adres, čekáme aspoň ${PAGES.length}`);
    const spatne = urls.filter((u) => u.endsWith(".html") || u.includes("//rezidencepadochov.cz//"));
    spatne.length ? bad("adresy v sitemapě jsou čisté", spatne.join(", ")) : ok("adresy v sitemapě jsou čisté");
  }

  for (const soubor of ["/llms.txt", "/favicon.ico", "/site.webmanifest"]) {
    const r = await get(soubor);
    r.status === 200 ? ok(soubor) : bad(soubor, `status ${r.status}`);
  }

  const key = "be59a7277370593121f861b7475c3e2a";
  const k = await get(`/${key}.txt`);
  k.status === 200 && k.body.trim() === key ? ok("IndexNow klíč") : bad("IndexNow klíč", `status ${k.status}`);
}

// --- stránky ---
console.log("\nstránky");
{
  for (const path of PAGES) {
    const r = await get(path);
    if (r.status !== 200) {
      bad(`${path}`, `status ${r.status}`);
      continue;
    }
    const potize = [];
    const canonical = r.body.match(/<link rel="canonical" href="([^"]+)"/)?.[1];
    if (!canonical) potize.push("chybí canonical");
    else if (canonical.endsWith(".html")) potize.push(`canonical s .html (${canonical})`);
    if (!/<meta name="description" content="[^"]{50,}"/.test(r.body)) potize.push("krátký nebo chybějící description");
    if (!/<meta property="og:image"/.test(r.body)) potize.push("chybí og:image");
    if ((r.body.match(/<h1[\s>]/g) || []).length !== 1) potize.push("nemá právě jeden h1");
    if (!/<link rel="manifest"/.test(r.body)) potize.push("chybí manifest");
    if (!(r.headers.get("cache-control") || "").includes("max-age")) potize.push("bez Cache-Control");

    const ld = r.body.match(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/)?.[1];
    if (!ld) potize.push("chybí JSON-LD");
    else {
      try {
        const data = JSON.parse(ld);
        if (!Array.isArray(data["@graph"]) || !data["@graph"].length) potize.push("prázdný @graph");
      } catch {
        potize.push("rozbitý JSON-LD");
      }
    }

    potize.length ? bad(path, potize.join("; ")) : ok(path);
  }
}

// --- čisté URL a přesměrování ---
console.log("\nčisté URL a přesměrování");
{
  const html = await get("/kontakt.html");
  html.status === 308 && (html.headers.get("location") || "").endsWith("/kontakt")
    ? ok("/kontakt.html → /kontakt", "308")
    : bad("/kontakt.html → /kontakt", `status ${html.status}, location ${html.headers.get("location")}`);

  const lomitko = await get("/kontakt/");
  [301, 308].includes(lomitko.status)
    ? ok("/kontakt/ → /kontakt", `${lomitko.status}`)
    : bad("/kontakt/ → /kontakt", `status ${lomitko.status}`);

  const ctyristaCtyri = await fetch(`${BASE}/tahle-stranka-neexistuje`, { redirect: "manual" });
  ctyristaCtyri.status === 404 ? ok("neznámá adresa vrací 404") : bad("neznámá adresa vrací 404", `status ${ctyristaCtyri.status}`);

  // duplicitní kopie webu si jinak konkurují ve vyhledávání
  for (const dup of ["https://padochov-web.vercel.app/", "https://padochov.djai.cz/"]) {
    try {
      const r = await fetch(dup, { redirect: "manual" });
      const cil = r.headers.get("location") || "";
      [301, 302, 307, 308].includes(r.status) && cil.includes("rezidencepadochov.cz")
        ? ok(`${dup} → ostrá doména`, `${r.status}`)
        : bad(`${dup} → ostrá doména`, `status ${r.status}, location ${cil || "žádná"}`);
    } catch (err) {
      bad(`${dup} → ostrá doména`, err.message);
    }
  }
}

// --- roboti jazykových modelů ---
console.log("\npřístup robotů");
{
  for (const ua of AI_ROBOTI) {
    const r = await fetch(BASE + "/", {
      headers: { "User-Agent": `Mozilla/5.0 (compatible; ${ua}; +http://example.com/bot)` },
      redirect: "manual",
    });
    r.status === 200 ? ok(ua.split("/")[0]) : bad(ua.split("/")[0], `status ${r.status}`);
  }
}

console.log(`\nhotovo: ${pass} ok, ${fail} chyb`);
if (problems.length) {
  console.log("\nk vyřešení:");
  for (const p of problems) console.log(`  - ${p}`);
}
process.exit(fail ? 1 : 0);
