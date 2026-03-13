// 刘鼻涕的思考花园 v2 — 瀑布流 + 月份导航

class Garden {
    constructor() {
        this.thoughts = [];
        this.months = [];   // [{label, key, ids}]
        this.init();
    }

    async init() {
        await this.loadThoughts();
        this.buildMonths();
        this.renderNav();
        this.renderStream();
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

    // ===== 日期工具 =====

    formatDate(t) {
        // 统一输出 "Mar 7, 2026" 格式
        const raw = t.dateLabel || t.date || t.id || '';
        const d = this.parseDate(raw);
        if (!d) return raw;
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${months[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
    }

    parseDate(str) {
        // Handle "2026-03-07", "2026年3月4日", "2026-03-07-2"
        let m;
        m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (m) return new Date(+m[1], +m[2]-1, +m[3]);
        m = str.match(/(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/);
        if (m) return new Date(+m[1], +m[2]-1, +m[3]);
        return null;
    }

    monthKey(t) {
        // Try dateLabel first, fall back to date, then id
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

    // ===== 按月分组 =====

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
            ids
        }));
    }

    // ===== 渲染月份导航 =====

    renderNav() {
        const nav = document.querySelector('.month-nav');
        if (!nav) return;
        nav.innerHTML = this.months.map((m, i) => `
            <button class="month-btn${i===0?' active':''}" data-month="${m.key}">${m.label}</button>
        `).join('');

        nav.querySelectorAll('.month-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                const target = document.getElementById('month-' + btn.dataset.month);
                if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
            });
        });
    }

    // ===== 渲染瀑布流 =====

    renderStream() {
        const container = document.querySelector('.card-stream');
        if (!container) return;

        let html = '';
        let currentMonth = null;

        for (const t of this.thoughts) {
            const mk = this.monthKey(t);
            if (mk !== currentMonth) {
                currentMonth = mk;
                html += `<div class="month-divider" id="month-${mk}">${this.monthLabel(mk)}</div>`;
            }
            html += this.createCardHTML(t);
        }

        container.innerHTML = html;
    }

    createCardHTML(t) {
        const date = this.formatDate(t);
        const subtitle = t.subtitle ? `<p class="card-subtitle">${t.subtitle}</p>` : '';
        const image = (t.image || t.coverImage)
            ? `<img src="${t.image || t.coverImage}" alt="${t.title}" class="card-cover" loading="lazy">`
            : '';
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

        const tags = Array.isArray(t.tags) && t.tags.length
            ? `<div class="card-tags">${t.tags.map(tg => `<span class="card-tag-pill">${tg}</span>`).join('')}</div>`
            : '';

        return `
            <article class="thought-card" id="card-${t.id}">
                <time class="card-date">${date}</time>
                <h2 class="card-title">${t.title}</h2>
                ${subtitle}
                ${image}
                ${quote}
                <div class="card-content">${content}</div>
                ${tags}
            </article>
        `;
    }

    // ===== Intersection Observer (lazy load + fade in + nav highlight) =====

    initObserver() {
        // Lazy images
        const imgObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    const img = e.target;
                    if (img.dataset.src) {
                        img.src = img.dataset.src;
                        img.removeAttribute('data-src');
                    }
                    imgObs.unobserve(img);
                }
            });
        }, { rootMargin: '300px' });

        document.querySelectorAll('img.lazy').forEach(img => imgObs.observe(img));

        // Fade in cards
        const cardObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    cardObs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });

        document.querySelectorAll('.thought-card').forEach(card => cardObs.observe(card));
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
                    // scroll nav button into view
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
            document.body.style.transition = 'opacity 0.4s ease';
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
