// 刘鼻涕的思考花园 - 卡片轮播交互
// 优雅的动效，支持触摸、鼠标、键盘操作

class CardSlider {
    constructor() {
        this.track = document.querySelector('.cards-track');
        this.cards = Array.from(document.querySelectorAll('.thought-card'));
        this.dots = Array.from(document.querySelectorAll('.dot'));
        this.prevBtn = document.querySelector('.nav-button.prev');
        this.nextBtn = document.querySelector('.nav-button.next');
        this.currentIndex = 0;
        this.totalCards = this.cards.length;
        
        this.init();
    }
    
    init() {
        // 初始化第一张卡片为激活状态
        this.updateCards();
        
        // 按钮事件
        this.prevBtn.addEventListener('click', () => this.prev());
        this.nextBtn.addEventListener('click', () => this.next());
        
        // 导航点事件
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', () => this.goTo(index));
        });
        
        // 键盘导航
        document.addEventListener('keydown', (e) => {
            if (e.key === 'ArrowLeft') this.prev();
            if (e.key === 'ArrowRight') this.next();
        });
        
        // 触摸滑动
        this.setupTouch();
        
        // 鼠标滚轮（可选）
        this.setupWheel();
    }
    
    prev() {
        if (this.currentIndex > 0) {
            this.goTo(this.currentIndex - 1);
        }
    }
    
    next() {
        if (this.currentIndex < this.totalCards - 1) {
            this.goTo(this.currentIndex + 1);
        }
    }
    
    goTo(index) {
        this.currentIndex = index;
        this.updateCards();
    }
    
    updateCards() {
        // 移动轨道
        const offset = -this.currentIndex * 100;
        this.track.style.transform = `translateX(${offset}%)`;
        
        // 更新卡片激活状态
        this.cards.forEach((card, index) => {
            if (index === this.currentIndex) {
                card.classList.add('active');
            } else {
                card.classList.remove('active');
            }
        });
        
        // 更新导航点
        this.dots.forEach((dot, index) => {
            if (index === this.currentIndex) {
                dot.classList.add('active');
            } else {
                dot.classList.remove('active');
            }
        });
        
        // 更新计数器
        document.querySelector('.current-card').textContent = this.currentIndex + 1;
        
        // 更新按钮状态
        this.prevBtn.style.opacity = this.currentIndex === 0 ? '0.3' : '1';
        this.nextBtn.style.opacity = this.currentIndex === this.totalCards - 1 ? '0.3' : '1';
        this.prevBtn.style.cursor = this.currentIndex === 0 ? 'not-allowed' : 'pointer';
        this.nextBtn.style.cursor = this.currentIndex === this.totalCards - 1 ? 'not-allowed' : 'pointer';
    }
    
    setupTouch() {
        let startX = 0;
        let currentX = 0;
        let isDragging = false;
        
        this.track.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
        });
        
        this.track.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            currentX = e.touches[0].clientX;
        });
        
        this.track.addEventListener('touchend', () => {
            if (!isDragging) return;
            isDragging = false;
            
            const diff = startX - currentX;
            const threshold = 50; // 最小滑动距离
            
            if (Math.abs(diff) > threshold) {
                if (diff > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            }
        });
        
        // 鼠标拖拽（桌面端）
        let mouseDown = false;
        
        this.track.addEventListener('mousedown', (e) => {
            startX = e.clientX;
            mouseDown = true;
            this.track.style.cursor = 'grabbing';
        });
        
        document.addEventListener('mousemove', (e) => {
            if (!mouseDown) return;
            currentX = e.clientX;
        });
        
        document.addEventListener('mouseup', () => {
            if (!mouseDown) return;
            mouseDown = false;
            this.track.style.cursor = 'grab';
            
            const diff = startX - currentX;
            const threshold = 50;
            
            if (Math.abs(diff) > threshold) {
                if (diff > 0) {
                    this.next();
                } else {
                    this.prev();
                }
            }
        });
    }
    
    setupWheel() {
        let wheelTimeout;
        
        this.track.addEventListener('wheel', (e) => {
            e.preventDefault();
            
            // 防抖：避免滚轮触发过快
            clearTimeout(wheelTimeout);
            
            wheelTimeout = setTimeout(() => {
                if (e.deltaY > 0) {
                    this.next();
                } else if (e.deltaY < 0) {
                    this.prev();
                }
            }, 50);
        }, { passive: false });
    }
}

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    new CardSlider();
    
    // 添加加载动画
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.6s ease';
        document.body.style.opacity = '1';
    }, 100);
});
