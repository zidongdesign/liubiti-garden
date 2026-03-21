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
        this.initShareCard();
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
        // Derive title: use explicit title, or first sentence of text field, or id
        const title = t.title || (t.text ? t.text.split(/[。．.!！?？\n]/)[0].slice(0, 60) : t.id);
        const subtitle = t.subtitle ? `<p class="card-subtitle">${t.subtitle}</p>` : '';
        const imgSrc = t.image || t.coverImage;
        const thumbSrc = imgSrc ? imgSrc.replace('images/', 'images/thumbs/').replace(/\.png$/, '.webp') : null;
        const image = imgSrc
            ? `<img src="${thumbSrc}" alt="${title}" class="card-cover" loading="lazy" onerror="this.onerror=null;this.src='${imgSrc}'">`
            : '';

        // For compact-format entries (text field, no content array), render text as content
        let quote = t.quote
            ? `<div class="card-quote">"${t.quote}"</div>`
            : '';
        let bodyContent;
        if (Array.isArray(t.content)) {
            bodyContent = t.content.map(item => {
                if (typeof item === 'string') return `<p class="card-text">${item}</p>`;
                if (item.type === 'insight') return `<p class="card-insight">${(item.text||'').replace(/\n/g,'<br>')}</p>`;
                if (item.type === 'quote') return `<blockquote class="card-blockquote">${(item.text||'').replace(/\n/g,'<br>')}</blockquote>`;
                if (item.type === 'list') return `<ul class="card-list">${(item.items||[]).map(li=>`<li>${li}</li>`).join('')}</ul>`;
                return '';
            }).join('');
        } else if (t.body) {
            // body field: split paragraphs on double newline
            bodyContent = t.body.split(/\n\n+/).map(p => 
                `<p class="card-text">${p.replace(/\n/g,'<br>')}</p>`
            ).join('');
        } else if (t.text) {
            bodyContent = `<p class="card-text">${t.text}</p>`;
        } else {
            bodyContent = '';
        }

        const tags = Array.isArray(t.tags) && t.tags.length
            ? `<div class="card-tags">${t.tags.map(tg => `<span class="card-tag-pill">${tg}</span>`).join('')}</div>`
            : '';

        return `
            <article class="thought-card" id="card-${t.id}">
                <time class="card-date">${date}</time>
                <h2 class="card-title">${title}</h2>
                ${subtitle}
                ${image}
                ${quote}
                <div class="card-content">${bodyContent}</div>
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

        // Fade in cover images on load
        document.querySelectorAll('img.card-cover').forEach(img => {
            if (img.complete) {
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

    // ===== 长按分享 =====

    initShareCard() {
        const getThought = (cardEl) => {
            const id = cardEl.id.replace('card-', '');
            return this.thoughts.find(t => t.id === id);
        };

        // Click on card cover image → share overlay
        document.addEventListener('click', (e) => {
            if (!e.target.classList.contains('card-cover')) return;
            e.preventDefault();
            e.stopPropagation();
            const card = e.target.closest('.thought-card');
            if (!card) return;
            const t = getThought(card);
            if (t) this.showShareOverlay(t);
        });
    }

    async showShareOverlay(thought) {
        // Create overlay
        const overlay = document.createElement('div');
        overlay.className = 'share-overlay';
        overlay.innerHTML = `
            <div class="share-container">
                <canvas class="share-canvas"></canvas>
                <div class="share-actions">
                    <button class="share-btn share-save">分享</button>
                    <button class="share-btn share-close">关闭</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        requestAnimationFrame(() => overlay.classList.add('visible'));

        const canvas = overlay.querySelector('.share-canvas');
        await this.renderShareImage(canvas, thought);

        // Save/share button
        overlay.querySelector('.share-save').addEventListener('click', async () => {
            const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
            const file = new File([blob], `${thought.id || 'share'}.png`, { type: 'image/png' });

            // Use native share on iOS/Android
            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file] });
                } catch (e) { /* user cancelled */ }
            } else {
                // Desktop fallback: open in new tab for right-click save
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 30000);
            }
        });

        // Close
        const close = () => {
            overlay.classList.remove('visible');
            setTimeout(() => overlay.remove(), 300);
        };
        overlay.querySelector('.share-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });
    }

    async renderShareImage(canvas, thought) {
        const W = 1080;
        const PAD = 72;
        const IMG_H = 1080;
        const ctx = canvas.getContext('2d');

        // Colors matching garden theme
        const BG = '#fdfcfb';
        const TEXT = '#3a3a3a';
        const TEXT_LIGHT = '#737373';
        const ACCENT = '#8b7355';

        // Load image first to measure total height
        const imgSrc = thought.image;
        let img = null;
        if (imgSrc) {
            img = await new Promise((resolve) => {
                const i = new Image();
                i.crossOrigin = 'anonymous';
                i.onload = () => resolve(i);
                i.onerror = () => resolve(null);
                // Use full image, not thumb
                i.src = imgSrc;
            });
        }

        // Measure text to determine canvas height
        // We'll use a temp canvas for measurement
        canvas.width = W;
        canvas.height = 2400; // temp
        ctx.textBaseline = 'top';

        // Title
        const titleFont = `500 42px "Noto Serif SC", "PingFang SC", serif`;
        const bodyFont = `300 26px "Noto Serif SC", "PingFang SC", serif`;
        const sigFont = `300 20px "Crimson Pro", "PingFang SC", serif`;

        // Title only, no body text
        const title = thought.title || '';

        ctx.font = titleFont;
        const titleLines = this.wrapText(ctx, title, W - PAD * 2);

        const textTop = (img ? IMG_H : 0) + 56;
        const titleH = titleLines.length * 56;
        const sigTop = textTop + titleH + 32;
        const totalH = sigTop + 30 + 56;

        // Set final canvas size
        canvas.width = W;
        canvas.height = totalH;
        ctx.textBaseline = 'top';

        // Background
        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, totalH);

        // Image
        if (img) {
            // Draw image covering 1080x1080
            const scale = Math.max(IMG_H / img.naturalHeight, W / img.naturalWidth);
            const sw = img.naturalWidth * scale;
            const sh = img.naturalHeight * scale;
            const sx = (W - sw) / 2;
            const sy = (IMG_H - sh) / 2;
            ctx.drawImage(img, sx, sy, sw, sh);
        }

        // Title
        ctx.fillStyle = ACCENT;
        ctx.font = titleFont;
        titleLines.forEach((line, i) => {
            ctx.fillText(line, PAD, textTop + i * 56);
        });

        // Signature (no body text)
        ctx.fillStyle = TEXT_LIGHT;
        ctx.font = sigFont;
        ctx.fillText('🐱 刘鼻涕 · liubiti.garden', PAD, sigTop);

        // Subtle top line on text area
        if (img) {
            ctx.strokeStyle = '#e8e4df';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(PAD, textTop - 24);
            ctx.lineTo(W - PAD, textTop - 24);
            ctx.stroke();
        }
    }

    wrapText(ctx, text, maxWidth) {
        const lines = [];
        // Split on explicit newlines first
        const paragraphs = text.split('\n');
        for (const para of paragraphs) {
            if (!para.trim()) { lines.push(''); continue; }
            let currentLine = '';
            for (const char of para) {
                const testLine = currentLine + char;
                const metrics = ctx.measureText(testLine);
                if (metrics.width > maxWidth && currentLine) {
                    lines.push(currentLine);
                    currentLine = char;
                } else {
                    currentLine = testLine;
                }
            }
            if (currentLine) lines.push(currentLine);
        }
        return lines;
    }
}

document.addEventListener('DOMContentLoaded', () => new Garden());
