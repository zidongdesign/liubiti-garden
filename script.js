// 刘鼻涕的思考花园 v3 — 底部 Tab Bar + 无限滚动

class Garden {
    constructor() {
        this.thoughts = [];
        this.rendered = 0;
        this.batchSize = 10;
        this.loading = false;
        this.init();
    }

    async init() {
        await this.loadThoughts();
        this.initObserver();
        this.renderBatch();
        this.initInfiniteScroll();
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

    // ===== 渲染一批卡片 =====

    renderBatch() {
        const container = document.querySelector('.card-stream');
        if (!container) return;

        const end = Math.min(this.rendered + this.batchSize, this.thoughts.length);
        let html = '';
        let lastMonth = null;

        // Find last rendered month for continuity
        if (this.rendered > 0) {
            lastMonth = this.monthKey(this.thoughts[this.rendered - 1]);
        }

        for (let i = this.rendered; i < end; i++) {
            const t = this.thoughts[i];
            const mk = this.monthKey(t);
            if (mk !== lastMonth) {
                lastMonth = mk;
                html += `<div class="month-divider" id="month-${mk}">${this.monthLabel(mk)}</div>`;
            }
            html += this.createCardHTML(t);
        }

        // Remove old sentinel if exists
        const oldSentinel = container.querySelector('.load-sentinel');
        if (oldSentinel) oldSentinel.remove();

        container.insertAdjacentHTML('beforeend', html);
        this.rendered = end;

        // Add sentinel for next batch
        if (this.rendered < this.thoughts.length) {
            const sentinel = document.createElement('div');
            sentinel.className = 'load-sentinel';
            container.appendChild(sentinel);
        }

        // Init observers for new cards
        this.observeNewCards();
    }

    createCardHTML(t) {
        const date = this.formatDate(t);
        const title = t.title || (t.text ? t.text.split(/[。．.!！?？\n]/)[0].slice(0, 60) : t.id);
        const subtitle = t.subtitle ? `<p class="card-subtitle">${t.subtitle}</p>` : '';
        const imgSrc = t.image || t.coverImage;
        const thumbSrc = imgSrc ? imgSrc.replace('images/', 'images/thumbs/').replace(/\.png$/, '.webp') : null;
        const image = imgSrc
            ? `<img src="${thumbSrc}" alt="${title}" class="card-cover" loading="lazy" onerror="this.onerror=null;this.src='${imgSrc}'">`
            : '';

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

    // ===== 无限滚动 =====

    initInfiniteScroll() {
        const observer = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting && !this.loading && this.rendered < this.thoughts.length) {
                this.loading = true;
                this.renderBatch();
                this.loading = false;
            }
        }, { rootMargin: '400px' });

        // Observe sentinel when it appears
        const mo = new MutationObserver(() => {
            const sentinel = document.querySelector('.load-sentinel');
            if (sentinel) {
                observer.disconnect();
                observer.observe(sentinel);
            }
        });
        mo.observe(document.querySelector('.card-stream'), { childList: true });

        // Observe initial sentinel
        const sentinel = document.querySelector('.load-sentinel');
        if (sentinel) observer.observe(sentinel);
    }

    // ===== Intersection Observer (fade in cards + images) =====

    initObserver() {
        this.cardObs = new IntersectionObserver((entries) => {
            entries.forEach(e => {
                if (e.isIntersecting) {
                    e.target.classList.add('visible');
                    this.cardObs.unobserve(e.target);
                }
            });
        }, { threshold: 0.1 });
    }

    observeNewCards() {
        document.querySelectorAll('.thought-card:not(.observed)').forEach(card => {
            card.classList.add('observed');
            this.cardObs.observe(card);
        });

        // Fade in cover images on load
        document.querySelectorAll('img.card-cover:not(.listen)').forEach(img => {
            img.classList.add('listen');
            if (img.complete) {
                img.classList.add('loaded');
            } else {
                img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
                img.addEventListener('error', () => img.classList.add('loaded'), { once: true });
            }
        });
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

    // ===== 点击图片分享 =====

    initShareCard() {
        const getThought = (cardEl) => {
            const id = cardEl.id.replace('card-', '');
            return this.thoughts.find(t => t.id === id);
        };

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

        overlay.querySelector('.share-save').addEventListener('click', async () => {
            const blob = await new Promise(r => canvas.toBlob(r, 'image/png'));
            const file = new File([blob], `${thought.id || 'share'}.png`, { type: 'image/png' });

            if (navigator.canShare && navigator.canShare({ files: [file] })) {
                try {
                    await navigator.share({ files: [file] });
                } catch (e) { /* user cancelled */ }
            } else {
                const url = URL.createObjectURL(blob);
                window.open(url, '_blank');
                setTimeout(() => URL.revokeObjectURL(url), 30000);
            }
        });

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

        const BG = '#fdfcfb';
        const TEXT_LIGHT = '#737373';
        const ACCENT = '#8b7355';

        const imgSrc = thought.image;
        let img = null;
        if (imgSrc) {
            img = await new Promise((resolve) => {
                const i = new Image();
                i.crossOrigin = 'anonymous';
                i.onload = () => resolve(i);
                i.onerror = () => resolve(null);
                i.src = imgSrc;
            });
        }

        canvas.width = W;
        canvas.height = 2400;
        ctx.textBaseline = 'top';

        const titleFont = `500 42px "Noto Serif SC", "PingFang SC", serif`;
        const sigFont = `300 20px "Crimson Pro", "PingFang SC", serif`;

        const title = thought.title || '';

        ctx.font = titleFont;
        const titleLines = this.wrapText(ctx, title, W - PAD * 2);

        const textTop = (img ? IMG_H : 0) + 56;
        const titleH = titleLines.length * 56;
        const sigTop = textTop + titleH + 32;
        const totalH = sigTop + 30 + 56;

        canvas.width = W;
        canvas.height = totalH;
        ctx.textBaseline = 'top';

        ctx.fillStyle = BG;
        ctx.fillRect(0, 0, W, totalH);

        if (img) {
            const scale = Math.max(IMG_H / img.naturalHeight, W / img.naturalWidth);
            const sw = img.naturalWidth * scale;
            const sh = img.naturalHeight * scale;
            const sx = (W - sw) / 2;
            const sy = (IMG_H - sh) / 2;
            ctx.drawImage(img, sx, sy, sw, sh);
        }

        ctx.fillStyle = ACCENT;
        ctx.font = titleFont;
        titleLines.forEach((line, i) => {
            ctx.fillText(line, PAD, textTop + i * 56);
        });

        ctx.fillStyle = TEXT_LIGHT;
        ctx.font = sigFont;
        ctx.fillText('🐱 刘鼻涕 · liubiti.garden', PAD, sigTop);

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
