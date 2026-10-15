import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// The guides are static pages built by `npm run guides` from scripts/guides/. These checks keep the set healthy: every guide
// has its page, sensible search snippets, a sitemap entry, and no broken internal links.
const root = process.cwd();
const guides: { slug: string; title: string; description: string; lead: string; date: string }[] = JSON.parse(readFileSync(join(root, 'scripts/guides/guides.json'), 'utf8'));
const read = (p: string) => readFileSync(join(root, p), 'utf8');
const sitemap = read('public/sitemap.xml');

describe('guides', () => {
    it('there are guides, with unique addresses', () => {
        expect(guides.length).toBeGreaterThanOrEqual(7);
        expect(new Set(guides.map(g => g.slug)).size).toBe(guides.length);
    });

    it.each(guides.map(g => [g.slug, g] as const))('%s has a source, a built page, and snippets that fit a search result', (_slug, g) => {
        expect(existsSync(join(root, `scripts/guides/${g.slug}.html`))).toBe(true);
        const page = read(`public/guides/${g.slug}.html`);
        expect(page).toContain(`<h1>${g.title}</h1>`);
        expect(page).toContain(`<link rel="canonical" href="https://settled.davenc.dev/guides/${g.slug}">`);
        expect(`${g.title} | Settled`.length).toBeLessThanOrEqual(70);
        expect(g.description.length).toBeGreaterThanOrEqual(70);
        expect(g.description.length).toBeLessThanOrEqual(170);
        expect(sitemap).toContain(`<loc>https://settled.davenc.dev/guides/${g.slug}</loc>`);
    });

    it('the sitemap lists the home page and the index, and the index links every guide', () => {
        expect(sitemap).toContain('<loc>https://settled.davenc.dev/</loc>');
        expect(sitemap).toContain('<loc>https://settled.davenc.dev/guides</loc>');
        const index = read('public/guides/index.html');
        for (const g of guides) expect(index).toContain(`href="/guides/${g.slug}"`);
    });

    it('every internal link in every page points at something that exists', () => {
        const known = new Set(['/', '/guides', '/s/new', ...guides.map(g => `/guides/${g.slug}`)]);
        const pages = ['public/guides/index.html', ...guides.map(g => `public/guides/${g.slug}.html`)];
        for (const p of pages) {
            for (const [, href] of read(p).matchAll(/href="(\/[^"#?]*)"/g)) {
                const exists = known.has(href) || existsSync(join(root, 'public', href));
                expect(exists, `${p} links to ${href}`).toBe(true);
            }
        }
    });

    it('no page promises things the app does not do (no mentions of other currencies or payment processing)', () => {
        for (const g of guides) {
            const body = read(`scripts/guides/${g.slug}.html`);
            expect(body).not.toMatch(/euro|£|€|bitcoin|crypto/i);
        }
    });
});
