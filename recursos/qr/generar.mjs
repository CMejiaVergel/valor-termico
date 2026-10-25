// Genera el isotipo «VT» (para el centro del QR) y la tarjeta del QR de Valor Térmico.
// Uso (desde recursos/qr/): node generar.mjs [--url https://…]
//   1. isotipo-vt.png      — «VT» con la tipografía y el degradado del logo, fondo grafito.
//   2. qr-valor-termico.svg — QR con corrección H y el isotipo al centro (script qr.mjs de la skill video-motion).
//   3. qr-valor-termico.png — tarjeta lista para imprimir o poner en pantalla: QR + logo + llamado.
// Mientras no exista el enlace definitivo se usa una URL de ejemplo; al tenerlo, vuelva a correr con --url.
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

// puppeteer-core no es dependencia del prototipo: se toma de la captura del video (o de PUPPETEER_DESDE).
const desde = process.env.PUPPETEER_DESDE ?? "C:/Users/admin/Desktop/VOLTAC_DEV/_herramientas/motion-graphics/videos/calor-rescatado-pitch/captura/";
const puppeteer = createRequire(desde)("puppeteer-core");

const i = process.argv.indexOf("--url");
const URL = i > 0 ? process.argv[i + 1] : "https://example.com/valor-termico";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
// Fuente y logo incrustados como data URI: una página creada con setContent no puede leer file://.
const FUENTE = `data:font/woff2;base64,${readFileSync("../../public/fonts/JetBrainsMono-variable.woff2").toString("base64")}`;
const SKILL = join(homedir(), ".claude/skills/video-motion/scripts");
const IRONBOW = "linear-gradient(90deg, #4a55e0, #8c3cb4, #e1376e, #ff5a2a, #ff9a1e, #ffc32d, #fff0b4)";

const browser = await puppeteer.launch({ executablePath: CHROME, headless: true });
const page = await browser.newPage();
const captura = async (html, w, h, salida) => {
  await page.setViewport({ width: w, height: h, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: "load" });
  await page.evaluate(() => document.fonts.ready);
  await page.screenshot({ path: salida, omitBackground: false });
};
const base = `<style>@font-face{font-family:JB;src:url("${FUENTE}") format("woff2");font-weight:100 800}*{margin:0;box-sizing:border-box}</style>`;

// 1. Isotipo.
await captura(
  `${base}<div style="width:400px;height:400px;background:#0d0d0d;border-radius:64px;display:flex;align-items:center;justify-content:center">
    <span style="font:800 230px/1 JB;letter-spacing:-0.06em;background:${IRONBOW};-webkit-background-clip:text;color:transparent">VT</span></div>`,
  400, 400, "isotipo-vt.png");

// 2. QR (módulos oscuros sobre blanco para que se lea; ojos con el degradado de la marca).
execFileSync("node", [join(SKILL, "qr.mjs"), "--url", URL, "--salida", "qr-valor-termico.svg", "--logo", "isotipo-vt.png", "--modulos", "#0b0b0c,#3a1f5c", "--ojos", "#4a55e0,#e1376e", "--fondo", "#ffffff"], { stdio: "inherit" });

// 3. Tarjeta.
const qr = readFileSync("qr-valor-termico.svg", "utf8");
const logo = `data:image/png;base64,${readFileSync("../../public/marca/valor-termico.png").toString("base64")}`;
await captura(
  `${base}<div style="width:1000px;height:1300px;background:#0d0d0d;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:44px">
    <img src="${logo}" style="width:760px">
    <div style="width:720px;height:720px;padding:24px;background:#fff;border-radius:28px">${qr.replace('width="1000" height="1000"', 'width="672" height="672"')}</div>
    <div style="font:700 44px/1 JB;letter-spacing:0.12em;color:#ffb000;text-transform:uppercase">Conozca el prototipo →</div>
    <div style="font:400 26px/1 JB;color:#5e5e66">${URL}</div></div>`,
  1000, 1300, "qr-valor-termico.png");
await browser.close();
console.log("listo:", URL);
