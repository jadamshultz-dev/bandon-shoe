// Builds a single-file copy of the app for a quick look outside Netlify. Run with: bun scripts/build-preview.mjs <outdir>
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
const out = process.argv[2] || 'preview';
const res = await Bun.build({
  entrypoints: ['src/main.jsx'],
  outdir: out,
  minify: true,
  target: 'browser',
  format: 'esm',
  define: { 'process.env.NODE_ENV': '"production"' },
});
if (!res.success) { console.error(res.logs); process.exit(1); }
const files = readdirSync(out);
const js = readFileSync(join(out, files.find((f) => f.endsWith('.js'))), 'utf8');
const css = readFileSync(join(out, files.find((f) => f.endsWith('.css'))), 'utf8');
const html = `<title>Bandon Shoe 2026</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="color-scheme" content="light">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Jost:wght@500;600;700&family=Libre+Caslon+Display&family=Public+Sans:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>${css}</style>
<div id="root"></div>
<script type="module">${js.replace(/<\/script/gi, '<\\/script')}</script>
`;
writeFileSync(join(out, 'bandon-shoe-demo.html'), html);
console.log('wrote', join(out, 'bandon-shoe-demo.html'), (html.length / 1024).toFixed(0) + ' KB');
