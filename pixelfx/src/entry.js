import * as React from "react"
import { effects, categories } from "../vendor/pixelfx/src/fx/index.js"
import {
  actBounds,
  actorAlphaOf,
  backdrop,
  clearFrame,
  composite,
  createAct,
  createFrame,
  createFx,
  drawActor,
  painterFor,
  stockActor,
} from "../vendor/pixelfx/src/core/index.js"

const h = React.createElement
const NS = "dsh-pixelfx"
const PANEL_ID = "pixelfx"

const zh = {
  "panel.label": "像素特效",
  "view.label": "像素特效",
  "panel.title": "像素特效库",
  "panel.subtitle": "代码生成的像素特效，实时预览",
  "search.placeholder": "搜索特效、标签或分类",
  "filter.all": "全部分类",
  "preview.play": "播放",
  "preview.pause": "暂停",
  "preview.restart": "重播",
  "preview.speed": "速度",
  "preview.background": "背景",
  "preview.actor": "角色",
  "preview.source": "查看源码",
  "preview.copy": "复制用法",
  "preview.copied": "已复制",
  "meta.size": "画布",
  "meta.loop": "循环",
  "meta.duration": "时长",
  "meta.fps": "帧率",
  "meta.tags": "标签",
  "code.title": "在游戏里使用",
  "empty.list": "没有匹配的特效",
  "attribution": "特效来自 pixelfx（patch-gg，MIT）；部分改编自 Sprite Fusion 与 Hollow Crown。",
  "error.preview": "该特效无法在当前画布上渲染。",
  "count": "个特效",
}

const en = {
  "panel.label": "Pixel FX",
  "view.label": "Pixel FX",
  "panel.title": "Pixel FX Library",
  "panel.subtitle": "Code-driven pixel effects with live preview",
  "search.placeholder": "Search effects, tags, or categories",
  "filter.all": "All categories",
  "preview.play": "Play",
  "preview.pause": "Pause",
  "preview.restart": "Replay",
  "preview.speed": "Speed",
  "preview.background": "Background",
  "preview.actor": "Character",
  "preview.source": "View source",
  "preview.copy": "Copy usage",
  "preview.copied": "Copied",
  "meta.size": "Canvas",
  "meta.loop": "loop",
  "meta.duration": "Duration",
  "meta.fps": "FPS",
  "meta.tags": "Tags",
  "code.title": "Use it in a game",
  "empty.list": "No matching effects",
  "attribution": "Effects from pixelfx by patch-gg (MIT); some adapt Sprite Fusion and Hollow Crown.",
  "error.preview": "This effect could not render on the current canvas.",
  "count": "effects",
}

const DICTS = { zh, en }

const CATEGORY_BY_ID = new Map(categories.map((category) => [category.id, category]))

const FX = Object.entries(effects).map(([id, mod]) => {
  const meta = {
    fps: 30,
    bg: "dark",
    loop: false,
    duration: 1,
    tags: [],
    options: {},
    size: [64, 64],
    origin: [0, 0],
    ...(mod.meta ?? {}),
  }
  return {
    id,
    category: id.split("/")[0],
    name: meta.name ?? id,
    description: meta.desc ?? "",
    meta,
    mod,
  }
})

const FX_BY_ID = new Map(FX.map((entry) => [entry.id, entry]))
const DEFAULT_EFFECT = "fire/campfire"

function fallbackTranslate(key) {
  const language =
    typeof document !== "undefined" && document?.documentElement?.lang?.toLowerCase().startsWith("zh") ? "zh" : "en"
  const dict = DICTS[language] ?? DICTS.en
  return dict[key] ?? DICTS.zh[key] ?? key
}

function useTranslate(tProp) {
  return React.useCallback(
    (key) => {
      if (typeof tProp === "function") {
        const value = tProp(key)
        if (typeof value === "string" && value !== "") return value
      }
      return fallbackTranslate(key)
    },
    [tProp],
  )
}

function formatDuration(meta) {
  if (meta.loop) return "loop"
  const duration = Number(meta.duration)
  if (!Number.isFinite(duration)) return "—"
  return `${duration.toFixed(2)}s`
}

function effectSize(mod, meta, actor) {
  const acted = Boolean(mod.act) && actor
  if (acted) {
    const bounds = actBounds(mod)
    if (bounds !== undefined && bounds !== null) {
      return {
        acted: true,
        width: Math.max(1, Math.ceil(bounds.x1 - bounds.x0)),
        height: Math.max(1, Math.ceil(bounds.y1 - bounds.y0)),
        x: -bounds.x0,
        y: -bounds.y0,
      }
    }
  }
  return {
    acted: false,
    width: Math.max(1, Math.ceil(meta.size[0])),
    height: Math.max(1, Math.ceil(meta.size[1])),
    x: Number(meta.origin?.[0] ?? 0),
    y: Number(meta.origin?.[1] ?? 0),
  }
}

function createPlayer(canvas, entry, options) {
  const { mod, meta } = entry
  const size = effectSize(mod, meta, options.actor)
  const { width, height, x, y, acted } = size

  canvas.width = width
  canvas.height = height
  const context = canvas.getContext("2d")
  if (context === null) throw new Error("2d context unavailable")

  const frame = createFrame(width, height)
  const image = context.createImageData(width, height)
  const background = options.background ? backdrop(meta.bg ?? "dark", width, height, y) : null
  const step = 1 / (Number(meta.fps) > 0 ? Number(meta.fps) : 30)

  const instantiate = () =>
    (acted ? createAct : createFx)(mod, {
      x,
      y,
      flip: false,
      ...(options.seed === undefined ? {} : { seed: options.seed }),
    })

  let instance = instantiate()
  let accumulated = 0
  let waited = 0

  const render = () => {
    const target = clearFrame(frame)
    if (acted) {
      instance.draw(target)
      composite(target, image.data, background)
      const [shakeX, shakeY] = instance.shake ?? [0, 0]
      if (shakeX || shakeY) context.clearRect(0, 0, width, height)
      context.putImageData(image, shakeX, shakeY)
      return
    }
    instance.draw(target, "back")
    const duration = Number(meta.duration) > 0 ? Number(meta.duration) : 1
    const time = meta.loop ? instance.t % duration : Math.min(instance.t, duration)
    if (meta.actor && options.actor) {
      drawActor(
        painterFor(target).place(x, y, false),
        instance.options?.actor ?? stockActor(),
        actorAlphaOf(mod, time, instance.options ?? {}),
      )
    }
    instance.draw(target, "front")
    composite(target, image.data, background)
    context.putImageData(image, 0, 0)
  }

  const restart = () => {
    instance = instantiate()
    accumulated = 0
    waited = 0
    render()
  }

  const tick = (delta) => {
    accumulated = Math.min(accumulated + delta, 0.25)
    let moved = false
    while (accumulated >= step) {
      accumulated -= step
      const duration = Number(meta.duration) > 0 ? Number(meta.duration) : 1
      const finished = acted ? instance.done() : instance.t >= duration && !meta.loop
      if (!meta.loop && finished) {
        waited += step
        if (waited > 0.45) restart()
      } else {
        instance.update(step)
        moved = true
      }
    }
    if (moved) render()
  }

  render()

  return {
    tick,
    restart,
    dispose() {
      instance = null
    },
  }
}

function PreviewCanvas({ entry, playing, speed, background, actor, t }) {
  const canvasRef = React.useRef(null)
  const stageRef = React.useRef(null)
  const playerRef = React.useRef(null)
  const playingRef = React.useRef(playing)
  const speedRef = React.useRef(speed)
  const [failed, setFailed] = React.useState(false)

  playingRef.current = playing
  speedRef.current = speed

  React.useEffect(() => {
    const canvas = canvasRef.current
    if (canvas === null) return undefined
    let player
    try {
      player = createPlayer(canvas, entry, { actor, background })
    } catch (error) {
      setFailed(true)
      return undefined
    }
    setFailed(false)
    playerRef.current = player
    let animation = 0
    let last = performance.now()
    const loop = (now) => {
      const delta = Math.min(0.05, (now - last) / 1000)
      last = now
      try {
        if (playingRef.current) player.tick(delta * speedRef.current)
      } catch (error) {
        setFailed(true)
        return
      }
      animation = requestAnimationFrame(loop)
    }
    animation = requestAnimationFrame(loop)
    return () => {
      cancelAnimationFrame(animation)
      player.dispose()
      playerRef.current = null
    }
  }, [entry, actor, background])

  React.useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    if (stage === null || canvas === null) return undefined
    const fit = () => {
      const availableWidth = stage.clientWidth - 24
      const availableHeight = stage.clientHeight - 24
      if (availableWidth <= 0 || availableHeight <= 0) return
      const width = canvas.width
      const height = canvas.height
      if (width <= 0 || height <= 0) return
      const raw = Math.min(availableWidth / width, availableHeight / height)
      const scale = raw >= 1 ? Math.max(1, Math.floor(raw)) : Math.max(0.2, raw)
      canvas.style.width = `${Math.floor(width * scale)}px`
      canvas.style.height = `${Math.floor(height * scale)}px`
    }
    fit()
    const observer = typeof ResizeObserver === "function" ? new ResizeObserver(fit) : null
    observer?.observe(stage)
    return () => observer?.disconnect()
  }, [entry, actor, background])

  const restart = React.useCallback(() => {
    playerRef.current?.restart()
  }, [])

  return h(
    "div",
    { className: "pfx_stage", ref: stageRef },
    failed
      ? h("div", { className: "pfx_error" }, t("error.preview"))
      : h("canvas", { ref: canvasRef, className: "pfx_canvas", "aria-label": entry.name }),
    h(
      "button",
      {
        type: "button",
        className: "pfx_restart",
        onClick: restart,
        title: t("preview.restart"),
        "aria-label": t("preview.restart"),
      },
      "↺",
    ),
  )
}

function EffectList({ items, selectedId, onSelect, t }) {
  if (items.length === 0) return h("div", { className: "pfx_empty" }, t("empty.list"))
  return h(
    "div",
    { className: "pfx_list", role: "listbox", "aria-label": t("panel.title") },
    items.map((entry) =>
      h(
        "button",
        {
          type: "button",
          key: entry.id,
          className: "pfx_row",
          role: "option",
          "aria-selected": entry.id === selectedId,
          "data-active": entry.id === selectedId ? "true" : undefined,
          onClick: () => onSelect(entry.id),
        },
        h("span", { className: "pfx_rowName" }, entry.name),
        h("span", { className: "pfx_rowMeta" }, entry.meta.loop ? t("meta.loop") : formatDuration(entry.meta)),
      ),
    ),
  )
}

function CodeBlock({ entry, t }) {
  const [copied, setCopied] = React.useState(false)
  const code = [
    `import * as effect from "pixelfx/fx/${entry.id}";`,
    `import { createFrame, clearFrame, createFx, composite } from "pixelfx";`,
    "",
    "const frame = createFrame(320, 180);",
    "const img = new ImageData(320, 180);",
    "const fx = createFx(effect, { x: 160, y: 140 });",
    "fx.update(dt);",
    "clearFrame(frame);",
    "fx.draw(frame, \"front\");",
    "composite(frame, img.data);",
  ].join("\n")

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }

  return h(
    "section",
    { className: "pfx_code" },
    h(
      "div",
      { className: "pfx_codeHead" },
      h("span", { className: "pfx_codeTitle" }, t("code.title")),
      h("button", { type: "button", className: "pfx_btn", onClick: copy }, copied ? t("preview.copied") : t("preview.copy")),
    ),
    h("pre", { className: "pfx_pre" }, code),
  )
}

class PanelGuard extends React.Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }
  static getDerivedStateFromError(error) {
    return { error }
  }
  render() {
    if (this.state.error !== null) {
      return h(
        "div",
        { className: "pfx_error", style: { padding: "24px", fontSize: "12px" } },
        `pixelfx: ${String(this.state.error?.message ?? this.state.error)}`,
      )
    }
    return this.props.children
  }
}

function PixelfxEntry(props) {
  return h(PanelGuard, null, h(PixelfxPanel, props))
}

function PixelfxPanel(props) {
  const t = useTranslate(props.t)
  const [query, setQuery] = React.useState("")
  const [category, setCategory] = React.useState("all")
  const [selectedId, setSelectedId] = React.useState(DEFAULT_EFFECT)
  const [playing, setPlaying] = React.useState(true)
  const [speed, setSpeed] = React.useState(1)
  const [background, setBackground] = React.useState(true)
  const [actor, setActor] = React.useState(true)

  const filtered = React.useMemo(() => {
    const needle = query.trim().toLowerCase()
    return FX.filter((entry) => {
      if (category !== "all" && entry.category !== category) return false
      if (needle === "") return true
      const haystack = [entry.name, entry.description, entry.id, ...(entry.meta.tags ?? [])].join(" ").toLowerCase()
      return haystack.includes(needle)
    })
  }, [query, category])

  const selected = FX_BY_ID.get(selectedId) ?? FX[0]
  const selectedCategory = CATEGORY_BY_ID.get(selected.category)

  const sourceUrl = `https://github.com/patch-gg/pixelfx/blob/main/src/fx/${selected.id}.js`

  return h(
    "div",
    { className: "pfx_root" },
    h("style", { key: "pfx-style" }, CSS),
    h(
      "header",
      { className: "pfx_header" },
      h(
        "div",
        { className: "pfx_titleBlock" },
        h("div", { className: "pfx_title" }, t("panel.title")),
        h("div", { className: "pfx_subtitle" }, `${FX.length} ${t("count")} · ${t("panel.subtitle")}`),
      ),
      h("div", { className: "pfx_spacer" }),
      h("input", {
        className: "pfx_search",
        type: "search",
        value: query,
        placeholder: t("search.placeholder"),
        onChange: (event) => setQuery(event.target.value),
        "aria-label": t("search.placeholder"),
      }),
      h(
        "select",
        {
          className: "pfx_select",
          value: category,
          onChange: (event) => setCategory(event.target.value),
          "aria-label": t("filter.all"),
        },
        h("option", { value: "all" }, t("filter.all")),
        categories.map((item) => h("option", { value: item.id, key: item.id }, item.name)),
      ),
    ),
    h(
      "div",
      { className: "pfx_body" },
      h("div", { className: "pfx_listWrap" }, h(EffectList, { items: filtered, selectedId, onSelect: setSelectedId, t })),
      h(
        "div",
        { className: "pfx_preview" },
        h(PreviewCanvas, { key: `${selected.id}:${actor}:${background}`, entry: selected, playing, speed, background, actor, t }),
        h(
          "div",
          { className: "pfx_info" },
          h(
            "div",
            { className: "pfx_infoHead" },
            h("div", { className: "pfx_infoTitle" }, selected.name),
            h(
              "div",
              { className: "pfx_infoMeta" },
              `${selectedCategory?.name ?? selected.category} · ${t("meta.size")} ${selected.meta.size[0]}×${selected.meta.size[1]} · ${t("meta.fps")} ${selected.meta.fps} · ${
                selected.meta.loop ? t("meta.loop") : `${t("meta.duration")} ${formatDuration(selected.meta)}`
              }`,
            ),
            h("p", { className: "pfx_desc" }, selected.description),
            Array.isArray(selected.meta.tags) && selected.meta.tags.length > 0
              ? h(
                  "div",
                  { className: "pfx_tags" },
                  selected.meta.tags.map((tag) => h("span", { className: "pfx_tag", key: tag }, tag)),
                )
              : null,
          ),
          h(
            "div",
            { className: "pfx_controls" },
            h("button", { type: "button", className: "pfx_btn", onClick: () => setPlaying((value) => !value) }, playing ? t("preview.pause") : t("preview.play")),
            h(
              "select",
              {
                className: "pfx_select pfx_selectSmall",
                value: String(speed),
                onChange: (event) => setSpeed(Number(event.target.value)),
                "aria-label": t("preview.speed"),
                title: t("preview.speed"),
              },
              [0.25, 0.5, 1, 2].map((value) => h("option", { value: String(value), key: value }, `${value}×`)),
            ),
            h(
              "label",
              { className: "pfx_check" },
              h("input", { type: "checkbox", checked: background, onChange: (event) => setBackground(event.target.checked) }),
              t("preview.background"),
            ),
            h(
              "label",
              { className: "pfx_check" },
              h("input", {
                type: "checkbox",
                checked: actor,
                disabled: !selected.mod.act,
                onChange: (event) => setActor(event.target.checked),
              }),
              t("preview.actor"),
            ),
            h(
              "a",
              { className: "pfx_link", href: sourceUrl, target: "_blank", rel: "noreferrer noopener" },
              t("preview.source"),
            ),
          ),
        ),
        h(CodeBlock, { entry: selected, t }),
      ),
    ),
    h(
      "footer",
      { className: "pfx_footer" },
      h("a", { className: "pfx_link", href: "https://github.com/patch-gg/pixelfx", target: "_blank", rel: "noreferrer noopener" }, "pixelfx"),
      h("span", null, t("attribution")),
    ),
  )
}

function PixelfxIcon({ size = 18, active = false }) {
  return h(
    "svg",
    {
      width: size,
      height: size,
      viewBox: "0 0 16 16",
      "aria-hidden": true,
      style: { display: "block", opacity: active ? 1 : 0.75, pointerEvents: "none" },
      shapeRendering: "crispEdges",
    },
    h("rect", { x: 2, y: 7, width: 3, height: 3, fill: "currentColor" }),
    h("rect", { x: 6, y: 4, width: 3, height: 3, fill: "currentColor" }),
    h("rect", { x: 9, y: 8, width: 3, height: 3, fill: "currentColor" }),
    h("rect", { x: 11, y: 3, width: 2, height: 2, fill: "currentColor", opacity: 0.6 }),
    h("rect", { x: 4, y: 11, width: 2, height: 2, fill: "currentColor", opacity: 0.6 }),
  )
}

const CSS = `
  .pfx_root {
    height: 100%;
    min-height: 0;
    display: flex;
    flex-direction: column;
    background: var(--dsw-alias-bg-base);
    color: var(--dsw-alias-label-primary);
  }
  .pfx_header {
    flex: none;
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 10px;
    padding: 10px 18px;
    border-bottom: .5px solid var(--dsw-alias-border-l1);
  }
  .pfx_titleBlock { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
  .pfx_title { font-size: 14px; font-weight: 600; line-height: 20px; }
  .pfx_subtitle { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-secondary); }
  .pfx_spacer { flex: 1; }
  .pfx_search {
    width: 230px;
    max-width: 40vw;
    height: 28px;
    padding: 0 10px;
    border-radius: 7px;
    border: .5px solid var(--dsw-alias-border-l1);
    background: var(--dsw-alias-bg-layer-1);
    color: var(--dsw-alias-label-primary);
    font-size: 12px;
    font-family: inherit;
    outline: none;
  }
  .pfx_search:focus-visible { border-color: var(--dsw-alias-brand-primary); }
  .pfx_select {
    height: 28px;
    padding: 0 8px;
    border-radius: 7px;
    border: .5px solid var(--dsw-alias-border-l1);
    background: var(--dsw-alias-bg-layer-1);
    color: var(--dsw-alias-label-primary);
    font-size: 12px;
    font-family: inherit;
  }
  .pfx_selectSmall { height: 26px; }
  .pfx_body { flex: 1; min-height: 0; display: flex; }
  .pfx_listWrap {
    width: 280px;
    flex: none;
    min-height: 0;
    overflow: auto;
    border-right: .5px solid var(--dsw-alias-border-l1);
    padding: 6px 0 16px;
  }
  .pfx_list { display: flex; flex-direction: column; gap: 1px; }
  .pfx_row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding: 5px 14px;
    border: 0;
    background: transparent;
    color: var(--dsw-alias-label-secondary);
    font-family: inherit;
    font-size: 12px;
    line-height: 18px;
    text-align: left;
    cursor: pointer;
  }
  .pfx_row:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
  .pfx_row[data-active="true"] {
    background: var(--dsw-alias-bg-layer-2);
    color: var(--dsw-alias-label-primary);
    box-shadow: inset 2px 0 0 var(--dsw-alias-brand-primary);
  }
  .pfx_rowName { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .pfx_rowMeta { flex: none; font-size: 10px; color: var(--dsw-alias-label-secondary); }
  .pfx_empty { padding: 24px 16px; font-size: 12px; color: var(--dsw-alias-label-secondary); }
  .pfx_preview {
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 12px;
    padding: 16px 20px 12px;
  }
  .pfx_stage {
    position: relative;
    flex: 1;
    min-height: 220px;
    display: flex;
    align-items: center;
    justify-content: center;
    overflow: hidden;
    border-radius: 12px;
    border: .5px solid var(--dsw-alias-border-l1);
    background: var(--dsw-alias-bg-layer-1);
  }
  .pfx_canvas { image-rendering: pixelated; display: block; }
  .pfx_restart {
    position: absolute;
    top: 8px;
    right: 8px;
    width: 26px;
    height: 26px;
    border-radius: 7px;
    border: .5px solid var(--dsw-alias-border-l1);
    background: var(--dsw-alias-bg-layer-2);
    color: var(--dsw-alias-label-secondary);
    font-size: 14px;
    line-height: 1;
    cursor: pointer;
  }
  .pfx_restart:hover { color: var(--dsw-alias-label-primary); }
  .pfx_error { padding: 24px; font-size: 12px; color: var(--dsw-alias-state-error-primary); }
  .pfx_info { flex: none; display: flex; align-items: flex-start; gap: 16px; }
  .pfx_infoHead { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 3px; }
  .pfx_infoTitle { font-size: 14px; font-weight: 600; line-height: 20px; }
  .pfx_infoMeta { font-size: 11px; color: var(--dsw-alias-label-secondary); }
  .pfx_desc { margin: 2px 0 0; font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); max-width: 720px; }
  .pfx_tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
  .pfx_tag {
    font-size: 10px;
    line-height: 16px;
    padding: 0 7px;
    border-radius: 999px;
    border: .5px solid var(--dsw-alias-border-l1);
    color: var(--dsw-alias-label-secondary);
    background: var(--dsw-alias-bg-layer-1);
  }
  .pfx_controls { flex: none; display: flex; align-items: center; flex-wrap: wrap; gap: 8px; justify-content: flex-end; }
  .pfx_btn {
    height: 26px;
    padding: 0 10px;
    border-radius: 7px;
    border: .5px solid var(--dsw-alias-border-l1);
    background: transparent;
    color: var(--dsw-alias-label-secondary);
    font-size: 11px;
    line-height: 1;
    font-family: inherit;
    cursor: pointer;
  }
  .pfx_btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
  .pfx_check { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--dsw-alias-label-secondary); cursor: pointer; }
  .pfx_check input { margin: 0; }
  .pfx_link { font-size: 11px; color: var(--dsw-alias-brand-primary); text-decoration: none; }
  .pfx_link:hover { text-decoration: underline; }
  .pfx_code {
    flex: none;
    border-radius: 10px;
    border: .5px solid var(--dsw-alias-border-l1);
    background: var(--dsw-alias-bg-layer-1);
    overflow: hidden;
  }
  .pfx_codeHead {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    padding: 6px 10px;
    border-bottom: .5px solid var(--dsw-alias-border-l1);
  }
  .pfx_codeTitle { font-size: 11px; color: var(--dsw-alias-label-secondary); }
  .pfx_pre {
    margin: 0;
    padding: 8px 12px 10px;
    max-height: 150px;
    overflow: auto;
    font-family: ui-monospace, SFMono-Regular, "Cascadia Mono", Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 16px;
    color: var(--dsw-alias-label-primary);
    white-space: pre;
  }
  .pfx_footer {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 18px 10px;
    font-size: 10.5px;
    color: var(--dsw-alias-label-secondary);
    border-top: .5px solid var(--dsw-alias-border-l1);
  }
  @media (max-width: 860px) {
    .pfx_body { flex-direction: column; }
    .pfx_listWrap { width: auto; height: 180px; border-right: 0; border-bottom: .5px solid var(--dsw-alias-border-l1); }
    .pfx_preview { padding: 12px; }
    .pfx_stage { min-height: 180px; }
    .pfx_info { flex-direction: column; }
  }
`

export const inject = ["slots", "locale"]

export function apply(ctx) {
  ctx.effect(() => ctx.locale.register(NS, DICTS), "pixelfx: dictionaries")
  const translate = ctx.locale.bind(NS)

  ctx.slots.inject("sidebar.panellist", () =>
    ctx.slots.register(
      {
        name: "sidebar.panellist",
        id: PANEL_ID,
        order: 20,
        locale: NS,
        label: () => translate("panel.label"),
      },
      PixelfxIcon,
    ),
  )

  ctx.slots.inject("main", () =>
    ctx.slots.register(
      {
        name: "main",
        key: PANEL_ID,
      },
      PixelfxEntry,
    ),
  )

  ctx.slots.inject("conversation.view", () =>
    ctx.slots.register(
      {
        name: "conversation.view",
        id: PANEL_ID,
        order: 30,
        locale: NS,
        label: () => translate("view.label"),
      },
      PixelfxEntry,
    ),
  )
}