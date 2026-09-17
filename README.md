# opencode-tool-spark

OpenCode TUI 插件：在输入框右侧用柱状图显示**每轮的工具调用个数**。

OpenCode TUI plugin that renders the **number of tool calls per turn** as an inline bar sparkline next to the prompt.

```
tools ▁▂▄▅▇█
```

每根柱子代表一轮（一条 assistant 消息），从左到右由旧到新。

| 工具调用数 | 柱高 |
|---|---|
| 0 | （空格，不画柱子） |
| 1 | ▂ |
| 2 | ▄ |
| 3 | ▅ |
| 4 | ▇ |
| ≥ 5 | █（封顶） |

颜色跟随主题：`tools` 标签用 `textMuted`（灰），柱子用 `secondary`（默认 `opencode` 主题暗色下是 `#5c9cf5` 蓝）。

主题 token 在运行时是 `RGBA` 实例（`resolveColor()` 的返回值），直接交给 `fg` 即可，不要自己转成字符串 —— 主题值是对象而非字符串，用 `typeof === "string"` 判断会永远落到兜底色值。

## 功能 / Features

- 在 `session_prompt_right` slot 内联显示，不额外占用行。
- 量程固定 0~5，超过 5 按 5 显示。
- 桶数可配，默认 10 轮。
- 与 [`opencode-cache-spark`](https://github.com/one-pyy/opencode-cache-spark) 和 [`opencode-visual-cache`](https://github.com/Hotakus/opencode-visual-cache) 并存：`session_prompt_right` 是 additive slot，visual-cache 接管 `session_prompt` 时会主动透传它。

## 安装 / Install

把 `src/index.tsx` 链接或复制到 OpenCode 配置目录的 `plugins/` 下，再在 `tui.json` 注册：

```json
{
  "plugin": [
    ["./plugins/tool-spark.tsx", { "buckets": 10 }]
  ]
}
```

本仓库的维护方式是软链接，避免副本漂移：

```bash
ln -sf "$PWD/src/index.tsx" ~/.config/opencode/plugins/tool-spark.tsx
```

安装或修改配置后需要**重启 OpenCode**。

### 依赖 / Dependencies

TUI 插件的 JSX 由 OpenCode 运行时注册的 Bun 插件转换，需要 `@opentui/solid`、`@opentui/core` 与 `solid-js` 可被解析。

Bun 解析软链接时按**真实路径**进行，所以这些依赖从本项目的 `node_modules` 解析，不需要在配置目录重复声明。

版本以已装且工作正常的 `opencode-visual-cache` 为准：`@opentui/solid` / `@opentui/core` `0.5.11`、`solid-js` `1.9.12`（`@opentui/solid` 的 peer 要求精确版本）。

## 配置 / Configuration

| 选项 | 默认 | 说明 |
|---|---|---|
| `buckets` | `10` | 显示最近多少轮 |

## 取数说明 / How it reads data

- 每轮对应 `api.state.session.messages(sessionId)` 里的一条 assistant 消息。
- 该轮工具调用数 = 该消息下 `api.state.part(messageID)` 中 `type === "tool"` 的 part 数量（含 `task` 子代理调用）。
- 一条消息里的多个 step 会合并计入同一轮。

## 开发 / Development

```bash
npm install
npx tsc --noEmit
```

本地复现运行时的 JSX 转换来验证加载：

```bash
bun -e '
import { ensureSolidTransformPlugin } from "@opentui/solid/bun-plugin"
ensureSolidTransformPlugin()
const m = await import("./src/index.tsx")
console.log(m.default?.id, typeof m.default?.tui)
'
```
