#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// 页面配置
const PAGE_CONFIGS = [
  {
    title: '生活小贴士',
    description: '海外留学生活指南，实用的生活小贴士和技巧',
    category: 'life',
    keywords: '海外留学,生活小贴士,留学生活,实用技巧',
    url: 'life-tips-optimized.html',
    originalFile: 'life-tips.html'
  },
  {
    title: '学习指导',
    description: '专业的学习建议和指导，提高学术成绩',
    category: 'study',
    keywords: '海外留学,学习指导,学术成绩,学习方法',
    url: 'study-guide-optimized.html',
    originalFile: 'study-guide.html'
  },
  {
    title: '入学步骤',
    description: '详细的入学流程指导，顺利完成入学手续',
    category: 'enroll',
    keywords: '海外留学,入学步骤,入学流程,入学指导',
    url: 'enrollment-steps-optimized.html',
    originalFile: 'enrollment-steps.html'
  },
  {
    title: '医院信息',
    description: '查找附近的医院和诊所，获取医疗服务信息',
    category: 'life',
    keywords: '海外留学,医院信息,医疗服务,诊所',
    url: 'hospital-optimized.html',
    originalFile: 'hospital.html'
  },
  {
    title: '分享经验',
    description: '分享你的留学经历，帮助其他同学',
    category: 'share',
    keywords: '海外留学,分享经验,留学经历,经验分享',
    url: 'share-optimized.html',
    originalFile: 'share.html'
  },
  {
    title: '娱乐',
    description: '轻松愉快的娱乐内容，丰富留学生活',
    category: 'fun',
    keywords: '海外留学,娱乐,轻松,留学生活',
    url: 'fun-optimized.html',
    originalFile: 'fun.html'
  }
];

// 读取模板文件
function readTemplate() {
  const templatePath = path.join(__dirname, '../public/template-function-page.html');
  return fs.readFileSync(templatePath, 'utf8');
}

// 替换模板变量
function replaceTemplateVariables(template, config) {
  return template
    .replace(/\{\{PAGE_TITLE\}\}/g, config.title)
    .replace(/\{\{PAGE_DESCRIPTION\}\}/g, config.description)
    .replace(/\{\{PAGE_CATEGORY\}\}/g, config.category)
    .replace(/\{\{PAGE_KEYWORDS\}\}/g, config.keywords)
    .replace(/\{\{PAGE_URL\}\}/g, config.url);
}

// 生成优化页面
function generateOptimizedPage(config) {
  try {
    const template = readTemplate();
    const content = replaceTemplateVariables(template, config);
    
    const outputPath = path.join(__dirname, '../public', config.url);
    fs.writeFileSync(outputPath, content, 'utf8');
    
    console.log(`✅ 生成优化页面: ${config.url}`);
    return true;
  } catch (error) {
    console.error(`❌ 生成页面失败 ${config.url}:`, error.message);
    return false;
  }
}

// 主函数
function main() {
  console.log('🚀 开始生成优化页面...');
  
  let successCount = 0;
  let totalCount = PAGE_CONFIGS.length;
  
  PAGE_CONFIGS.forEach(config => {
    if (generateOptimizedPage(config)) {
      successCount++;
    }
  });
  
  console.log(`\n📊 生成完成统计:`);
  console.log(`  总页面数: ${totalCount}`);
  console.log(`  成功生成: ${successCount}`);
  console.log(`  失败数量: ${totalCount - successCount}`);
  console.log(`  成功率: ${((successCount / totalCount) * 100).toFixed(1)}%`);
  
  if (successCount === totalCount) {
    console.log('\n🎉 所有页面生成成功！');
  } else {
    console.log('\n⚠️ 部分页面生成失败，请检查错误信息');
  }
}

// 如果直接运行此脚本
if (require.main === module) {
  main();
}

module.exports = {
  PAGE_CONFIGS,
  generateOptimizedPage,
  main
};
