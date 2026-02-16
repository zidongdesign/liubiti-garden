// 刘鼻涕的思考花园 - 数据驱动版本
// JSON 数据 + 动态渲染

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
        this.initTopTabs();
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
                return `<p class="card-insight">${item.text}</p>`;
            }
            
            if (item.type === 'quote') {
                return `<blockquote class="card-blockquote">${item.text}</blockquote>`;
            }
            
            if (item.type === 'list') {
                const listItems = item.items.map(li => `<li>${li}</li>`).join('');
                return `<ul class="card-list">${listItems}</ul>`;
            }
            
            return '';
        }).join('');
        
        return `
            <article class="thought-card" data-date="${thought.id}">
                <time class="card-date">${thought.dateLabel}</time>
                <h2 class="card-title">${thought.title}</h2>
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
        
        nav.innerHTML = this.thoughts.map(thought => {
            const dateShort = thought.dateLabel.split('·')[0].trim().replace('2026 年 ', '');
            const titleShort = thought.title.length > 15 ? thought.title.substring(0, 15) + '...' : thought.title;
            
            return `
                <button class="date-btn" data-date="${thought.id}">
                    <span class="date-label">${dateShort}</span>
                    <span class="date-title">${titleShort}</span>
                </button>
            `;
        }).join('');
    }
    
    initTopTabs() {
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetTab = btn.dataset.tab;
                
                // 移除所有激活状态
                tabBtns.forEach(b => b.classList.remove('active'));
                tabContents.forEach(c => c.classList.remove('active'));
                
                // 激活当前 Tab
                btn.classList.add('active');
                document.getElementById(`${targetTab}-tab`).classList.add('active');
            });
        });
    }
    
    initDateNav() {
        const dateBtns = document.querySelectorAll('.date-btn');
        const cards = document.querySelectorAll('.thought-card');
        const tabContent = document.getElementById('cards-tab');
        
        dateBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                const targetDate = btn.dataset.date;
                
                // 移除所有激活状态
                dateBtns.forEach(b => b.classList.remove('active'));
                cards.forEach(c => c.classList.remove('active'));
                
                // 激活当前日期和卡片
                btn.classList.add('active');
                const targetCard = document.querySelector(`.thought-card[data-date="${targetDate}"]`);
                if (targetCard) {
                    targetCard.classList.add('active');
                    
                    // 滚动到卡片顶部（在 tab-content 内部滚动）
                    tabContent.scrollTo({
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
