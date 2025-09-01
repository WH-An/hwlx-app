#!/usr/bin/env node

/**
 * 批量优化所有HTML页面的移动端体验
 * 使用方法: node optimize-all-pages.js
 */

const fs = require('fs');
const path = require('path');

// 需要优化的页面列表
const pagesToOptimize = [
  'enrollment-steps.html',
  'share.html',
  'fun.html',
  'hospital.html',
  'profile.html',
  'post.html',
  'publish.html',
  'messages.html',
  'register.html',
  'admin-login.html',
  'admin-profile.html',
  'admin-publish.html',
  'admin-posts.html',
  'admin-all.html'
];

// 移动端CSS引入模板
const mobileCSSTemplate = '  <!-- 移动端优化CSS -->\n  <link rel="stylesheet" href="mobile-optimization.css">\n  \n';

// 移动端导航模板
const mobileNavTemplate = `  <!-- 汉堡菜单按钮 -->
  <div class="hamburger" id="hamburger">
    <span></span>
    <span></span>
    <span></span>
  </div>

  <!-- 移动端侧边栏 -->
  <div class="mobile-sidebar" id="mobileSidebar">
    <a class="account-info" href="profile.html">
      <img src="https://raw.githubusercontent.com/WH-An/hwlx-app/2df4e97b395bebb7977074fbb31741f3c35da9a0/assets-task_01k3v2vy06fra8er06x602xnpe-1756476933_img_1.webp" alt="头像" class="avatar">
      <span class="username">我的账号</span>
    </a>
    <ul class="nav-list">
      <li><a href="main page.html"><span class="nav-icon">🏠</span><span>主页</span></a></li>
      <li><a href="life-tips.html"><span class="nav-icon">💡</span><span>生活小贴士</span></a></li>
      <li><a href="study-guide.html"><span class="nav-icon">📚</span><span>学习指导</span></a></li>
      <li><a href="enrollment-steps.html"><span class="nav-icon">📝</span><span>入学步骤</span></a></li>
      <li><a href="share.html"><span class="nav-icon">🔗</span><span>分享</span></a></li>
      <li><a href="fun.html"><span class="nav-icon">🎉</span><span>娱乐</span></a></li>
      <li><a href="hospital.html"><span class="nav-icon">🏥</span><span>医院</span></a></li>
    </ul>
  </div>

  <!-- 移动端侧边栏遮罩 -->
  <div class="mobile-sidebar-overlay" id="mobileSidebarOverlay"></div>

`;

// 移动端底部导航模板
const mobileBottomNavTemplate = `  <!-- 移动端底部导航 -->
  <nav class="mobile-nav">
    <ul class="mobile-nav-list">
      <li class="mobile-nav-item">
        <a href="main page.html" class="mobile-nav-link">
          <span class="mobile-nav-icon">🏠</span>
          <span>主页</span>
        </a>
      </li>
      <li class="mobile-nav-item">
        <a href="life-tips.html" class="mobile-nav-link">
          <span class="mobile-nav-icon">💡</span>
          <span>生活</span>
        </a>
      </li>
      <li class="mobile-nav-item">
        <a href="study-guide.html" class="mobile-nav-link">
          <span class="mobile-nav-icon">📚</span>
          <span>学习</span>
        </a>
      </li>
      <li class="mobile-nav-item">
        <a href="enrollment-steps.html" class="mobile-nav-link">
          <span class="mobile-nav-icon">📝</span>
          <span>入学</span>
        </a>
      </li>
      <li class="mobile-nav-item">
        <a href="share.html" class="mobile-nav-link">
          <span class="mobile-nav-icon">🔗</span>
          <span>分享</span>
        </a>
      </li>
    </ul>
  </nav>

  <!-- 移动端优化JavaScript -->
  <script src="mobile-utils.js"></script>
`;

// 移动端响应式CSS模板
const mobileResponsiveCSSTemplate = `

    /* 移动端响应式优化 */
    @media (max-width: 960px) {
      .container {
        grid-template-columns: 1fr;
        grid-template-rows: auto 1fr;
        padding: 16px;
        padding-bottom: calc(var(--mobile-nav-height) + 20px);
      }
      
      .sidebar {
        display: none;
      }
      
      .panel {
        padding: 16px;
        border-radius: 16px;
      }
      
      .search-box {
        flex-direction: column;
        gap: 12px;
      }
      
      .search-box input {
        padding: 14px 16px;
        font-size: 16px;
      }
      
      .search-box button {
        padding: 14px 16px;
        font-size: 16px;
      }
      
      .panel-title {
        font-size: 20px;
      }
    }

    @media (max-width: 480px) {
      .container {
        padding: 12px;
        padding-bottom: calc(var(--mobile-nav-height) + 16px);
      }
      
      .panel {
        padding: 12px;
        border-radius: 12px;
      }
      
      .search-box input {
        padding: 16px;
        font-size: 16px;
      }
      
      .search-box button {
        padding: 16px;
        font-size: 16px;
      }
      
      .panel-title {
        font-size: 18px;
      }
      
      .card {
        border-radius: 12px;
        margin-bottom: 12px;
      }
      
      .card-text {
        padding: 12px;
        font-size: 14px;
      }
    }
`;

// 页面特定的底部导航配置
const pageNavConfig = {
  'enrollment-steps.html': 'active',
  'share.html': 'active',
  'fun.html': 'active',
  'hospital.html': 'active',
  'profile.html': 'active',
  'post.html': 'active',
  'publish.html': 'active',
  'messages.html': 'active',
  'register.html': 'active',
  'admin-login.html': 'active',
  'admin-profile.html': 'active',
  'admin-publish.html': 'active',
  'admin-posts.html': 'active',
  'admin-all.html': 'active'
};

function optimizePage(pageName) {
  const filePath = path.join('public', pageName);
  
  if (!fs.existsSync(filePath)) {
    console.log(`❌ 页面不存在: ${pageName}`);
    return false;
  }
  
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    let modified = false;
    
    // 1. 添加移动端CSS引入
    if (!content.includes('mobile-optimization.css')) {
      const titleMatch = content.match(/<title>.*?<\/title>/);
      if (titleMatch) {
        const insertPos = content.indexOf(titleMatch[0]) + titleMatch[0].length;
        content = content.slice(0, insertPos) + '\n' + mobileCSSTemplate + content.slice(insertPos);
        modified = true;
      }
    }
    
    // 2. 添加移动端导航结构
    if (!content.includes('mobile-sidebar')) {
      const bodyMatch = content.match(/<body[^>]*>/);
      if (bodyMatch) {
        const insertPos = content.indexOf(bodyMatch[0]) + bodyMatch[0].length;
        content = content.slice(0, insertPos) + '\n' + mobileNavTemplate + content.slice(insertPos);
        modified = true;
      }
    }
    
    // 3. 添加移动端响应式CSS
    if (!content.includes('移动端响应式优化')) {
      const styleMatch = content.match(/<\/style>/);
      if (styleMatch) {
        const insertPos = content.indexOf(styleMatch[0]);
        content = content.slice(0, insertPos) + mobileResponsiveCSSTemplate + content.slice(insertPos);
        modified = true;
      }
    }
    
    // 4. 添加移动端底部导航
    if (!content.includes('mobile-nav')) {
      const scriptMatch = content.match(/<\/script>\s*<\/body>/);
      if (scriptMatch) {
        const insertPos = content.indexOf(scriptMatch[0]);
        content = content.slice(0, insertPos) + '\n' + mobileBottomNavTemplate + content.slice(insertPos);
        modified = true;
      }
    }
    
    // 5. 更新聊天按钮位置
    if (content.includes('#chatFab')) {
      content = content.replace(
        /#chatFab\s*\{\s*position:\s*fixed;\s*left:\s*16px;\s*bottom:\s*16px;/g,
        '#chatFab { position: fixed; left: 16px; bottom: calc(var(--mobile-nav-height) + 16px);'
      );
      content = content.replace(
        /@media\s*\(max-width:\s*480px\)\s*\{\s*#chatFab\s*\{\s*left:\s*12px;\s*bottom:\s*12px;/g,
        '@media (max-width: 480px) { #chatFab { left: 12px; bottom: calc(var(--mobile-nav-height) + 12px);'
      );
      modified = true;
    }
    
    if (modified) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`✅ 优化完成: ${pageName}`);
      return true;
    } else {
      console.log(`⏭️  无需优化: ${pageName}`);
      return false;
    }
    
  } catch (error) {
    console.log(`❌ 优化失败: ${pageName} - ${error.message}`);
    return false;
  }
}

function main() {
  console.log('🚀 开始批量优化页面移动端体验...\n');
  
  let successCount = 0;
  let totalCount = pagesToOptimize.length;
  
  for (const page of pagesToOptimize) {
    if (optimizePage(page)) {
      successCount++;
    }
  }
  
  console.log(`\n📊 优化完成! 成功: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log('🎉 所有页面都已成功优化!');
  } else {
    console.log('⚠️  部分页面优化失败，请检查错误信息');
  }
}

if (require.main === module) {
  main();
}

module.exports = { optimizePage, pagesToOptimize };
