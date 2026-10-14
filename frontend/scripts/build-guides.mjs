// Builds the static guide pages, the guides index and the sitemap from scripts/guides/.
//   - scripts/guides/guides.json lists the guides (slug, title, description, lead, date, in the order they are shown)
//   - scripts/guides/<slug>.html is each guide's body (headings, paragraphs, tables, the "Do it in Settled" box)
// Run with `npm run guides`, then commit the files it writes under public/. Not part of the build, so a broken guide
// can never break the app.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const SITE = 'https://settled.davenc.dev';
const guides = JSON.parse(readFileSync(join(root, 'scripts/guides/guides.json'), 'utf8'));
const esc = s => s.replace(/&(?!amp;|lt;|gt;|quot;|#)/g, '&amp;').replace(/"/g, '&quot;');

const head = (title, description, path, type, extra = '') => `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)} | Settled</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Settled">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${SITE}${path}">
<meta property="og:image" content="${SITE}/og-image.png">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@500;700;800;900&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/guides/guides.css">
${extra}</head>
<body>
<header class="site"><div class="in"><a class="brand" href="/"><span class="dot"></span>settled</a><nav><a href="/guides">Guides</a><a href="/">Open Settled</a></nav></div></header>
`;
const foot = extraLinks => `<footer class="site"><div class="in"><span>Settled: split any shared cost, down to the penny.</span>${extraLinks}<a href="/">Home</a></div></footer>
</body>
</html>
`;
const cta = '<p><a class="cta" href="/s/new">Start a quick split</a><a class="cta alt" href="/">Create a free group</a></p>';

for (const g of guides) {
    const body = readFileSync(join(root, `scripts/guides/${g.slug}.html`), 'utf8').trim();
    const related = guides.filter(o => o.slug !== g.slug).map(o => `<li><a href="/guides/${o.slug}">${o.title}</a></li>`).join('');
    const ld = {
        '@context': 'https://schema.org', '@type': 'Article', headline: g.title, description: g.description,
        datePublished: g.date, dateModified: g.updated ?? g.date, mainEntityOfPage: `${SITE}/guides/${g.slug}`,
        author: { '@type': 'Organization', name: 'Settled', url: `${SITE}/` },
        publisher: { '@type': 'Organization', name: 'Settled', url: `${SITE}/`, logo: { '@type': 'ImageObject', url: `${SITE}/icon-512.png` } },
        image: `${SITE}/og-image.png`,
    };
    const html = head(g.title, g.description, `/guides/${g.slug}`, 'article', `<script type="application/ld+json">${JSON.stringify(ld)}</script>\n`)
        + `<main>\n<h1>${g.title}</h1>\n<p class="lead">${g.lead}</p>\n${body}\n\n${cta}\n<div class="related"><strong>More guides</strong><ul>${related}</ul></div>\n</main>\n`
        + foot('<a href="/guides">All guides</a>');
    writeFileSync(join(root, `public/guides/${g.slug}.html`), html);
}

const idxDesc = 'Plain-English guides to splitting shared costs fairly: groceries, rent, utilities, trips, couples and restaurant bills, with worked examples.';
const items = guides.map(g => `<li><a href="/guides/${g.slug}"><strong>${g.title}</strong></a><br><span>${g.lead}</span></li>`).join('');
writeFileSync(join(root, 'public/guides/index.html'), head('Guides to splitting shared costs fairly', idxDesc, '/guides', 'website')
    + `<main>\n<h1>Guides to splitting shared costs fairly</h1>\n<p class="lead">Practical, plain-English advice with worked examples, for the costs people actually argue about.</p>\n<ul style="padding-left:20px">${items}</ul>\n${cta}\n</main>\n` + foot(''));

const newest = guides.map(g => g.updated ?? g.date).sort().at(-1);
const urls = [['/', newest, '1.0'], ['/guides', newest, '0.8'], ...guides.map(g => [`/guides/${g.slug}`, g.updated ?? g.date, '0.8'])];
writeFileSync(join(root, 'public/sitemap.xml'), `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(([u, d, p]) => `\t<url>\n\t\t<loc>${SITE}${u}</loc>\n\t\t<lastmod>${d}</lastmod>\n\t\t<priority>${p}</priority>\n\t</url>\n`).join('')}</urlset>\n`);
console.log(`built ${guides.length} guides, the index and the sitemap`);
