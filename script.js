// 刘鼻涕的思考花园 v3 — Midnight Garden

class Garden {
    constructor() {
        this.thoughts = [];
        this.months = [];
        this.init();
    }

    async init() {
        await this.loadThoughts();
        this.buildMonths();
        this.renderNav();
        this.renderGrid();
        this.initObserver();
        this.initNavScroll();
        this.initBackToTop();
        this.fadeIn();
    }

    async loadThoughts() {
        try {
            const r = await fetch('thoughts.json?v=' + Date.now());
            const data = await r.json();
            this.thoughts = data.thoughts;
        } catch (e) {
            console.error('Failed to load thoughts:', e);
            this.thoughts = [];
        }
    }

    // ===== Date utilities =====

    formatDate(t) {
        const raw = t.dateLabel || t.date || t.id || '';
        const d = this.parseDate(raw);
        if (!d) return raw;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    parseDate(str) {
        let m;
        m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(+m[1], +m[2]-1, +m[3]);
        m = str.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
        if (m) return new Date(+m[1], +m[2]-1, +m[3]);
        return null;
    }

    monthKey(t) {
        const candidates = [t.dateLabel, t.date, t.id].filter(Boolean);
        for (const c of candidates) {
            const d = this.parseDate(c);
            if (d) return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
        }
        return 'unknown';
    }

    monthLabel(key) {
        if (key === 'unknown') return 'Other';
        const [y, m] = key.split('-');
        const names = ['January','February','March','April','May','June','July','August','September','October','November','December'];
        return `${names[+m-1]} ${y}`;
    }

    monthShortLabel(key) {
        if (key === 'unknown') return '?';
        const [y, m] = key.split('-');
        const names = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${names[+m-1]} '${y.slice(2)}`;
    }

    // ===== Build months =====

    buildMonths() {
        const map = new Map();
        for (const t of this.thoughts) {
            const k = this.monthKey(t);
            if (!map.has(k)) map.set(k, []);
            map.get(k).push(t.id);
        }
        this.months = [...map.entries()].map(([key, ids]) => ({
            key,
            label: this.monthLabel(key),
            shortLabel: this.monthShortLabel(key),
            ids
        }));
    }

    // ===== Determine featured cards =====

    isFeatured(t) {
        // Featured: has image AND (long content OR has quote OR many tags)
        const hasImage = !!(t.image || t.coverImage);
        const contentLength = Array.isArray(t.content) ? t.content.length : 0;
        const hasQuote = !!t.quote;
        const manyTags = Array.isArray(t.tags) && t.tags.length >= 6;

        return hasImage && (contentLength >= 5 || hasQuote || manyTags);
    }

    // ===== Render nav =====

    renderNav() {
        const nav = document.querySelector('.nav-months');
        if (!nav) return;
        nav.innerHTML = this.months.map((m, i) => `
            <button class="month-btn${i===0?' active':''}" data-month="${m.key}">${m.shortLabel}</button>
        `).join('');

        nav.querySelectorAll('.month-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById('month-' + btn.dataset.month);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    // ===== Render grid =====

    renderGrid() {
        const container = document.querySelector('.garden-grid');
        if (!container) return;

        let html = '';
        let currentMonth = null;
        let cardIndex = 0;

        for (const t of this.thoughts) {
            const mk = this.monthKey(t);
            if (mk !== currentMonth) {
                currentMonth = mk;
                html += `
                    <div class="month-divider" id="month-${mk}">
                        <span class="month-divider-label">${this.monthLabel(mk)}</span>
                        <span class="month-divider-line"></span>
                    </div>`;
            }
            html += this.createCardHTML(t, cardIndex);
            cardIndex++;
        }

        container.innerHTML = html;
    }

    createCardHTML(t, index) {
        const date = this.formatDate(t);
        const featured = this.isFeatured(t);
        const hasImage = !!(t.image || t.coverImage);
        const imgSrc = t.image || t.coverImage || '';

        const subtitle = t.subtitle ? `<p class="card-subtitle">${t.subtitle}</p>` : '';

        const quote = t.quote
            ? `<div class="card-quote">"${t.quote}"</div>`
            : '';

        const content = Array.isArray(t.content) ? t.content.map(item => {
            if (typeof item === 'string') return `<p class="card-text">${item}</p>`;
            if (item.type === 'insight') return `<p class="card-insight">${(item.text||'').replace(/\n/g,'<br>')}</p>`;
            if (item.type === 'quote') return `<blockquote class="card-blockquote">${(item.text||'').replace(/\n/g,'<br>')}</blockquote>`;
            if (item.type === 'list') return `<ul class="card-list">${(item.items||[]).map(li=>`<li>${li}</li>`).join('')}</ul>`;
            return '';
        }).join('') : '';

        // For non-featured, truncate visible content
        const displayContent = featured ? content : this.truncateContent(t);

        const tags = Array.isArray(t.tags) && t.tags.length
            ? `<div class="card-tags">${t.tags.map(tg => `<span class="card-tag-pill">${tg}</span>`).join('')}</div>`
            : '';

        let classes = 'thought-card';
        if (featured) classes += ' featured';
        if (!hasImage) classes += ' text-only';

        if (featured && hasImage) {
            return `
                <article class="${classes}" id="card-${t.id}">
                    <div class="card-visual">
                        <img src="${imgSrc}" alt="${t.title || ''}" class="card-cover" loading="lazy">
                    </div>
                    <div class="card-body">
                        <time class="card-date">${date}</time>
                        <h2 class="card-title">${t.title || ''}</h2>
                        ${subtitle}
                        ${quote}
                        <div class="card-content">${displayContent}</div>
                        ${tags}
                    </div>
                </article>`;
        }

        // Standard card
        const imageHTML = hasImage
            ? `<div class="card-visual"><img src="${imgSrc}" alt="${t.title || ''}" class="card-cover" loading="lazy"></div>`
            : '';

        return `
            <article class="${classes}" id="card-${t.id}">
                ${imageHTML}
                <div class="card-body">
                    <time class="card-date">${date}</time>
                    <h2 class="card-title">${t.title || ''}</h2>
                    ${subtitle}
                    ${quote}
                    <div class="card-content">${displayContent}</div>
                    ${tags}
                </div>
            </article>`;
    }

    truncateContent(t) {
        if (!Array.isArray(t.content)) return '';
        // Show first 2 blocks for non-featured
        const items = t.content.slice(0, 2);
        let html = items.map(item => {
            if (typeof item === 'string') return `<p class="card-text">${item}</p>`;
            if (item.type === 'insight') return `<p class="card-insight">${(item.text||'').replace(/\n/g,'<br>')}</p>`;
            if (item.type === 'quote') return `<blockquote class="card-blockquote">${(item.text||'').replace(/\n/g,'<br>')}</blockquote>`;
            if (item.type === 'list') return `<ul class="card-list">${(item.items||[]).map(li=>`<li>${li}</li>`).join('')}</ul>`;
            return '';
        }).join('');

        if (t.content.length > 2) {
            html += `<p class="card-text" style="color:var(--color-text-dim);font-style:italic;font-size:0.8rem;">…</p>`;
        }
        return html;
    }

    // ===== Observers =====

    initObserver() {
        // Fade in cards
        const cardObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    cardObs.unobserve(e.target);
                }
            });
        }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

        document.querySelectorAll('.thought-card').forEach(card => cardObs.observe(card));

        // Fade in cover images on load
        document.querySelectorAll('img.card-cover').forEach(img => {
            if (img.complete && img.naturalWidth > 0) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
                img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
            }
        });
    }

    // ===== Scroll-based nav highlight =====

    initNavScroll() {
        const dividers = document.querySelectorAll('.month-divider');
        const btns = document.querySelectorAll('.month-btn');
        if (!dividers.length || !btns.length) return;

        const obs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const mk = e.target.id.replace('month-', '');
                    btns.forEach(b => b.classList.toggle('active', b.dataset.month === mk));
                    const active = document.querySelector('.month-btn.active');
                    if (active) active.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
                }
            });
        }, { rootMargin: '-10% 0px -80% 0px' });

        dividers.forEach(d => obs.observe(d));
    }

    fadeIn() {
        document.body.style.opacity = '0';
        requestAnimationFrame(() => {
            document.body.style.transition = 'opacity 0.5s ease';
            document.body.style.opacity = '1';
        });
    }

    initBackToTop() {
        const btn = document.getElementById('backToTop');
        if (!btn) return;
        window.addEventListener('scroll', () => {
            btn.classList.toggle('visible', window.scrollY > 600);
        }, { passive: true });
        btn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }
}

document.addEventListener('DOMContentLoaded', () => new Garden());
