// Web 平台专属实现：不引入 expo-sqlite（它的 Web 版依赖 .wasm，Metro 默认打不进 bundle）。
// Web 上数据走 webStore 的 localStorage，因此这里只需提供 genId，并给一个 no-op 的 getDb。
// Metro 会在 Web 端优先解析本文件（db.web.ts）而非 db.ts。
export const genId = () =>
  `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e9).toString(36)}`;

// Web 端不应调用（DAO 用 Platform.OS==='web' 分支走 webStore）。返回 null 让根布局的初始化调用安全通过。
export async function getDb(): Promise<any> {
  return null;
}
