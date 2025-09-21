/**
 * 统一的帖子展示组件
 * 提供优化的帖子展示功能，包括懒加载、无限滚动、搜索过滤等
 */

class PostDisplay {
  constructor(container, options = {}) {
    this.container = container;
    this.options = {
      category: options.category || 'all',
      searchEnabled: options.searchEnabled !== false,
      infiniteScroll: options.infiniteScroll !== false,
      lazyLoad: options.lazyLoad !== false,
      masonry: options.masonry || false,
      itemsPerPage: options.itemsPerPage || 12,
      ...options
    };
    
    this.posts = [];
    this.filteredPosts = [];
    this.currentPage = 1;
    this.isLoading = false;
    this.hasMore = true;
    this.searchQuery = '';
    
    this.init();
  }

  // 初始化组件
  init() {
    this.createHTML();
    this.bindEvents();
    this.loadPosts();
  }

  // 创建HTML结构
  createHTML() {
    this.container.innerHTML = `
      <div class="post-display-container">
        ${this.options.searchEnabled ? this.createSearchBar() : ''}
        <div class="post-filters" id="postFilters">
          <div class="filter-tabs">
            <button class="filter-tab active" data-category="all">全部</button>
            <button class="filter-tab" data-category="life">生活</button>
            <button class="filter-tab" data-category="study">学习</button>
            <button class="filter-tab" data-category="enroll">入学</button>
            <button class="filter-tab" data-category="share">分享</button>
            <button class="filter-tab" data-category="fun">娱乐</button>
          </div>
          <div class="sort-options">
            <select id="sortSelect" class="sort-select">
              <option value="newest">最新发布</option>
              <option value="oldest">最早发布</option>
              <option value="popular">最受欢迎</option>
              <option value="pinned">置顶优先</option>
            </select>
          </div>
        </div>
        <div class="posts-grid ${this.options.masonry ? 'masonry' : 'grid'}" id="postsGrid">
          <div class="loading-indicator" id="loadingIndicator" style="display: none;">
            <div class="loading-spinner"></div>
            <span>加载中...</span>
          </div>
        </div>
        <div class="load-more-container" id="loadMoreContainer" style="display: none;">
          <button class="load-more-btn" id="loadMoreBtn">加载更多</button>
        </div>
        <div class="no-posts-message" id="noPostsMessage" style="display: none;">
          <div class="no-posts-icon">📝</div>
          <p>暂无帖子</p>
          <button class="create-post-btn" onclick="window.location.href='publish.html'">发布第一个帖子</button>
        </div>
      </div>
    `;
    
    this.addStyles();
  }

  // 创建搜索栏
  createSearchBar() {
    return `
      <div class="search-container">
        <div class="search-box">
          <input type="text" id="searchInput" placeholder="搜索帖子..." autocomplete="off">
          <button id="searchBtn" class="search-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
            </svg>
          </button>
        </div>
        <div class="search-suggestions" id="searchSuggestions" style="display: none;"></div>
      </div>
    `;
  }

  // 添加样式
  addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .post-display-container {
        width: 100%;
        max-width: 1200px;
        margin: 0 auto;
        padding: 20px;
      }

      .search-container {
        margin-bottom: 20px;
        position: relative;
      }

      .search-box {
        display: flex;
        gap: 10px;
        background: white;
        border-radius: 12px;
        padding: 4px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      }

      .search-box input {
        flex: 1;
        border: none;
        outline: none;
        padding: 12px 16px;
        font-size: 16px;
        border-radius: 8px;
      }

      .search-btn {
        background: var(--accent, #16a34a);
        border: none;
        border-radius: 8px;
        padding: 12px 16px;
        color: white;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .search-btn:hover {
        background: #15803d;
      }

      .post-filters {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 20px;
        flex-wrap: wrap;
        gap: 15px;
      }

      .filter-tabs {
        display: flex;
        gap: 8px;
        flex-wrap: wrap;
      }

      .filter-tab {
        padding: 8px 16px;
        border: 1px solid var(--border, #e5e7eb);
        background: white;
        border-radius: 20px;
        cursor: pointer;
        font-weight: 500;
        transition: all 0.2s;
        white-space: nowrap;
      }

      .filter-tab:hover {
        background: #f3f4f6;
        transform: translateY(-1px);
      }

      .filter-tab.active {
        background: var(--accent, #16a34a);
        color: white;
        border-color: var(--accent, #16a34a);
      }

      .sort-options {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      .sort-select {
        padding: 8px 12px;
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 8px;
        background: white;
        font-size: 14px;
        cursor: pointer;
      }

      .posts-grid {
        display: grid;
        gap: 20px;
        margin-bottom: 30px;
      }

      .posts-grid.grid {
        grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      }

      .posts-grid.masonry {
        grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      }

      .post-card {
        background: white;
        border-radius: 16px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        overflow: hidden;
        transition: all 0.3s ease;
        cursor: pointer;
        position: relative;
      }

      .post-card:hover {
        transform: translateY(-4px);
        box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      }

      .post-card.pinned {
        border: 2px solid var(--accent, #16a34a);
        position: relative;
      }

      .post-card.pinned::before {
        content: '📌';
        position: absolute;
        top: 10px;
        right: 10px;
        background: var(--accent, #16a34a);
        color: white;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        z-index: 1;
      }

      .post-image {
        width: 100%;
        height: 200px;
        object-fit: cover;
        background: #f3f4f6;
      }

      .post-content {
        padding: 16px;
      }

      .post-header {
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 12px;
      }

      .post-avatar {
        width: 40px;
        height: 40px;
        border-radius: 50%;
        object-fit: cover;
        border: 2px solid #f3f4f6;
      }

      .post-author {
        flex: 1;
      }

      .post-author-name {
        font-weight: 600;
        font-size: 14px;
        color: #111827;
        margin: 0;
      }

      .post-meta {
        font-size: 12px;
        color: #6b7280;
        margin: 2px 0 0 0;
      }

      .post-category {
        background: #f3f4f6;
        color: #374151;
        padding: 4px 8px;
        border-radius: 12px;
        font-size: 12px;
        font-weight: 500;
      }

      .post-title {
        font-size: 18px;
        font-weight: 700;
        color: #111827;
        margin: 0 0 8px 0;
        line-height: 1.4;
        display: -webkit-box;
        -webkit-line-clamp: 2;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .post-description {
        color: #6b7280;
        font-size: 14px;
        line-height: 1.6;
        margin: 0 0 12px 0;
        display: -webkit-box;
        -webkit-line-clamp: 3;
        -webkit-box-orient: vertical;
        overflow: hidden;
      }

      .post-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding-top: 12px;
        border-top: 1px solid #f3f4f6;
      }

      .post-stats {
        display: flex;
        gap: 16px;
        font-size: 12px;
        color: #6b7280;
      }

      .post-stat {
        display: flex;
        align-items: center;
        gap: 4px;
      }

      .post-actions-right {
        display: flex;
        gap: 8px;
      }

      .action-btn {
        background: none;
        border: none;
        padding: 6px;
        border-radius: 6px;
        cursor: pointer;
        color: #6b7280;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .action-btn:hover {
        background: #f3f4f6;
        color: #374151;
      }

      .loading-indicator {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 12px;
        padding: 40px;
        color: #6b7280;
      }

      .loading-spinner {
        width: 32px;
        height: 32px;
        border: 3px solid #f3f4f6;
        border-top: 3px solid var(--accent, #16a34a);
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }

      @keyframes spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }

      .load-more-container {
        text-align: center;
        padding: 20px;
      }

      .load-more-btn {
        background: var(--accent, #16a34a);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        transition: background 0.2s;
      }

      .load-more-btn:hover {
        background: #15803d;
      }

      .no-posts-message {
        text-align: center;
        padding: 60px 20px;
        color: #6b7280;
      }

      .no-posts-icon {
        font-size: 48px;
        margin-bottom: 16px;
      }

      .create-post-btn {
        background: var(--accent, #16a34a);
        color: white;
        border: none;
        padding: 12px 24px;
        border-radius: 8px;
        font-weight: 600;
        cursor: pointer;
        margin-top: 16px;
        transition: background 0.2s;
      }

      .create-post-btn:hover {
        background: #15803d;
      }

      .search-suggestions {
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid var(--border, #e5e7eb);
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
      }

      .suggestion-item {
        padding: 12px 16px;
        cursor: pointer;
        border-bottom: 1px solid #f3f4f6;
        transition: background 0.2s;
      }

      .suggestion-item:hover {
        background: #f9fafb;
      }

      .suggestion-item:last-child {
        border-bottom: none;
      }

      /* 移动端优化 */
      @media (max-width: 768px) {
        .post-display-container {
          padding: 15px;
        }

        .posts-grid.grid {
          grid-template-columns: 1fr;
        }

        .posts-grid.masonry {
          grid-template-columns: 1fr;
        }

        .post-filters {
          flex-direction: column;
          align-items: stretch;
        }

        .filter-tabs {
          justify-content: center;
        }

        .post-card {
          margin-bottom: 15px;
        }

        .post-title {
          font-size: 16px;
        }

        .post-description {
          font-size: 13px;
        }
      }

      /* 平板端优化 */
      @media (min-width: 769px) and (max-width: 1024px) {
        .posts-grid.grid {
          grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
        }

        .posts-grid.masonry {
          grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
        }
      }
    `;
    
    document.head.appendChild(style);
  }

  // 绑定事件
  bindEvents() {
    // 搜索功能
    if (this.options.searchEnabled) {
      const searchInput = this.container.querySelector('#searchInput');
      const searchBtn = this.container.querySelector('#searchBtn');
      
      searchInput.addEventListener('input', this.debounce((e) => {
        this.searchQuery = e.target.value;
        this.filterPosts();
      }, 300));
      
      searchBtn.addEventListener('click', () => {
        this.searchQuery = searchInput.value;
        this.filterPosts();
      });
    }

    // 分类过滤
    this.container.querySelectorAll('.filter-tab').forEach(tab => {
      tab.addEventListener('click', (e) => {
        this.container.querySelectorAll('.filter-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        this.options.category = e.target.dataset.category;
        this.filterPosts();
      });
    });

    // 排序功能
    const sortSelect = this.container.querySelector('#sortSelect');
    sortSelect.addEventListener('change', (e) => {
      this.sortPosts(e.target.value);
    });

    // 无限滚动
    if (this.options.infiniteScroll) {
      window.addEventListener('scroll', this.debounce(() => {
        if (this.isNearBottom() && !this.isLoading && this.hasMore) {
          this.loadMorePosts();
        }
      }, 100));
    }

    // 加载更多按钮
    const loadMoreBtn = this.container.querySelector('#loadMoreBtn');
    loadMoreBtn.addEventListener('click', () => {
      this.loadMorePosts();
    });
  }

  // 加载帖子
  async loadPosts() {
    this.showLoading();
    
    try {
      const response = await fetch(`/api/posts?category=${this.options.category}&page=${this.currentPage}&limit=${this.options.itemsPerPage}`);
      const data = await response.json();
      
      if (response.ok) {
        if (this.currentPage === 1) {
          this.posts = data.posts || data;
        } else {
          this.posts = [...this.posts, ...(data.posts || data)];
        }
        
        this.hasMore = data.pagination ? data.pagination.hasNext : false;
        this.filteredPosts = [...this.posts];
        this.renderPosts();
      } else {
        throw new Error(data.msg || '加载失败');
      }
    } catch (error) {
      console.error('加载帖子失败:', error);
      this.showError('加载帖子失败，请刷新页面重试');
    } finally {
      this.hideLoading();
    }
  }

  // 加载更多帖子
  async loadMorePosts() {
    if (this.isLoading || !this.hasMore) return;
    
    this.isLoading = true;
    this.currentPage++;
    
    try {
      await this.loadPosts();
    } finally {
      this.isLoading = false;
    }
  }

  // 过滤帖子
  filterPosts() {
    let filtered = [...this.posts];
    
    // 按分类过滤
    if (this.options.category !== 'all') {
      filtered = filtered.filter(post => post.category === this.options.category);
    }
    
    // 按搜索关键词过滤
    if (this.searchQuery.trim()) {
      const query = this.searchQuery.toLowerCase();
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(query) ||
        post.content?.toLowerCase().includes(query) ||
        post.desc?.toLowerCase().includes(query) ||
        post.authorName?.toLowerCase().includes(query)
      );
    }
    
    this.filteredPosts = filtered;
    this.renderPosts();
  }

  // 排序帖子
  sortPosts(sortBy) {
    const sorted = [...this.filteredPosts];
    
    switch (sortBy) {
      case 'newest':
        sorted.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case 'oldest':
        sorted.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
        break;
      case 'popular':
        sorted.sort((a, b) => (b.likes || 0) - (a.likes || 0));
        break;
      case 'pinned':
        sorted.sort((a, b) => {
          if (a.pinned && !b.pinned) return -1;
          if (!a.pinned && b.pinned) return 1;
          return new Date(b.createdAt) - new Date(a.createdAt);
        });
        break;
    }
    
    this.filteredPosts = sorted;
    this.renderPosts();
  }

  // 渲染帖子
  renderPosts() {
    const grid = this.container.querySelector('#postsGrid');
    const loadMoreContainer = this.container.querySelector('#loadMoreContainer');
    const noPostsMessage = this.container.querySelector('#noPostsMessage');
    
    // 清空现有内容（保留加载指示器）
    const loadingIndicator = grid.querySelector('.loading-indicator');
    grid.innerHTML = '';
    if (loadingIndicator) {
      grid.appendChild(loadingIndicator);
    }
    
    if (this.filteredPosts.length === 0) {
      noPostsMessage.style.display = 'block';
      loadMoreContainer.style.display = 'none';
      return;
    }
    
    noPostsMessage.style.display = 'none';
    
    // 渲染帖子卡片
    this.filteredPosts.forEach(post => {
      const postCard = this.createPostCard(post);
      grid.appendChild(postCard);
    });
    
    // 显示加载更多按钮
    if (this.hasMore && !this.options.infiniteScroll) {
      loadMoreContainer.style.display = 'block';
    } else {
      loadMoreContainer.style.display = 'none';
    }
  }

  // 创建帖子卡片
  createPostCard(post) {
    const card = document.createElement('div');
    card.className = `post-card ${post.pinned ? 'pinned' : ''}`;
    card.onclick = () => this.openPost(post);
    
    const imageHtml = post.images && post.images.length > 0 
      ? `<img src="${post.images[0]}" alt="${post.title}" class="post-image" loading="lazy">`
      : `<div class="post-image" style="background: linear-gradient(135deg, #f3f4f6, #e5e7eb); display: flex; align-items: center; justify-content: center; color: #9ca3af; font-size: 24px;">📝</div>`;
    
    const authorName = post.authorName || post.author?.nickname || '匿名用户';
    const authorAvatar = post.authorAvatar || post.author?.avatarPath || '/your-avatar.png';
    const content = post.content || post.desc || '';
    const categoryMap = {
      'life': '生活',
      'study': '学习', 
      'enroll': '入学',
      'share': '分享',
      'fun': '娱乐'
    };
    
    card.innerHTML = `
      ${imageHtml}
      <div class="post-content">
        <div class="post-header">
          <img src="${authorAvatar}" alt="${authorName}" class="post-avatar" loading="lazy">
          <div class="post-author">
            <h4 class="post-author-name">${authorName}</h4>
            <p class="post-meta">${this.formatDate(post.createdAt)}</p>
          </div>
          <span class="post-category">${categoryMap[post.category] || post.category}</span>
        </div>
        <h3 class="post-title">${post.title}</h3>
        <p class="post-description">${content}</p>
        <div class="post-actions">
          <div class="post-stats">
            <span class="post-stat">
              <span>👍</span>
              <span>${post.likes || 0}</span>
            </span>
            <span class="post-stat">
              <span>💬</span>
              <span>${post.comments || 0}</span>
            </span>
            <span class="post-stat">
              <span>👁</span>
              <span>${post.views || 0}</span>
            </span>
          </div>
          <div class="post-actions-right">
            <button class="action-btn" onclick="event.stopPropagation(); this.sharePost('${post.id}')" title="分享">
              <span>📤</span>
            </button>
            <button class="action-btn" onclick="event.stopPropagation(); this.likePost('${post.id}')" title="点赞">
              <span>👍</span>
            </button>
          </div>
        </div>
      </div>
    `;
    
    return card;
  }

  // 打开帖子详情
  openPost(post) {
    window.location.href = `post.html?id=${post.id}`;
  }

  // 格式化日期
  formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
    
    return date.toLocaleDateString('zh-CN');
  }

  // 显示加载状态
  showLoading() {
    const indicator = this.container.querySelector('#loadingIndicator');
    if (indicator) {
      indicator.style.display = 'flex';
    }
  }

  // 隐藏加载状态
  hideLoading() {
    const indicator = this.container.querySelector('#loadingIndicator');
    if (indicator) {
      indicator.style.display = 'none';
    }
  }

  // 显示错误信息
  showError(message) {
    const grid = this.container.querySelector('#postsGrid');
    grid.innerHTML = `
      <div class="error-message" style="text-align: center; padding: 40px; color: #ef4444;">
        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
        <p>${message}</p>
        <button onclick="location.reload()" style="margin-top: 16px; padding: 8px 16px; background: #ef4444; color: white; border: none; border-radius: 6px; cursor: pointer;">重试</button>
      </div>
    `;
  }

  // 检查是否接近底部
  isNearBottom() {
    return (window.innerHeight + window.scrollY) >= (document.body.offsetHeight - 1000);
  }

  // 防抖函数
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

  // 刷新帖子
  refresh() {
    this.currentPage = 1;
    this.posts = [];
    this.filteredPosts = [];
    this.hasMore = true;
    this.loadPosts();
  }

  // 销毁组件
  destroy() {
    this.container.innerHTML = '';
  }
}

// 全局函数
window.sharePost = function(postId) {
  if (navigator.share) {
    navigator.share({
      title: '查看这个帖子',
      url: `${window.location.origin}/post.html?id=${postId}`
    });
  } else {
    // 复制链接到剪贴板
    const url = `${window.location.origin}/post.html?id=${postId}`;
    navigator.clipboard.writeText(url).then(() => {
      alert('链接已复制到剪贴板');
    });
  }
};

window.likePost = function(postId) {
  // 这里可以添加点赞功能
  console.log('点赞帖子:', postId);
};

// 导出组件
if (typeof module !== 'undefined' && module.exports) {
  module.exports = PostDisplay;
}
