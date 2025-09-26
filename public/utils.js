// 公共工具：API 基础地址 / 转义 / 路径绝对化
export const API_BASE = (() => {
  try{
    if (location.hostname === 'localhost' || location.hostname === '127.0.0.1') {
      return 'http://127.0.0.1:3001';
    }
  }catch{}
  return '';
})();

export function esc(s){
  return String(s||'').replace(/[&<>"]/g, c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
}

export function toAbs(u){
  if(!u) return '';
  if(/^https?:\/\//i.test(u)) return u;
  return u.startsWith('/') ? (API_BASE + u) : (API_BASE + '/' + u);
}

// 环境探测友好导出（非模块环境）
if (typeof window !== 'undefined') {
  window.API_BASE = API_BASE;
  window.utilsEsc = esc;
  window.utilsToAbs = toAbs;
}


