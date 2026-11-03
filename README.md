# Listing Loom · 商品织录

Listing Loom 是一个基于 **React、TypeScript 6、Vite 7、Tailwind CSS 4 和 CRXJS** 构建的 Chrome / Edge Manifest V3 浏览器扩展。前端以 React 函数组件拆分界面和交互，以 Tailwind 工具类编写样式；开发时通过 Vite 热更新预览，不需要把它作为普通网页使用。

## 环境要求

- Node.js（建议使用当前维护中的 LTS 版本）
- pnpm（仓库使用 `pnpm-lock.yaml` 管理依赖）
- Chrome 或 Edge

## 本地开发与热更新

在项目目录运行：

```bash
pnpm install
pnpm dev
```

第一次开发时，在 Chrome 打开 `chrome://extensions`，或在 Edge 打开 `edge://extensions`：

1. 开启“开发者模式”。
2. 点击“加载已解压的扩展程序”，选择项目生成的 `dev-dist/` 目录。
3. 点击工具栏上的 Listing Loom 图标，打开扩展侧边栏。

保持 `pnpm dev` 运行。修改界面代码和样式时，Vite/CRXJS 会更新开发中的扩展；修改后台脚本时，扩展可能会重新加载。若浏览器未应用更新，可在扩展管理页点击扩展的刷新按钮，再重新打开侧边栏。

开发预览应从扩展图标打开。Vite 使用 `127.0.0.1:5173` 提供热更新资源，开发构建输出在 `dev-dist/`；不需要把 localhost 页面作为产品界面。开发构建会额外声明本机开发服务器的 host permission，生产构建不会带上该权限。

侧边栏保持打开时，点击“标记页面节点”会在点击当下查询浏览器当前选中的标签页，再通过 `scripting.executeScript()` 读取该页 DOM。扩展声明了 HTTP/HTTPS 网站访问权限，以支持切换标签后从侧边栏采集；扩展只在用户点击按钮时读取当前页。Chrome 内部页、Chrome 网上应用店和新标签页仍不可注入。

## 生产构建

```bash
pnpm build
```

构建脚本先运行 `tsc -b` 做 TypeScript 项目检查，再由 Vite 生成生产扩展。输出目录是 `dist/`。可在 Chrome/Edge 扩展管理页通过“加载已解压的扩展程序”选择 `dist/`，进行生产构建验证或本地使用。发布时使用 `dist/` 内容制作发布包，不要提交 `dev-dist/` 或 `dist/`。

## 采集字段

- Item Code、Product Name
- Original Price（原价）、Sale Price（促销价）、Discount（折扣）
- Available、Fulfillment
- Product Features、Main Color、Main Material、Bed Frame Material
- Assembled Length (in.)、Assembled Width (in.)、Assembled Height (in.)、Product Weight (lbs.)

不采集商品图片。采集器按 gigab2b 商品页标签和 DOM 结构提取信息：普通字段读取标签的下一个兄弟元素，Available 读取前一个兄弟元素；价格、Product Features 和 Fulfillment 使用专用规则。页面结构变化可能导致部分字段为空；保存前请人工核对。

## 草稿存储与 AI

草稿保存在扩展自己的 `chrome.storage.local` 中，不上传到业务服务器。侧边栏可以继续编辑和删除草稿、导出全部草稿 JSON，或复制商品信息作为 AI 输入。卸载扩展或清除扩展数据前，请先导出备份。

## 工程结构

```text
listing-loom/
├── manifest.json        # MV3 权限、后台脚本与侧边栏入口
├── public/icons/         # 128×128 SVG 源图与扩展所需 PNG 尺寸
├── index.html           # 侧边栏 HTML 入口
├── vite.config.ts       # Vite、CRXJS、Tailwind 和开发/生产输出配置
├── pnpm-lock.yaml       # pnpm 依赖锁定文件
├── src/
│   ├── main.tsx         # React 应用入口
│   ├── App.tsx          # 应用状态、采集和草稿操作
│   ├── components/      # 侧边栏可复用 UI 组件
│   │   ├── TopBar.tsx
│   │   ├── ProductForm.tsx
│   │   ├── ProductField.tsx
│   │   └── DraftLibrary.tsx
│   ├── background.ts    # 扩展 service worker；配置点击工具栏图标打开侧边栏
│   ├── scraper.ts       # 在当前标签页提取商品字段
│   ├── storage.ts       # chrome.storage.local 草稿读写
│   ├── style.css        # Tailwind CSS 入口、主题和全局基础样式
│   └── types.ts         # 商品草稿数据类型
├── dev-dist/            # 开发服务器生成，加载到浏览器用于热更新
└── dist/                # 生产构建输出
```
