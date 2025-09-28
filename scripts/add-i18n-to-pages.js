const fs = require('fs');
const path = require('path');

// 需要添加多语言支持的页面列表
const pages = [
  'life-tips.html',
  'enrollment-steps.html', 
  'hospital.html',
  'share.html',
  'fun.html',
  'profile.html',
  'publish.html',
  'messages.html'
];

// 导航菜单的多语言映射
const navTranslations = {
  '主页': 'nav.home',
  '生活小贴士': 'nav.life', 
  '学习指导': 'nav.study',
  '入学步骤': 'nav.enrollment',
  '分享': 'nav.share',
  '娱乐': 'nav.fun',
  '医院': 'nav.hospital',
  '个人': 'nav.profile',
  '生活': 'nav.life',
  '学习': 'nav.study',
  '入学': 'nav.enrollment'
};

function addI18nToPage(filePath) {
  try {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // 1. 添加CSS引用
    if (!content.includes('i18n.css')) {
      content = content.replace(
        /<link rel="stylesheet" href="mobile-optimization\.css">/,
        '<link rel="stylesheet" href="mobile-optimization.css">\n  \n  <!-- 多语言支持CSS -->\n  <link rel="stylesheet" href="i18n.css">'
      );
    }
    
    // 2. 更新导航菜单
    Object.entries(navTranslations).forEach(([chinese, key]) => {
      // 桌面端导航
      const desktopPattern = new RegExp(`<span>${chinese}</span>`, 'g');
      content = content.replace(desktopPattern, `<span data-i18n="${key}">${chinese}</span>`);
      
      // 移动端导航
      const mobilePattern = new RegExp(`<span>${chinese}</span>`, 'g');
      content = content.replace(mobilePattern, `<span data-i18n="${key}">${chinese}</span>`);
    });
    
    // 3. 添加JavaScript引用
    if (!content.includes('i18n.js')) {
      content = content.replace(
        /<\/script>\s*<\/body>\s*<\/html>/,
        '</script>\n  \n  <!-- 多语言支持JavaScript -->\n  <script src="i18n.js"></script>\n</body>\n</html>'
      );
    }
    
    // 4. 更新页面标题
    const titlePattern = /<title>([^<]+)<\/title>/;
    const titleMatch = content.match(titlePattern);
    if (titleMatch) {
      const title = titleMatch[1];
      if (title.includes('学习指导')) {
        content = content.replace(titlePattern, '<title data-i18n="page.title.study">$1</title>');
      } else if (title.includes('生活小贴士')) {
        content = content.replace(titlePattern, '<title data-i18n="page.title.life">$1</title>');
      } else if (title.includes('入学步骤')) {
        content = content.replace(titlePattern, '<title data-i18n="page.title.enrollment">$1</title>');
      } else if (title.includes('医院')) {
        content = content.replace(titlePattern, '<title data-i18n="page.title.hospital">$1</title>');
      } else if (title.includes('分享')) {
        content = content.replace(titlePattern, '<title data-i18n="page.title.share">$1</title>');
      } else if (title.includes('娱乐')) {
        content = content.replace(titlePattern, '<title data-i18n="page.title.fun">$1</title>');
      } else if (title.includes('个人')) {
        content = content.replace(titlePattern, '<title data-i18n="page.title.profile">$1</title>');
      } else if (title.includes('发布')) {
        content = content.replace(titlePattern, '<title data-i18n="page.title.publish">$1</title>');
      } else if (title.includes('消息')) {
        content = content.replace(titlePattern, '<title data-i18n="page.title.messages">$1</title>');
      }
    }
    
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`✅ 已更新: ${filePath}`);
    
  } catch (error) {
    console.error(`❌ 更新失败: ${filePath}`, error.message);
  }
}

// 处理所有页面
console.log('开始为页面添加多语言支持...\n');

pages.forEach(page => {
  const filePath = path.join(__dirname, '..', 'public', page);
  if (fs.existsSync(filePath)) {
    addI18nToPage(filePath);
  } else {
    console.log(`⚠️  文件不存在: ${filePath}`);
  }
});

console.log('\n✅ 多语言支持添加完成！');
