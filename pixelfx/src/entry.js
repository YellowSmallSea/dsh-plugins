import * as React from "react"
import { effects, categories } from "../vendor/pixelfx/src/fx/index.js"
import {
  actBounds,
  actorAlphaOf,
  BACKDROPS,
  backdrop,
  clearFrame,
  composite,
  createAct,
  createFrame,
  createFx,
  drawActor,
  PAL,
  painterFor,
  stockActor,
} from "../vendor/pixelfx/src/core/index.js"

const h = React.createElement
const NS = "dsh-pixelfx"
const PANEL_ID = "pixelfx"
const SPEEDS = [0.25, 0.5, 1, 2]

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
  "preview.backdrop": "背景",
  "preview.palette": "调色板",
  "preview.ownPalette": "特效自带",
  "preview.newSeed": "换种子",
  "preview.mirror": "镜像",
  "preview.actor": "角色",
  "preview.sheet": "精灵表",
  "preview.code": "用法代码",
  "preview.source": "源码",
  "preview.copy": "复制",
  "preview.copied": "已复制",
  "preview.close": "关闭",
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
  "backdrop.none": "无",
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
  "preview.backdrop": "Backdrop",
  "preview.palette": "Palette",
  "preview.ownPalette": "its own",
  "preview.newSeed": "New seed",
  "preview.mirror": "Mirror",
  "preview.actor": "Character",
  "preview.sheet": "Sprite sheet",
  "preview.code": "Usage code",
  "preview.source": "Source",
  "preview.copy": "Copy",
  "preview.copied": "Copied",
  "preview.close": "Close",
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
  "backdrop.none": "none",
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

function effectOptions(options) {
  const resolved = { flip: Boolean(options.flip) }
  if (options.seed !== undefined) resolved.seed = options.seed
  if (options.palette !== "" && PAL[options.palette] !== undefined) resolved.palette = PAL[options.palette]
  return resolved
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
  const backdropKind = options.backdrop
  const background = backdropKind === "none" ? null : backdrop(backdropKind, width, height, y)
  const step = 1 / (Number(meta.fps) > 0 ? Number(meta.fps) : 30)
  const extra = effectOptions(options)

  const instantiate = () =>
    (acted ? createAct : createFx)(mod, { x, y, ...extra })

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
        painterFor(target).place(x, y, Boolean(options.flip)),
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

function PreviewCanvas({ entry, playing, speed, backdrop: backdropKind, actor, flip, seed, palette, t }) {
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
      player = createPlayer(canvas, entry, { actor, backdrop: backdropKind, flip, seed, palette })
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
  }, [entry, actor, backdropKind, flip, seed, palette])

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
  }, [entry, actor, backdropKind, flip, seed, palette])

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

function buildCode(entry, options) {
  const opts = ["x: 160", "y: 140"]
  if (options.flip) opts.push("flip: true")
  if (options.palette !== "") opts.push(`palette: PAL.${options.palette}`)
  if (options.seed !== undefined) opts.push(`seed: ${options.seed}`)
  const acted = Boolean(entry.mod.act)
  const create = acted ? "createAct" : "createFx"
  return [
    `import { createFrame, ${create}, composite } from "pixelfx";`,
    `import * as effect from "pixelfx/fx/${entry.id}";`,
    "",
    "const frame = createFrame(320, 180);",
    `const fx = ${create}(effect, { ${opts.join(", ")} });`,
    "",
    "// every tick",
    "fx.update(dt);",
    'fx.draw(frame, "front");',
    "composite(frame, imageData.data, null);",
  ].join("\n")
}

function CodeOverlay({ entry, options, onClose, t }) {
  const [copied, setCopied] = React.useState(false)
  const code = buildCode(entry, options)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1600)
    } catch {
      setCopied(false)
    }
  }
  React.useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [onClose])

  return h(
    "div",
    { className: "pfx_codeOverlay" },
    h(
      "div",
      { className: "pfx_codeHead" },
      h("span", { className: "pfx_codeTitle" }, t("code.title")),
      h(
        "div",
        { className: "pfx_codeActions" },
        h(
          "a",
          {
            className: "pfx_link",
            href: `https://github.com/patch-gg/pixelfx/blob/main/src/fx/${entry.id}.js`,
            target: "_blank",
            rel: "noreferrer noopener",
          },
          t("preview.source"),
        ),
        h("button", { type: "button", className: "pfx_btn", onClick: copy }, copied ? t("preview.copied") : t("preview.copy")),
        h("button", { type: "button", className: "pfx_btn", onClick: onClose, "aria-label": t("preview.close") }, "✕"),
      ),
    ),
    h("pre", { className: "pfx_pre pfx_preFull" }, code),
  )
}

function exportSpriteSheet(entry, options) {
  const meta = entry.meta
  const width = Math.max(1, Math.ceil(meta.size[0]))
  const height = Math.max(1, Math.ceil(meta.size[1]))
  const frames = Math.max(1, Math.round(Number(meta.duration) * Number(meta.fps)) + (meta.loop ? 0 : 1))
  const columns = Math.min(frames, Math.max(1, Math.ceil(Math.sqrt((frames * height) / width))))
  const rows = Math.ceil(frames / columns)
  const canvas = document.createElement("canvas")
  canvas.width = columns * width
  canvas.height = rows * height
  const context = canvas.getContext("2d")
  if (context === null) return
  const frame = createFrame(width, height)
  const image = context.createImageData(width, height)
  const step = 1 / (Number(meta.fps) > 0 ? Number(meta.fps) : 30)
  const instance = createFx(entry.mod, {
    x: Number(meta.origin?.[0] ?? 0),
    y: Number(meta.origin?.[1] ?? 0),
    ...effectOptions(options),
  })
  for (let index = 0; index < frames; index += 1) {
    if (index > 0) instance.update(step)
    instance.draw(clearFrame(frame))
    composite(frame, image.data, null)
    context.putImageData(image, (index % columns) * width, Math.floor(index / columns) * height)
  }
  const link = document.createElement("a")
  link.href = canvas.toDataURL("image/png")
  link.download = `${entry.id.replace(/\//g, "-")}.png`
  link.click()
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
  const [backdropKind, setBackdropKind] = React.useState(FX_BY_ID.get(DEFAULT_EFFECT)?.meta.bg ?? "dark")
  const [actor, setActor] = React.useState(true)
  const [flip, setFlip] = React.useState(false)
  const [seed, setSeed] = React.useState(undefined)
  const [palette, setPalette] = React.useState("")
  const [showCode, setShowCode] = React.useState(false)

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
  const options = { flip, seed, palette }

  const selectEffect = React.useCallback((id) => {
    setSelectedId(id)
    const next = FX_BY_ID.get(id)
    setBackdropKind(next?.meta.bg ?? "dark")
    setFlip(false)
    setSeed(undefined)
    setPalette("")
    setShowCode(false)
  }, [])

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
      h("div", { className: "pfx_listWrap" }, h(EffectList, { items: filtered, selectedId, onSelect: selectEffect, t })),
      h(
        "div",
        { className: "pfx_preview" },
        h(
          "div",
          { className: "pfx_metaRow" },
          h("span", { className: "pfx_metaName" }, selected.name),
          h(
            "span",
            { className: "pfx_metaFacts" },
            `${selectedCategory?.name ?? selected.category} · ${selected.meta.size[0]}×${selected.meta.size[1]} · ${
              selected.meta.fps
            } fps · ${selected.meta.loop ? t("meta.loop") : formatDuration(selected.meta)}`,
          ),
          Array.isArray(selected.meta.tags) && selected.meta.tags.length > 0
            ? h(
                "span",
                { className: "pfx_tags" },
                selected.meta.tags.slice(0, 4).map((tag) => h("span", { className: "pfx_tag", key: tag }, tag)),
              )
            : null,
        ),
        h(PreviewCanvas, {
          entry: selected,
          playing,
          speed,
          backdrop: backdropKind,
          actor,
          flip,
          seed,
          palette,
          t,
        }),
        h(
          "div",
          { className: "pfx_controls" },
          h("button", { type: "button", className: "pfx_btn", onClick: () => setPlaying((value) => !value) }, playing ? t("preview.pause") : t("preview.play")),
          h("button", { type: "button", className: "pfx_btn", onClick: () => setFlip((value) => !value), "data-active": flip ? "true" : undefined }, t("preview.mirror")),
          h(
            "label",
            { className: "pfx_field" },
            h("span", { className: "pfx_fieldLabel" }, t("preview.speed")),
            h(
              "select",
              {
                className: "pfx_select pfx_selectSmall",
                value: String(speed),
                onChange: (event) => setSpeed(Number(event.target.value)),
              },
              SPEEDS.map((value) => h("option", { value: String(value), key: value }, `${value}×`)),
            ),
          ),
          h(
            "label",
            { className: "pfx_field" },
            h("span", { className: "pfx_fieldLabel" }, t("preview.backdrop")),
            h(
              "select",
              {
                className: "pfx_select pfx_selectSmall",
                value: backdropKind,
                onChange: (event) => setBackdropKind(event.target.value),
              },
              BACKDROPS.map((kind) => h("option", { value: kind, key: kind }, kind)),
              h("option", { value: "none" }, t("backdrop.none")),
            ),
          ),
          h(
            "label",
            { className: "pfx_field" },
            h("span", { className: "pfx_fieldLabel" }, t("preview.palette")),
            h(
              "select",
              {
                className: "pfx_select pfx_selectSmall",
                value: palette,
                onChange: (event) => setPalette(event.target.value),
              },
              h("option", { value: "" }, t("preview.ownPalette")),
              Object.keys(PAL).map((key) => h("option", { value: key, key }, key)),
            ),
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
          h("button", { type: "button", className: "pfx_btn", onClick: () => setSeed(1 + Math.floor(Math.random() * 9999)) }, t("preview.newSeed")),
          h("button", { type: "button", className: "pfx_btn", onClick: () => exportSpriteSheet(selected, options) }, t("preview.sheet")),
          h("button", { type: "button", className: "pfx_btn", onClick: () => setShowCode(true) }, t("preview.code")),
        ),
        h("p", { className: "pfx_desc" }, selected.description),
        showCode ? h(CodeOverlay, { entry: selected, options, onClose: () => setShowCode(false), t }) : null,
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
    flex: 1;
    height: 100%;
    max-height: calc(var(--dsh-conversation-viewport-height, 100vh) - var(--dsh-composer-height, 0px));
    min-height: 0;
    overflow: hidden;
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
    padding: 8px 18px;
    border-bottom: .5px solid var(--dsw-alias-border-l1);
  }
  .pfx_titleBlock { display: flex; flex-direction: column; gap: 0; min-width: 0; }
  .pfx_title { font-size: 13px; font-weight: 600; line-height: 18px; }
  .pfx_subtitle { font-size: 10.5px; line-height: 14px; color: var(--dsw-alias-label-secondary); }
  .pfx_spacer { flex: 1; }
  .pfx_search {
    width: 210px;
    max-width: 38vw;
    height: 26px;
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
    height: 26px;
    padding: 0 7px;
    border-radius: 7px;
    border: .5px solid var(--dsw-alias-border-l1);
    background: var(--dsw-alias-bg-layer-1);
    color: var(--dsw-alias-label-primary);
    font-size: 11px;
    font-family: inherit;
  }
  .pfx_selectSmall { height: 24px; }
  .pfx_body { flex: 1; min-height: 0; display: flex; }
  .pfx_listWrap {
    width: 272px;
    flex: none;
    min-height: 0;
    overflow: auto;
    overscroll-behavior: contain;
    border-right: .5px solid var(--dsw-alias-border-l1);
    padding: 4px 0 12px;
  }
  .pfx_list { display: flex; flex-direction: column; gap: 1px; }
  .pfx_row {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 10px;
    padding: 4px 14px;
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
    position: relative;
    flex: 1;
    min-width: 0;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 10px 18px 8px;
  }
  .pfx_metaRow { flex: none; display: flex; align-items: baseline; gap: 8px; min-width: 0; flex-wrap: wrap; }
  .pfx_metaName { font-size: 13px; font-weight: 600; line-height: 18px; }
  .pfx_metaFacts { font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
  .pfx_stage {
    position: relative;
    flex: 1;
    min-height: 120px;
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
  .pfx_controls { flex: none; display: flex; align-items: center; flex-wrap: wrap; gap: 6px; }
  .pfx_btn {
    height: 24px;
    padding: 0 9px;
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
  .pfx_btn[data-active="true"] {
    border-color: var(--dsw-alias-brand-primary);
    color: var(--dsw-alias-brand-primary);
  }
  .pfx_field { display: inline-flex; align-items: center; gap: 4px; }
  .pfx_fieldLabel { font-size: 10.5px; color: var(--dsw-alias-label-secondary); }
  .pfx_check { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--dsw-alias-label-secondary); cursor: pointer; }
  .pfx_check input { margin: 0; }
  .pfx_link { font-size: 11px; color: var(--dsw-alias-brand-primary); text-decoration: none; }
  .pfx_link:hover { text-decoration: underline; }
  .pfx_tags { display: inline-flex; flex-wrap: wrap; gap: 3px; }
  .pfx_tag {
    font-size: 9.5px;
    line-height: 15px;
    padding: 0 6px;
    border-radius: 999px;
    border: .5px solid var(--dsw-alias-border-l1);
    color: var(--dsw-alias-label-secondary);
  }
  .pfx_desc { flex: none; margin: 0; font-size: 11.5px; line-height: 16px; color: var(--dsw-alias-label-secondary); display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
  .pfx_codeOverlay {
    position: absolute;
    inset: 0;
    z-index: 2;
    display: flex;
    flex-direction: column;
    background: var(--dsw-alias-bg-base);
    padding: 8px 0 0;
  }
  .pfx_codeHead {
    flex: none;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    padding: 6px 12px;
    border-bottom: .5px solid var(--dsw-alias-border-l1);
  }
  .pfx_codeTitle { font-size: 11px; color: var(--dsw-alias-label-secondary); }
  .pfx_codeActions { display: flex; align-items: center; gap: 8px; }
  .pfx_pre {
    margin: 0;
    padding: 10px 12px;
    overflow: auto;
    font-family: ui-monospace, SFMono-Regular, "Cascadia Mono", Menlo, Consolas, monospace;
    font-size: 11px;
    line-height: 16px;
    color: var(--dsw-alias-label-primary);
    white-space: pre;
  }
  .pfx_preFull { flex: 1; min-height: 0; }
  .pfx_footer {
    flex: none;
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 4px 18px 6px;
    font-size: 10px;
    color: var(--dsw-alias-label-secondary);
    border-top: .5px solid var(--dsw-alias-border-l1);
  }
  @media (max-width: 860px) {
    .pfx_body { flex-direction: column; }
    .pfx_listWrap { width: auto; height: 150px; border-right: 0; border-bottom: .5px solid var(--dsw-alias-border-l1); }
    .pfx_preview { padding: 8px 12px 6px; }
    .pfx_stage { min-height: 100px; }
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
        locale: NS,
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