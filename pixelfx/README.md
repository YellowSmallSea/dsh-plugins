# 像素特效库（Pixel FX）

DSH 侧边栏面板插件：把 [patch-gg/pixelfx](https://github.com/patch-gg/pixelfx) 的 244 个代码生成的像素特效
直接搬进 DSH，在自己的页签里实时预览，不用另开浏览器或打开 Gallery 网页。

## 安装

- **市场索引**：Plugins → Discover → Add index source，填
  `https://raw.githubusercontent.com/YellowSmallSea/dsh-plugins/main/index.json`
- **Git 规格**：`git+https://github.com/YellowSmallSea/dsh-plugins.git#<40位commit>&path:/pixelfx`
- **本机目录**：`plugin_manager install_bundle` 的 target 指向本目录

安装后有两个入口：

- **侧边栏面板**：左侧栏面板区（Plugins、Schedules 附近）出现一个像素火花图标，点开是整页特效库。
- **会话视图页签**：任意会话的视图页签行里多出「像素特效」，和「思考图」并列，切换即可预览。

两个入口是同一个面板：左侧 244 个特效列表，右侧实时画布。

## 用法

- **列表**：左侧 244 个特效，按分类分组；顶部可搜索名称、描述、标签、id，或按分类筛选。
- **预览**：右侧画布按整数倍放大（像素保持锐利），循环特效持续播放，一次性特效播放完自动重播。
- **控制**：暂停/播放、速度（0.25×～2×）、背景开关、角色开关（带 `act` 的特效可以关掉小人只看特效）。
- **信息**：名称、分类、画布尺寸、帧率、时长/循环、标签、简介。
- **源码**：右下角给出 `pixelfx` 的用法代码，可一键复制；「查看源码」跳到上游对应文件。

## 构建

`client.js` 是提交进仓库的构建产物，安装时不需要构建。改动后重新构建：

```powershell
cd E:\soft-data\funnyland\dsh-plugins\pixelfx
pnpm install          # 只装 esbuild
node build.mjs        # 生成 client.js（约 1.1 MiB）
```

上游源码在 `vendor/pixelfx/`（`src/core` 与 `src/fx`，未改动），构建时由 esbuild 打进 `client.js`，
`react` 保持 external，由 DSH 的浏览器模块表提供。

## 许可

- 上游 pixelfx：MIT，Copyright (c) 2026 Patch、Hugo Duprez；部分效果改编自 Sprite Fusion 与 Hollow Crown。
  详见 [NOTICE.md](NOTICE.md) 与 `vendor/pixelfx/`。
- 本插件的面板与构建包装：MIT，见 [LICENSE](LICENSE)。
- 上游 `gallery/fonts` 的字体不在 MIT 范围内，本插件未包含。

## 已知边界

- 只做浏览与预览，不导出精灵表；需要序列帧请用上游的 `gallery` 导出功能。
- 244 个特效全部打进一个客户端模块（约 1.1 MiB minified），首次打开面板时加载。
- 预览使用 canvas 2D 逐帧合成；超小窗口下会自动缩小，可能不如整数放大锐利。