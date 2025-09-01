/**
 * 移动端优化工具函数
 */

// 移动端导航管理
class MobileNavigation {
  constructor() {
    this.hamburger = document.getElementById('hamburger');
    this.mobileSidebar = document.getElementById('mobileSidebar');
    this.mobileSidebarOverlay = document.getElementById('mobileSidebarOverlay');
    this.mobileNavLinks = document.querySelectorAll('.mobile-nav-link');
    this.isOpen = false;
    
    this.init();
  }
  
  init() {
    if (this.hamburger && this.mobileSidebar && this.mobileSidebarOverlay) {
      this.bindEvents();
    }
    
    if (this.mobileNavLinks.length > 0) {
      this.bindNavEvents();
    }
  }
  
  bindEvents() {
    // 汉堡菜单点击事件
    this.hamburger.addEventListener('click', () => {
      this.toggleSidebar();
    });
    
    // 点击遮罩关闭侧边栏
    this.mobileSidebarOverlay.addEventListener('click', () => {
      this.closeSidebar();
    });
    
    // ESC键关闭侧边栏
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.isOpen) {
        this.closeSidebar();
      }
    });
    
    // 触摸手势支持
    this.initTouchGestures();
  }
  
  bindNavEvents() {
    this.mobileNavLinks.forEach(link => {
      link.addEventListener('click', () => {
        // 移除所有active类
        this.mobileNavLinks.forEach(l => l.classList.remove('active'));
        // 添加active类到当前点击的链接
        link.classList.add('active');
      });
    });
  }
  
  toggleSidebar() {
    if (this.isOpen) {
      this.closeSidebar();
    } else {
      this.openSidebar();
    }
  }
  
  openSidebar() {
    this.hamburger.classList.add('active');
    this.mobileSidebar.classList.add('active');
    this.mobileSidebarOverlay.classList.add('active');
    document.body.style.overflow = 'hidden';
    this.isOpen = true;
    
    // 添加动画类
    this.mobileSidebar.style.transform = 'translateX(0)';
  }
  
  closeSidebar() {
    this.hamburger.classList.remove('active');
    this.mobileSidebar.classList.remove('active');
    this.mobileSidebarOverlay.classList.remove('active');
    document.body.style.overflow = '';
    this.isOpen = false;
    
    // 重置动画
    this.mobileSidebar.style.transform = 'translateX(-100%)';
  }
  
  initTouchGestures() {
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let currentY = 0;
    
    document.addEventListener('touchstart', (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchmove', (e) => {
      currentX = e.touches[0].clientX;
      currentY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', () => {
      const deltaX = currentX - startX;
      const deltaY = currentY - startY;
      const minSwipeDistance = 50;
      
      // 从左向右滑动打开侧边栏
      if (deltaX > minSwipeDistance && Math.abs(deltaY) < Math.abs(deltaX) && startX < 50) {
        if (!this.isOpen) {
          this.openSidebar();
        }
      }
      // 从右向左滑动关闭侧边栏
      else if (deltaX < -minSwipeDistance && Math.abs(deltaY) < Math.abs(deltaX) && this.isOpen) {
        this.closeSidebar();
      }
    });
  }
}

// 触摸优化工具
class TouchOptimizer {
  constructor() {
    this.init();
  }
  
  init() {
    this.preventZoom();
    this.optimizeScroll();
    this.addTouchFeedback();
  }
  
  // 防止双击缩放
  preventZoom() {
    let lastTouchEnd = 0;
    document.addEventListener('touchend', (event) => {
      const now = (new Date()).getTime();
      if (now - lastTouchEnd <= 300) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    }, false);
  }
  
  // 优化滚动体验
  optimizeScroll() {
    // 为可滚动元素添加平滑滚动
    const scrollElements = document.querySelectorAll('.scrollable, [data-scroll]');
    scrollElements.forEach(element => {
      element.style.webkitOverflowScrolling = 'touch';
      element.style.scrollBehavior = 'smooth';
    });
  }
  
  // 添加触摸反馈
  addTouchFeedback() {
    const touchElements = document.querySelectorAll('button, a, [role="button"], .touchable');
    touchElements.forEach(element => {
      element.addEventListener('touchstart', () => {
        element.style.transform = 'scale(0.98)';
      });
      
      element.addEventListener('touchend', () => {
        element.style.transform = 'scale(1)';
      });
    });
  }
}

// 响应式工具
class ResponsiveUtils {
  constructor() {
    this.currentBreakpoint = this.getBreakpoint();
    this.init();
  }
  
  init() {
    window.addEventListener('resize', this.debounce(() => {
      this.handleResize();
    }, 250));
    
    this.setupViewport();
  }
  
  getBreakpoint() {
    const width = window.innerWidth;
    if (width < 480) return 'xs';
    if (width < 768) return 'sm';
    if (width < 960) return 'md';
    if (width < 1200) return 'lg';
    return 'xl';
  }
  
  handleResize() {
    const newBreakpoint = this.getBreakpoint();
    if (newBreakpoint !== this.currentBreakpoint) {
      this.currentBreakpoint = newBreakpoint;
      this.onBreakpointChange(newBreakpoint);
    }
  }
  
  onBreakpointChange(breakpoint) {
    // 触发断点变化事件
    document.dispatchEvent(new CustomEvent('breakpointchange', {
      detail: { breakpoint }
    }));
    
    // 根据断点调整布局
    this.adjustLayout(breakpoint);
  }
  
  adjustLayout(breakpoint) {
    const container = document.querySelector('.container');
    if (!container) return;
    
    switch (breakpoint) {
      case 'xs':
      case 'sm':
        container.style.gridTemplateColumns = '1fr';
        container.style.gridTemplateRows = 'auto auto 1fr';
        break;
      case 'md':
        container.style.gridTemplateColumns = '1fr';
        container.style.gridTemplateRows = 'auto auto 1fr';
        break;
      default:
        container.style.gridTemplateColumns = '220px 1fr';
        container.style.gridTemplateRows = '220px 1fr';
    }
  }
  
  setupViewport() {
    // 设置视口meta标签
    let viewport = document.querySelector('meta[name="viewport"]');
    if (!viewport) {
      viewport = document.createElement('meta');
      viewport.name = 'viewport';
      document.head.appendChild(viewport);
    }
    
    // 根据设备设置合适的视口
    if (this.isMobile()) {
      viewport.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
    } else {
      viewport.content = 'width=device-width, initial-scale=1.0';
    }
  }
  
  isMobile() {
    return this.currentBreakpoint === 'xs' || this.currentBreakpoint === 'sm';
  }
  
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  }
}

// 性能优化工具
class PerformanceOptimizer {
  constructor() {
    this.init();
  }
  
  init() {
    this.lazyLoadImages();
    this.optimizeAnimations();
    this.addIntersectionObserver();
  }
  
  // 懒加载图片
  lazyLoadImages() {
    const images = document.querySelectorAll('img[data-src]');
    if ('IntersectionObserver' in window) {
      const imageObserver = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src;
            img.classList.remove('lazy');
            imageObserver.unobserve(img);
          }
        });
      });
      
      images.forEach(img => imageObserver.observe(img));
    }
  }
  
  // 优化动画性能
  optimizeAnimations() {
    const animatedElements = document.querySelectorAll('.animated, [data-animate]');
    animatedElements.forEach(element => {
      element.style.willChange = 'transform, opacity';
    });
  }
  
  // 添加交叉观察器
  addIntersectionObserver() {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('in-view');
          }
        });
      }, {
        threshold: 0.1
      });
      
      const elements = document.querySelectorAll('[data-observe]');
      elements.forEach(el => observer.observe(el));
    }
  }
}

// 初始化所有移动端优化功能
function initMobileOptimization() {
  // 等待DOM加载完成
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      new MobileNavigation();
      new TouchOptimizer();
      new ResponsiveUtils();
      new PerformanceOptimizer();
    });
  } else {
    new MobileNavigation();
    new TouchOptimizer();
    new ResponsiveUtils();
    new PerformanceOptimizer();
  }
}

// 导出工具类
window.MobileNavigation = MobileNavigation;
window.TouchOptimizer = TouchOptimizer;
window.ResponsiveUtils = ResponsiveUtils;
window.PerformanceOptimizer = PerformanceOptimizer;

// 自动初始化
initMobileOptimization();
