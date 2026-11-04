# dsh-plugins

[YellowSmallSea](https://github.com/YellowSmallSea) 的 DeepSeek Harness 插件集合。

## 插件

| 目录 | 包名 | 说明 |
| --- | --- | --- |
| [`cot-graph`](cot-graph/) | `@yellowsmallsea/dsh-cot-graph` | 思考链图谱：把会话中的推理步骤、工具调用与子代理派发画成可交互的节点图 |

## 从 DSH 安装

仓库根目录的 `index.json`（首次发布后生成）是 DSH 插件市场索引（format 1）。在 DSH 中：

1. 打开 **Plugins → Discover**。
2. 空状态里点 **Add index source**（或菜单里的 **Manage index sources…**）。
3. 填入：
   ```
   https://raw.githubusercontent.com/YellowSmallSea/dsh-plugins/main/index.json
   ```
4. 搜索插件并点 **Install**。

索引只是分发声明；真正的代码按其中记录的 commit 从本仓库拉取，因此安装后不受后续提交影响。

## 直接按 Git 规格安装

不想加索引时，也可以把下面这行交给 `plugin_manager`（把 `<commit>` 换成 40 位提交 SHA）：

```
git+https://github.com/YellowSmallSea/dsh-plugins.git#<commit>&path:/cot-graph
```

DSH 的 Plugin Manager 会先用 `git ls-remote` 检查仓库可达，再用 pnpm 安装该目录。

## 发布流程（每次改插件后）

```powershell
cd E:\soft-data\funnyland\dsh-plugins

# 1. 提交插件代码
git add .
git commit -m "feat(cot-graph): chain graph plugin"
git push -u origin main

# 2. 用刚推上去的 commit 生成索引
node scripts/build-index.mjs

# 3. 单独提交索引（索引指向第 1 步的 commit）
git add index.json
git commit -m "chore: refresh market index"
git push
```

> 系统 PATH 里没有 `node` 时，用 DSH 自带的：
> `C:\Users\huangxiaohai\.dsh\dsh-runtimes\dsh-primary-runtime\dependencies\node\bin\node.exe`

顺序不能反：`index.json` 里的 `commit` 必须指向**已经存在**的插件代码提交，所以索引总是跟在代码提交之后单独提交。若之后 rebase / force-push 掉了那个 commit，索引会失效，重跑第 2、3 步即可。

## 新增一个插件

1. 在仓库根目录建 `my-plugin/`，放入 `package.json`（含 `dsh.bundle.patch`）、`cordis.patch.yml`、`index.js`、`client.js`、`locale/*.json`、`icon.svg`。
2. 在 `scripts/build-index.mjs` 的 `PLUGINS` 之外无需改动——脚本会扫描所有带 `dsh.bundle` 的目录。
3. 按上面的发布流程提交；索引会同时列出多个插件。

## 版本与兼容

- 每个包的 `version` 会在索引里成为该版本号；升版本后必须重跑索引。
- 如声明 `engines.dsh`，DSH 会按运行版本判断兼容性；不声明则不设门槛。