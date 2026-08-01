#!/usr/bin/env node
// IndexNow: řekne Bingu a Seznamu, že se web změnil, místo čekání, až si toho všimnou sami.
// Google IndexNow nepoužívá, ten jede přes sitemapu a Search Console.
//
// Seznam adres se bere z živé sitemapy, takže se nemůže rozejít se stavem webu.
//
//   node scripts/indexnow.mjs                          # ohlásí všechny adresy ze sitemapy
//   node scripts/indexnow.mjs https://…/nabizene-domy  # ohlásí jen vyjmenované adresy
//
// Klíč musí ležet v rootu webu jako <klíč>.txt a obsahovat sám sebe, jinak endpointy
// odesílání odmítnou (403).

import { readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SITE = "https://rezidencepadochov.cz";
const HOST = new URL(SITE).host;

const ENDPOINTS = [
  "https://api.indexnow.org/indexnow",
  "https://www.bing.com/indexnow",
  "https://search.seznam.cz/indexnow",
];

function findKey() {
  const key = readdirSync(ROOT)
    .filter((f) => /^[0-9a-f]{8,128}\.txt$/i.test(f))
    .map((f) => f.replace(/\.txt$/i, ""))[0];
  if (!key) throw new Error("V rootu chybí soubor s IndexNow klíčem (<klíč>.txt).");
  return key;
}

async function urlsFromSitemap() {
  const res = await fetch(`${SITE}/sitemap.xml`);
  if (!res.ok) throw new Error(`Sitemapa vrátila ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

const key = findKey();
const urlList = process.argv.slice(2).length ? process.argv.slice(2) : await urlsFromSitemap();

if (!urlList.length) {
  console.error("Není co odeslat.");
  process.exit(1);
}
if (urlList.some((u) => new URL(u).host !== HOST)) {
  throw new Error(`IndexNow přijme jen adresy z ${HOST}.`);
}

const payload = JSON.stringify({
  host: HOST,
  key,
  keyLocation: `${SITE}/${key}.txt`,
  urlList,
});

console.log(`IndexNow: ${urlList.length} adres, klíč ${key}`);

let failed = 0;
for (const endpoint of ENDPOINTS) {
  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json; charset=utf-8" },
      body: payload,
    });
    // 200 = přijato, 202 = přijato ke zpracování; obojí je v pořádku
    const ok = res.status === 200 || res.status === 202;
    if (!ok) failed++;
    console.log(`${ok ? "ok " : "!! "} ${res.status} ${endpoint}`);
  } catch (err) {
    failed++;
    console.log(`!!  ${endpoint} — ${err.message}`);
  }
}

// Jeden nefunkční endpoint (typicky Seznam) nemá shodit deploy, ostatní klidně projdou.
process.exit(failed === ENDPOINTS.length ? 1 : 0);
