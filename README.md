# 数独 PWA

一个适合手机和电脑使用的离线数独 PWA。生产构建会输出到 `dist`，可以直接部署到 Cloudflare Pages、Vercel、Netlify 等静态托管平台。

## 本地运行

```bash
npm install
npm run dev
```

## 生产构建

```bash
npm run build
npm run preview
```

## 部署

推荐 Cloudflare Pages：

1. 把项目推到 GitHub。
2. 打开 Cloudflare Pages，选择该仓库。
3. Framework preset 选择 `Vite`。
4. Build command 填 `npm run build`。
5. Build output directory 填 `dist`。
6. 部署完成后，用 HTTPS 地址打开，手机浏览器里选择“添加到主屏幕”。

Vercel / Netlify 也一样：

- Build command: `npm run build`
- Output directory: `dist`

项目已包含：

- `public/manifest.webmanifest`：PWA 安装信息。
- `public/sw.js`：离线缓存。
- `public/_headers`：静态托管缓存和安全响应头。
- `public/_redirects`：静态托管 fallback。
