/** @jsxImportSource @opentui/solid */

import type { TuiPlugin, TuiPluginApi, TuiPluginModule, TuiSlotContext } from "@opencode-ai/plugin/tui"
import type { Message } from "@opencode-ai/sdk"
import { createMemo, createSignal, onCleanup, onMount } from "solid-js"

const ID = "local.tool-spark"

/** 量程上限：0~5，超过 5 封顶。 */
const MAX = 5

const BLOCKS = ["\u2581", "\u2582", "\u2583", "\u2584", "\u2585", "\u2586", "\u2587", "\u2588"]

/**
 * 0 输出空格（不画柱子），1..MAX 均匀铺满 ▁..█。
 * 不用 ▁ 表示 0：它在终端字体里细得和空格几乎一样，跟 1 分不开。
 */
function level(count: number): string {
  const capped = Math.min(Math.max(count, 0), MAX)
  if (capped === 0) return " "
  return BLOCKS[Math.round((capped / MAX) * (BLOCKS.length - 1))]
}

/**
 * 本轮发起的工具调用数。这里用结构化类型而不是 SDK 的 Part：
 * `api.state.part()` 返回 v2 导出的 Part，与非 v2 导出的 Part 不兼容。
 */
function countTools(api: TuiPluginApi, messageId: string): number {
  let parts: ReadonlyArray<{ type: string }>
  try {
    parts = api.state.part(messageId)
  } catch {
    // part 尚未同步时按 0 计，避免柱状图出现空洞。
    parts = []
  }
  let n = 0
  for (const p of parts) if (p.type === "tool") n++
  return n
}

/** 每轮（一条 assistant 消息）发起的工具调用数，时间正序。 */
function toolCounts(api: TuiPluginApi, sessionId: string, buckets: number): number[] {
  const msgs = api.state.session.messages(sessionId) as Message[]
  const out: number[] = []
  for (let i = msgs.length - 1; i >= 0 && out.length < buckets; i--) {
    const m = msgs[i]
    if (m.role !== "assistant") continue
    out.push(Math.min(countTools(api, m.id), MAX))
  }
  return out.reverse()
}

function ToolSpark(props: { api: TuiPluginApi; sessionId: string; buckets: number }) {
  const [tick, setTick] = createSignal(0)

  onMount(() => {
    const offs = [
      props.api.event.on("message.updated", () => setTick((v) => v + 1)),
      props.api.event.on("message.part.updated", () => setTick((v) => v + 1)),
      props.api.event.on("session.updated", () => setTick((v) => v + 1)),
    ]
    onCleanup(() => {
      for (const off of offs) off()
    })
  })

  const counts = createMemo(() => {
    tick()
    return toolCounts(props.api, props.sessionId, props.buckets)
  })

  return (
    <text>
      <span style={{ fg: props.api.theme.current.textMuted }}>{"tools "}</span>
      {counts().map((c) => (
        <span style={{ fg: props.api.theme.current.secondary }}>{level(c)}</span>
      ))}
    </text>
  )
}

const tui: TuiPlugin = async (api, options) => {
  const raw = (options as Record<string, unknown> | undefined)?.buckets
  const buckets = typeof raw === "number" && raw > 0 ? Math.floor(raw) : 10

  api.slots.register({
    slots: {
      session_prompt_right(_ctx: TuiSlotContext, input: { session_id: string }) {
        return <ToolSpark api={api} sessionId={input.session_id} buckets={buckets} />
      },
    },
  })
}

const plugin: TuiPluginModule & { id: string } = { id: ID, tui }

export default plugin
