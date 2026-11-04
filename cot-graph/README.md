# 思考链图谱（Chain Graph）

包名 `@yellowsmallsea/dsh-cot-graph`。DSH Harness 插件：把当前会话的推理步骤、工具调用与子代理派发画成一张节点图。

## 安装

- **市场索引（推荐）**：DSH → Plugins → Discover → Add index source，填
  `https://raw.githubusercontent.com/YellowSmallSea/dsh-plugins/main/index.json`
- **Git 规格**：`git+https://github.com/YellowSmallSea/dsh-plugins.git#<40位commit>&path:/cot-graph`
- **本机目录**：`plugin_manager install_bundle` 的 target 指向本目录

## 使用

1. 打开任意会话，会话头部的视图页签里会多出「思考图」。
2. 点击后，主栏切换为图谱视图：左侧时间轴是主干，右侧分支是工具调用；子代理派发落在最右侧一列。
3. 点击任意节点打开右侧详情，展开完整推理、调用参数、返回结果与错误信息；`Esc` 关闭。
4. 顶部可缩放（− / + / 适应宽度），并显示步骤、工具、子代理的数量统计。

图中节点类型：

| 节点 | 含义 |
| --- | --- |
| 输入 | 用户消息或 steering 输入 |
| 推理 | 一个 assistant step，正文首段为 reasoning，详情里区分推理与回答 |
| 工具 | 普通工具调用，含运行中 / 已完成 / 出错状态 |
| 子代理 | `subagent`、`subagent_fork`、`spawn_teammate`、`workflow` 等派发，展示目标代理与下发内容 |
| 进行中 | 当前仍在流式输出的 step，工具分支会实时出现 |

## 数据来源

只读取已装配好的 Conversation Trajectory 投影（`useTrajectory` 标准属性），不重扫会话日志、不追加任何会话事件。
因此 fork / resume 后的历史同样可绘制，插件本身不持有会话状态。

- 视图注册：`conversation.view`，id `cot-graph`，order 20
- 无 Host 服务、工具或配置项；`index.js` 为空实现
- 所有样式使用 `--dsw-alias-*` 主题 token，随明暗主题切换
- 文案同时提供中文与英文

## 文件

| 文件 | 作用 |
| --- | --- |
| `client.js` | 浏览器端：视图组件、布局算法、样式、中英文案 |
| `index.js` | Host 端空实现（bundle 需要一个 Host 行） |
| `cordis.patch.yml` | 向 profile 注册插件行 |
| `locale/zh.json`、`locale/en.json` | 插件管理页的标题与描述 |
| `icon.svg` | 插件图标 |

## 已知边界

- 子代理节点展示的是派发调用本身（目标代理、下发内容、结果摘要），不展开子会话内部的完整链路。
- 超长会话会渲染全部节点；当前没有虚拟滚动，属于后续优化项。