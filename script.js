// 刘鼻涕的思考花园 - 简化交互版本
// 顶部 Tab + 底部日期导航

class Garden {
    constructor() {
        this.init();
    }
    
    init() {
        // 顶部 Tab 切换
        this.initTopTabs();
        
        // 底部日期导航
        this.initDateNav();
        
        // 页面加载动画
        this.initPageAnimation();
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
