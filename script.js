// 刘鼻涕的思考花园 - 简化版本（去掉顶部 tab）

class Garden {
    constructor() {
        this.thoughts = [];
        this.currentThought = null;
        this.init();
    }
    
    async init() {
        // 加载数据
        await this.loadThoughts();
        
        // 渲染卡片和导航
        this.renderCards();
        this.renderDateNav();
        
        // 初始化交互
        this.initDateNav();
        this.initPageAnimation();
        
        // 默认激活最新的卡片
        this.activateLatest();
    }
    
    async loadThoughts() {
        try {
            const response = await fetch('thoughts.json');
            const data = await response.json();
            this.thoughts = data.thoughts;
        } catch (error) {
            console.error('Failed to load thoughts:', error);
            this.thoughts = [];
        }
    }
    
    renderCards() {
        const container = document.querySelector('.card-display');
        if (!container) return;
        
        container.innerHTML = this.thoughts.map(thought => this.createCardHTML(thought)).join('');
    }
    
    createCardHTML(thought) {
        const contentHTML = thought.content.map(item => {
            if (typeof item === 'string') {
                return `<p class="card-text">${item}</p>`;
            }
            
            if (item.type === 'insight') {
                const text = item.text.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
                return `<p class="card-insight">${text}</p>`;
            }
            
            if (item.type === 'quote') {
                const text = item.text.replace(/\\n/g, '<br>').replace(/\n/g, '<br>');
                return `<blockquote class="card-blockquote">${text}</blockquote>`;
            }
            
            if (item.type === 'list') {
                const listItems = item.items.map(li => `<li>${li}</li>`).join('');
                return `<ul class="card-list">${listItems}</ul>`;
            }
            
            return '';
        }).join('');
        
        const coverImageHTML = thought.coverImage 
            ? `<img src="${thought.coverImage}" alt="${thought.title}" class="card-cover">` 
            : '';
        
        return `
            <article class="thought-card" data-date="${thought.id}">
                <time class="card-date">${thought.dateLabel}</time>
                <h2 class="card-title">${thought.title}</h2>
                ${coverImageHTML}
                <div class="card-content">
                    ${contentHTML}
                </div>
                <span class="card-tag">${thought.tag}</span>
            </article>
        `;
    }
    
    renderDateNav() {
        const nav = document.querySelector('.date-nav');
        if (!nav) return;
        
        // 日期按钮
        const dateButtons = this.thoughts.map(thought => {
            const dateShort = thought.dateLabel.split('·')[0].trim().replace('2026 年 ', '');
            const titleShort = thought.title.length > 15 ? thought.title.substring(0, 15) + '...' : thought.title;
            
            return `
                <button class="date-btn" data-date="${thought.id}">
                    <span class="date-label">${dateShort}</span>
                    <span class="date-title">${titleShort}</span>
                </button>
            `;
        }).join('');
        
        // 添加"关于"按钮
        const aboutButton = `
            <button class="date-btn about-btn" data-page="about">
                <span class="date-title">关于</span>
            </button>
        `;
        
        nav.innerHTML = dateButtons + aboutButton;
    }
    
    initDateNav() {
        const dateBtns = document.querySelectorAll('.date-btn');
        const cards = document.querySelectorAll('.thought-card');
        const cardDisplay = document.querySelector('.card-display');
        const aboutPage = document.querySelector('.about-page');
        
        dateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                // 如果是"关于"按钮
                if (btn.dataset.page === 'about') {
                    // 移除所有日期按钮的激活状态
                    dateBtns.forEach(b => b.classList.remove('active'));
                    cards.forEach(c => c.classList.remove('active'));
                    
                    // 激活"关于"按钮
                    btn.classList.add('active');
                    
                    // 隐藏卡片显示区域，显示关于页面
                    cardDisplay.style.display = 'none';
                    aboutPage.classList.add('active');
                    
                    return;
                }
                
                // 如果是日期按钮
                const targetDate = btn.dataset.date;
                
                // 显示卡片显示区域，隐藏关于页面
                cardDisplay.style.display = 'block';
                aboutPage.classList.remove('active');
                
                // 移除所有激活状态
                dateBtns.forEach(b => b.classList.remove('active'));
                cards.forEach(c => c.classList.remove('active'));
                
                // 激活当前日期和卡片
                btn.classList.add('active');
                const targetCard = document.querySelector(`.thought-card[data-date="${targetDate}"]`);
                if (targetCard) {
                    targetCard.classList.add('active');
                    
                    // 滚动到卡片顶部
                    cardDisplay.scrollTo({
                        top: targetCard.offsetTop - 20,
                        behavior: 'smooth'
                    });
                }
                
                // 滚动日期导航到当前按钮
                btn.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
            });
        });
    }
    
    activateLatest() {
        // 默认激活第一个（最新的）卡片和日期
        const firstCard = document.querySelector('.thought-card');
        const firstBtn = document.querySelector('.date-btn');
        
        if (firstCard && firstBtn) {
            firstCard.classList.add('active');
            firstBtn.classList.add('active');
        }
    }
    
    initPageAnimation() {
        document.body.style.opacity = '0';
        setTimeout(() => {
            document.body.style.transition = 'opacity 0.4s ease';
            document.body.style.opacity = '1';
        }, 100);
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new Garden();
});
