window.__ModuleLoader__.load({
  id: '@yellowsmallsea/dsh-cot-graph',
  factory(require) {
    const React = require('react')
    const h = React.createElement

    const NS = 'dsh-cot-graph'
    const EMPTY_SELECTOR = (snapshot) => snapshot

    const zh = {
      'meta.title': '思考链图谱',
      'meta.description': '以节点图展示会话中的推理步骤、工具调用与子代理派发。',
      'view.label': '思考图',
      'header.title': '思考链图谱',
      'header.subtitle': '推理 · 工具 · 子代理派发',
      'stats.steps': '步骤',
      'stats.tools': '工具',
      'stats.subagents': '子代理',
      'zoom.in': '放大',
      'zoom.out': '缩小',
      'zoom.fit': '适应宽度',
      'empty.title': '还没有可绘制的思考链',
      'empty.hint': '发送一条消息后，模型的推理步骤、工具调用和子代理派发会在这里连成一张图。',
      'empty.missing': '当前界面无法读取会话轨迹（Trajectory）数据，请确认轨迹视图插件已启用。',
      'kind.prompt': '输入',
      'kind.step': '推理',
      'kind.tool': '工具',
      'kind.note': '记录',
      'kind.partial': '进行中',
      'badge.subagent': '子代理',
      'status.running': '运行中',
      'status.done': '已完成',
      'status.error': '出错',
      'detail.reasoning': '推理过程',
      'detail.answer': '回答内容',
      'detail.prompt': '下发内容',
      'detail.args': '调用参数',
      'detail.result': '返回结果',
      'detail.error': '错误信息',
      'detail.meta': '节点信息',
      'detail.close': '关闭详情',
      'detail.subcalls': '子调用',
      'detail.empty': '无内容',
      'detail.answerOnly': '仅回答，无推理',
      'tool.subcalls': '个子调用',
    }

    const en = {
      'meta.title': 'Chain Graph',
      'meta.description': 'Draws reasoning steps, tool calls, and sub-agent dispatches of a conversation as a node graph.',
      'view.label': 'Chain graph',
      'header.title': 'Chain Graph',
      'header.subtitle': 'Reasoning · tools · sub-agent dispatch',
      'stats.steps': 'steps',
      'stats.tools': 'tools',
      'stats.subagents': 'sub-agents',
      'zoom.in': 'Zoom in',
      'zoom.out': 'Zoom out',
      'zoom.fit': 'Fit width',
      'empty.title': 'No thinking chain yet',
      'empty.hint': 'Send a message and the model reasoning, tool calls, and sub-agent dispatches will connect into a graph here.',
      'empty.missing': 'Session trajectory data is unavailable. Check that the trajectory view plugin is enabled.',
      'kind.prompt': 'Input',
      'kind.step': 'Reasoning',
      'kind.tool': 'Tool',
      'kind.note': 'Record',
      'kind.partial': 'In progress',
      'badge.subagent': 'Sub-agent',
      'status.running': 'Running',
      'status.done': 'Done',
      'status.error': 'Error',
      'detail.reasoning': 'Reasoning',
      'detail.answer': 'Answer',
      'detail.prompt': 'Dispatched content',
      'detail.args': 'Arguments',
      'detail.result': 'Result',
      'detail.error': 'Error',
      'detail.meta': 'Node',
      'detail.close': 'Close details',
      'detail.subcalls': 'Sub-calls',
      'detail.empty': 'Empty',
      'detail.answerOnly': 'Answer without reasoning',
      'tool.subcalls': 'sub-calls',
    }

    const DICTS = { zh, en }
    const CARD = {
      prompt: { w: 300, h: 94 },
      step: { w: 324, h: 138 },
      tool: { w: 296, h: 104 },
      delegation: { w: 318, h: 120 },
      note: { w: 272, h: 78 },
      partial: { w: 324, h: 138 },
    }
    const SPINE_X = 28
    const LANE1_X = 404
    const LANE2_X = 772
    const ROW_GAP = 30
    const BRANCH_GAP = 14

    const DELEGATION_TOOLS = new Set([
      'subagent',
      'subagent_fork',
      'spawn_teammate',
      'workflow',
      'ralph',
    ])

    const ARG_KEYS = [
      'prompt',
      'task',
      'description',
      'instructions',
      'command',
      'query',
      'path',
      'file_path',
      'pattern',
      'url',
      'message',
      'text',
      'title',
      'name',
    ]

    function isDelegation(name) {
      if (typeof name !== 'string') return false
      if (DELEGATION_TOOLS.has(name)) return true
      return name.startsWith('subagent') || name.startsWith('team_') || name.startsWith('spawn_')
    }

    function parseJson(raw) {
      if (typeof raw !== 'string' || raw.trim() === '') return undefined
      try {
        const value = JSON.parse(raw)
        return value !== null && typeof value === 'object' ? value : undefined
      } catch {
        return undefined
      }
    }

    function stringOf(value) {
      if (typeof value === 'string') return value
      if (typeof value === 'number' || typeof value === 'boolean') return String(value)
      return ''
    }

    function contentText(content) {
      if (!content) return ''
      if (typeof content === 'string') return content
      if (!Array.isArray(content)) return ''
      const parts = []
      for (const part of content) {
        if (!part) continue
        if (typeof part === 'string') {
          parts.push(part)
          continue
        }
        if (part.type === 'text' && typeof part.text === 'string') {
          parts.push(part.text)
          continue
        }
        if (part.type === 'image') {
          parts.push('[image]')
          continue
        }
        if (part.type === 'file') {
          const name = part.name ?? part.attachment?.name
          parts.push(name === undefined ? '[file]' : `[file: ${name}]`)
          continue
        }
        if (typeof part.text === 'string') parts.push(part.text)
      }
      return parts.filter((part) => part !== '').join('\n')
    }

    function joinBlocks(blocks, kind) {
      const texts = []
      for (const block of blocks) {
        if (!block || block.kind !== kind) continue
        if (typeof block.text !== 'string') continue
        if (block.text.trim() === '') continue
        texts.push(block.text)
      }
      return texts.join('\n\n')
    }

    function compact(text, limit) {
      const normalized = String(text ?? '').replace(/\s+/g, ' ').trim()
      if (normalized.length <= limit) return normalized
      return `${normalized.slice(0, limit - 1)}…`
    }

    function firstName(text) {
      const normalized = String(text ?? '').replace(/\s+/g, ' ').trim()
      const dot = normalized.search(/[。.!?！？]/u)
      return compact(dot > 0 ? normalized.slice(0, dot) : normalized, 72)
    }

    function firstValue(args) {
      if (!args || typeof args !== 'object') return ''
      for (const key of ARG_KEYS) {
        const text = stringOf(args[key])
        if (text.trim() !== '') return text
      }
      return ''
    }

    function agentOf(args) {
      if (!args || typeof args !== 'object') return ''
      for (const key of ['agent', 'role', 'teammate', 'agentName', 'agent_id', 'name']) {
        const text = stringOf(args[key])
        if (text.trim() !== '') return text
      }
      return ''
    }

    function prettyJson(raw) {
      if (typeof raw !== 'string' || raw.trim() === '') return ''
      const parsed = parseJson(raw)
      if (parsed === undefined) return raw
      try {
        const text = JSON.stringify(parsed, null, 2)
        return text.length > 8000 ? `${text.slice(0, 8000)}\n…` : text
      } catch {
        return raw
      }
    }

    function makeNodeId(prefix, seq) {
      return `${prefix}:${String(seq)}`
    }

    function buildToolItem(input, t) {
      const raw = input.argsRaw
      const args = parseJson(raw)
      const result = input.result ?? null
      const delegation = isDelegation(input.name)
      const status = result === null ? 'running' : result.isError === true ? 'error' : 'done'
      const resultText = result === null ? '' : contentText(result.content)
      const errorMessage =
        result === null
          ? ''
          : stringOf(result.error?.message) || (result.isError === true ? resultText : '')
      const name = input.name || 'tool'
      const subCalls = Array.isArray(result?.subCalls)
        ? result.subCalls
        : Array.isArray(input.subCalls)
          ? input.subCalls
          : []
      const promptText = delegation ? firstValue(args) : ''
      const title = delegation ? agentOf(args) || name : name
      const detail = {
        kind: delegation ? 'delegation' : 'tool',
        name,
        callId: input.callId === undefined ? '' : String(input.callId),
        argsRaw: raw,
        argsPretty: prettyJson(raw),
        promptText,
        resultText,
        errorMessage,
        subCalls,
        status,
      }
      return {
        id: makeNodeId('call', input.callId ?? `${name}:${input.seq ?? ''}`),
        kind: delegation ? 'delegation' : 'tool',
        eyebrow: delegation ? `${t('badge.subagent')} · ${t(`status.${status}`)}` : `${t('kind.tool')} · ${t(`status.${status}`)}`,
        title: compact(title, 48),
        preview: delegation ? compact(promptText || firstValue(args) || resultText, 260) : compact(firstValue(args) || raw, 260),
        status,
        badge: delegation ? 'subagent' : null,
        detail,
      }
    }

    function buildModel(snapshot, t) {
      const nodes = Array.isArray(snapshot?.eventNodes) ? snapshot.eventNodes : []
      const resultByCall = new Map()
      for (const node of nodes) {
        if (node?.kind !== 'tool-result') continue
        const id = String(node.callId ?? '')
        if (id !== '') resultByCall.set(id, node)
      }
      const consumed = new Set()
      const entries = []
      const stats = { steps: 0, tools: 0, subagents: 0 }

      for (const node of nodes) {
        if (!node || typeof node !== 'object') continue
        if (node.kind === 'user' || node.kind === 'steering') {
          const text = contentText(node.content)
          if (text.trim() === '') continue
          entries.push({
            spine: {
              id: makeNodeId('input', node.seq),
              kind: 'prompt',
              eyebrow: t(node.kind === 'steering' ? 'kind.note' : 'kind.prompt'),
              title: t('kind.prompt'),
              preview: compact(text, 280),
              detail: { kind: 'prompt', text },
            },
            branches: [],
          })
          continue
        }
        if (node.kind === 'assistant') {
          const blocks = Array.isArray(node.blocks) ? node.blocks : []
          const reasoning = joinBlocks(blocks, 'reasoning')
          const answer = joinBlocks(blocks, 'text')
          const toolBlocks = blocks.filter((block) => block?.kind === 'tool-call')
          const interrupted = node.interrupted === true
          const stepLabel = `${node.turn ?? '?'}.${node.step ?? '?'}`
          stats.steps += 1
          const title = interrupted ? `${t('kind.step')} ${stepLabel} · ${t('status.error')}` : `${t('kind.step')} ${stepLabel}`
          const item = {
            id: makeNodeId('step', node.seq),
            kind: 'step',
            eyebrow: `${t('kind.step')} · ${stepLabel}${toolBlocks.length > 0 ? ` · ${toolBlocks.length} ${t('stats.tools')}` : ''}`,
            title,
            preview: compact(reasoning || answer, 380),
            detail: {
              kind: 'step',
              turn: node.turn,
              step: node.step,
              reasoning,
              answer,
              blocks,
              usage: node.usage ?? null,
              interrupted,
            },
          }
          const branches = []
          for (const block of toolBlocks) {
            const callId = String(block.callId ?? '')
            consumed.add(callId)
            const result = resultByCall.get(callId) ?? null
            const branch = buildToolItem(
              {
                callId,
                name: block.name ?? '',
                argsRaw: block.argsRaw ?? '',
                result,
                seq: callId,
              },
              t,
            )
            if (branch.kind === 'delegation') stats.subagents += 1
            else stats.tools += 1
            branches.push(branch)
          }
          entries.push({ spine: item, branches })
          continue
        }
        if (node.kind === 'tool-result') {
          const callId = String(node.callId ?? '')
          if (consumed.has(callId)) continue
          consumed.add(callId)
          const item = buildToolItem(
            {
              callId,
              name: node.name ?? '',
              argsRaw: node.call?.argsRaw ?? '',
              result: node,
              seq: callId,
            },
            t,
          )
          if (item.kind === 'delegation') stats.subagents += 1
          else stats.tools += 1
          entries.push({ spine: item, branches: [] })
          continue
        }
        if (node.kind === 'context' || node.kind === 'system-prompt') continue
        entries.push({
          spine: {
            id: makeNodeId('note', node.seq),
            kind: 'note',
            eyebrow: t('kind.note'),
            title: compact(stringOf(node.kind) || t('kind.note'), 48),
            preview: compact(contentText(node.content) || '', 200),
            detail: { kind: 'note', text: contentText(node.content) || '' },
          },
          branches: [],
        })
      }

      const partial = snapshot?.partial
      if (partial && Array.isArray(partial.blocks) && partial.blocks.length > 0) {
        const reasoning = joinBlocks(partial.blocks, 'reasoning')
        const answer = joinBlocks(partial.blocks, 'text')
        if (reasoning !== '' || answer !== '') {
          const branches = []
          const pending = new Map()
          for (const block of partial.blocks) {
            if (block?.kind !== 'tool-call') continue
            const callId = String(block.callId ?? '')
            const result = resultByCall.get(callId) ?? null
            pending.set(callId, true)
            branches.push(
              buildToolItem(
                { callId, name: block.name ?? '', argsRaw: block.argsRaw ?? '', result, seq: callId },
                t,
              ),
            )
          }
          for (const call of Array.isArray(snapshot.runningCalls) ? snapshot.runningCalls : []) {
            const callId = String(call?.callId ?? '')
            if (callId === '' || pending.has(callId) || consumed.has(callId)) continue
            pending.set(callId, true)
            branches.push(
              buildToolItem(
                { callId, name: call?.name ?? '', argsRaw: call?.argsRaw ?? '', result: null, seq: callId },
                t,
              ),
            )
          }
          for (const branch of branches) {
            if (branch.kind === 'delegation') stats.subagents += 1
            else stats.tools += 1
          }
          entries.push({
            spine: {
              id: makeNodeId('partial', partial.step ?? 'live'),
              kind: 'partial',
              eyebrow: `${t('kind.partial')} · ${partial.turn ?? '?'}.${partial.step ?? '?'}`,
              title: t('kind.partial'),
              preview: compact(reasoning || answer, 380),
              detail: { kind: 'step', reasoning, answer, blocks: partial.blocks, usage: null, interrupted: false },
            },
            branches,
          })
        }
      }

      // Lay out: one spine node per row, its branch nodes stacked in the right lanes.
      let cursorY = 0
      let maxX = 0
      const laid = []
      const edges = []
      for (const entry of entries) {
        const spineMeta = CARD[entry.spine.kind] ?? CARD.note
        entry.spine.w = spineMeta.w
        entry.spine.h = spineMeta.h
        entry.spine.x = SPINE_X
        entry.spine.y = cursorY
        let branchY = cursorY
        for (const branch of entry.branches) {
          const meta = CARD[branch.kind] ?? CARD.tool
          branch.w = meta.w
          branch.h = meta.h
          branch.x = branch.kind === 'delegation' ? LANE2_X : LANE1_X
          branch.y = branchY
          branchY += meta.h + BRANCH_GAP
          maxX = Math.max(maxX, branch.x + meta.w)
          edges.push({
            kind: branch.kind,
            d: curve(SPINE_X + spineMeta.w, cursorY + 30, branch.x, branch.y + 30),
          })
        }
        const band = Math.max(spineMeta.h, branchY - BRANCH_GAP - cursorY, 0)
        maxX = Math.max(maxX, SPINE_X + spineMeta.w)
        laid.push(entry)
        cursorY += band + ROW_GAP
      }

      const flat = []
      for (const entry of laid) {
        flat.push(entry.spine)
        for (const branch of entry.branches) flat.push(branch)
      }
      const rail =
        laid.length > 0
          ? {
              d: `M 12 ${laid[0].spine.y + 18} L 12 ${laid[laid.length - 1].spine.y + laid[laid.length - 1].spine.h - 18}`,
              ticks: laid.map((entry) => `M 12 ${entry.spine.y + 30} L ${SPINE_X} ${entry.spine.y + 30}`),
            }
          : null

      const byId = new Map()
      for (const item of flat) byId.set(item.id, item)

      return {
        entries: laid,
        nodes: flat,
        edges,
        rail,
        byId,
        width: maxX + 48,
        height: Math.max(cursorY - ROW_GAP, 0) + 48,
        stats,
        empty: flat.length === 0,
        missing: snapshot === undefined || snapshot === null,
      }
    }

    function curve(x1, y1, x2, y2) {
      const dx = Math.max(28, Math.min(90, (x2 - x1) / 2))
      return `M ${x1} ${y1} C ${x1 + dx} ${y1} ${x2 - dx} ${y2} ${x2} ${y2}`
    }

    function useTranslate(tProp) {
      return React.useCallback(
        (key) => {
          if (typeof tProp === 'function') {
            const value = tProp(key)
            if (typeof value === 'string' && value !== '') return value
          }
          const language =
            typeof document !== 'undefined' && document?.documentElement?.lang?.toLowerCase().startsWith('zh')
              ? 'zh'
              : 'en'
          const dict = DICTS[language] ?? DICTS.en
          return dict[key] ?? DICTS.zh[key] ?? key
        },
        [tProp],
      )
    }

    function NodeCard({ item, active, onSelect }) {
      const onKeyDown = (event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onSelect(item.id)
        }
      }
      return h(
        'div',
        {
          className: 'cotg_node',
          'data-kind': item.kind,
          'data-status': item.status ?? 'done',
          'data-active': active ? 'true' : undefined,
          role: 'button',
          tabIndex: 0,
          title: item.preview,
          style: { left: item.x, top: item.y, width: item.w, height: item.h },
          onClick: () => onSelect(item.id),
          onKeyDown,
        },
        h(
          'div',
          { className: 'cotg_eyebrow' },
          h('span', { className: 'cotg_dot', 'data-status': item.status ?? 'done' }),
          h('span', { className: 'cotg_eyebrowText' }, item.eyebrow),
        ),
        h('div', { className: 'cotg_cardTitle' }, item.title),
        h('div', { className: 'cotg_cardText' }, item.preview || ' '),
      )
    }

    function DetailRow({ label, children }) {
      return h(
        'div',
        { className: 'cotg_detailRow' },
        h('div', { className: 'cotg_detailLabel' }, label),
        children,
      )
    }

    function DetailPanel({ item, onClose, t }) {
      const detail = item.detail ?? {}
      const sections = []

      if (detail.reasoning) {
        sections.push(h(DetailRow, { key: 'reasoning', label: t('detail.reasoning') }, h('div', { className: 'cotg_pre' }, detail.reasoning)))
      }
      if (detail.answer) {
        sections.push(h(DetailRow, { key: 'answer', label: t('detail.answer') }, h('div', { className: 'cotg_pre' }, detail.answer)))
      }
      if (detail.text) {
        sections.push(h(DetailRow, { key: 'text', label: t('detail.prompt') }, h('div', { className: 'cotg_pre' }, detail.text)))
      }
      if (item.kind === 'delegation' && detail.promptText) {
        sections.push(h(DetailRow, { key: 'prompt', label: t('detail.prompt') }, h('div', { className: 'cotg_pre' }, detail.promptText)))
      }
      if (detail.argsPretty) {
        sections.push(h(DetailRow, { key: 'args', label: t('detail.args') }, h('div', { className: 'cotg_pre' }, detail.argsPretty)))
      }
      if (detail.errorMessage) {
        sections.push(
          h(
            DetailRow,
            { key: 'error', label: t('detail.error') },
            h('div', { className: 'cotg_pre cotg_preError' }, detail.errorMessage),
          ),
        )
      }
      if (detail.resultText) {
        sections.push(h(DetailRow, { key: 'result', label: t('detail.result') }, h('div', { className: 'cotg_pre' }, detail.resultText)))
      }
      if (Array.isArray(detail.subCalls) && detail.subCalls.length > 0) {
        const names = detail.subCalls
          .map((call) => stringOf(call?.name) || stringOf(call?.call?.name))
          .filter((name) => name !== '')
        if (names.length > 0) {
          sections.push(
            h(
              DetailRow,
              { key: 'subcalls', label: t('detail.subcalls') },
              h('div', { className: 'cotg_chips' }, names.map((name, index) => h('span', { className: 'cotg_chip', key: `${name}-${index}` }, name))),
            ),
          )
        }
      }
      const metaParts = []
      if (detail.name) metaParts.push(`${t('kind.tool')}: ${detail.name}`)
      if (detail.status) metaParts.push(t(`status.${detail.status}`))
      if (detail.callId) metaParts.push(`call: ${detail.callId}`)
      if (detail.turn !== undefined) metaParts.push(`turn ${detail.turn}.${detail.step ?? '?'}`)
      if (detail.usage && typeof detail.usage.outputTokens === 'number') metaParts.push(`${detail.usage.outputTokens} tokens`)
      if (metaParts.length > 0) {
        sections.push(
          h(DetailRow, { key: 'meta', label: t('detail.meta') }, h('div', { className: 'cotg_metaLine' }, metaParts.join(' · '))),
        )
      }
      if (sections.length === 0) {
        sections.push(h('div', { key: 'empty', className: 'cotg_emptyNote' }, t('detail.empty')))
      }

      return h(
        'aside',
        { className: 'cotg_detail', role: 'complementary', 'aria-label': t('detail.meta') },
        h(
          'div',
          { className: 'cotg_detailHead' },
          h(
            'div',
            { className: 'cotg_detailTitleWrap' },
            h('div', { className: 'cotg_detailKind' }, item.eyebrow),
            h('div', { className: 'cotg_detailTitle' }, item.title),
          ),
          h(
            'button',
            { type: 'button', className: 'cotg_btn cotg_close', onClick: onClose, title: t('detail.close'), 'aria-label': t('detail.close') },
            '✕',
          ),
        ),
        h('div', { className: 'cotg_detailBody' }, sections),
      )
    }

    function EmptyState({ missing, t }) {
      return h(
        'div',
        { className: 'cotg_empty' },
        h(
          'svg',
          { viewBox: '0 0 120 84', width: 180, height: 126, 'aria-hidden': true, className: 'cotg_emptyArt' },
          h('path', { d: 'M 26 18 C 46 18 58 42 74 42', fill: 'none', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1.5 }),
          h('path', { d: 'M 26 66 C 46 66 58 42 74 42', fill: 'none', stroke: 'var(--dsw-alias-border-l2)', strokeWidth: 1.5 }),
          h('circle', { cx: 20, cy: 18, r: 7, fill: 'var(--dsw-alias-bg-layer-2)', stroke: 'var(--dsw-alias-border-l2)' }),
          h('circle', { cx: 20, cy: 66, r: 7, fill: 'var(--dsw-alias-bg-layer-2)', stroke: 'var(--dsw-alias-border-l2)' }),
          h('circle', { cx: 82, cy: 42, r: 9, fill: 'var(--dsw-alias-brand-primary)' }),
        ),
        h('div', { className: 'cotg_emptyTitle' }, missing ? t('empty.missing') : t('empty.title')),
        missing ? null : h('div', { className: 'cotg_emptyHint' }, t('empty.hint')),
      )
    }

    const CSS = `
      .cotg_root {
        flex: 1;
        min-height: 0;
        display: flex;
        flex-direction: column;
        background: var(--dsw-alias-bg-base);
        color: var(--dsw-alias-label-primary);
      }
      .cotg_toolbar {
        flex: none;
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 8px 18px;
        border-bottom: .5px solid var(--dsw-alias-border-l1);
      }
      .cotg_titleBlock { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
      .cotg_title { font-size: 13px; font-weight: 600; line-height: 18px; }
      .cotg_subtitle { font-size: 11px; line-height: 15px; color: var(--dsw-alias-label-secondary); }
      .cotg_stats { display: flex; align-items: center; gap: 6px; }
      .cotg_stat {
        font-size: 11px;
        line-height: 16px;
        padding: 1px 8px;
        border-radius: 999px;
        border: .5px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-1);
        color: var(--dsw-alias-label-secondary);
      }
      .cotg_spacer { flex: 1; }
      .cotg_zoom { display: flex; align-items: center; gap: 4px; }
      .cotg_scale { min-width: 44px; text-align: center; font-size: 11px; color: var(--dsw-alias-label-secondary); }
      .cotg_btn {
        height: 26px;
        min-width: 26px;
        padding: 0 8px;
        border-radius: 6px;
        border: .5px solid var(--dsw-alias-border-l1);
        background: transparent;
        color: var(--dsw-alias-label-secondary);
        font-size: 11px;
        line-height: 1;
        cursor: pointer;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        font-family: inherit;
      }
      .cotg_btn:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
      .cotg_btn:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .cotg_body { flex: 1; min-height: 0; display: flex; position: relative; }
      .cotg_scroll { flex: 1; min-width: 0; overflow: auto; padding: 20px 24px 64px; }
      .cotg_canvas { position: relative; }
      .cotg_stage { position: relative; }
      .cotg_edges { position: absolute; inset: 0; overflow: visible; pointer-events: none; }
      .cotg_node {
        position: absolute;
        box-sizing: border-box;
        display: flex;
        flex-direction: column;
        gap: 3px;
        padding: 9px 12px 10px;
        border-radius: 10px;
        background: var(--dsw-alias-bg-layer-1);
        border: .5px solid var(--dsw-alias-border-l1);
        border-left: 3px solid var(--dsw-alias-border-l2);
        cursor: pointer;
        overflow: hidden;
        transition: background .12s ease, border-color .12s ease, box-shadow .12s ease;
      }
      .cotg_node:hover { background: var(--dsw-alias-bg-layer-2); }
      .cotg_node:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
      .cotg_node[data-active="true"] { border-color: var(--dsw-alias-brand-primary); box-shadow: 0 0 0 1px var(--dsw-alias-brand-primary) inset; }
      .cotg_node[data-kind="prompt"] { border-left-color: var(--dsw-alias-brand-primary); }
      .cotg_node[data-kind="step"] { border-left-color: var(--dsw-alias-label-secondary); }
      .cotg_node[data-kind="partial"] { border-left-color: var(--dsw-alias-state-warn-primary); }
      .cotg_node[data-kind="tool"] { border-left-color: var(--dsw-alias-border-l2); }
      .cotg_node[data-kind="delegation"] { border-left-color: var(--dsw-alias-state-success-primary); }
      .cotg_node[data-kind="note"] { border-left-color: var(--dsw-alias-state-idle-primary); }
      .cotg_node[data-status="error"] { border-left-color: var(--dsw-alias-state-error-primary); }
      .cotg_eyebrow {
        display: flex;
        align-items: center;
        gap: 5px;
        font-size: 10px;
        line-height: 14px;
        color: var(--dsw-alias-label-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cotg_eyebrowText { overflow: hidden; text-overflow: ellipsis; }
      .cotg_dot { width: 5px; height: 5px; border-radius: 50%; flex: none; background: var(--dsw-alias-label-secondary); }
      .cotg_dot[data-status="done"] { background: var(--dsw-alias-state-success-primary); }
      .cotg_dot[data-status="running"] { background: var(--dsw-alias-state-warn-primary); }
      .cotg_dot[data-status="error"] { background: var(--dsw-alias-state-error-primary); }
      .cotg_badge {
        flex: none;
        font-size: 9px;
        line-height: 13px;
        padding: 0 5px;
        border-radius: 4px;
        border: .5px solid var(--dsw-alias-state-success-primary);
        color: var(--dsw-alias-state-success-primary);
      }
      .cotg_cardTitle {
        font-size: 12.5px;
        font-weight: 600;
        line-height: 18px;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .cotg_cardText {
        font-size: 11.5px;
        line-height: 16px;
        color: var(--dsw-alias-label-secondary);
        display: -webkit-box;
        -webkit-box-orient: vertical;
        overflow: hidden;
        word-break: break-word;
      }
      .cotg_node[data-kind="step"] .cotg_cardText,
      .cotg_node[data-kind="partial"] .cotg_cardText { -webkit-line-clamp: 4; }
      .cotg_node[data-kind="prompt"] .cotg_cardText { -webkit-line-clamp: 2; }
      .cotg_node[data-kind="tool"] .cotg_cardText,
      .cotg_node[data-kind="delegation"] .cotg_cardText { -webkit-line-clamp: 2; }
      .cotg_empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; padding: 40px; text-align: center; }
      .cotg_emptyArt { opacity: .8; }
      .cotg_emptyTitle { font-size: 13px; font-weight: 600; }
      .cotg_emptyHint { font-size: 12px; line-height: 18px; color: var(--dsw-alias-label-secondary); max-width: 380px; }
      .cotg_detail {
        width: 340px;
        flex: none;
        display: flex;
        flex-direction: column;
        min-height: 0;
        border-left: .5px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-1);
      }
      .cotg_detailHead {
        flex: none;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 12px 12px 10px 16px;
        border-bottom: .5px solid var(--dsw-alias-border-l1);
      }
      .cotg_detailTitleWrap { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
      .cotg_detailKind { font-size: 10px; line-height: 14px; color: var(--dsw-alias-label-secondary); }
      .cotg_detailTitle { font-size: 13px; font-weight: 600; line-height: 18px; word-break: break-word; }
      .cotg_close { flex: none; }
      .cotg_detailBody { flex: 1; min-height: 0; overflow: auto; padding: 12px 16px 24px; display: flex; flex-direction: column; gap: 14px; }
      .cotg_detailRow { display: flex; flex-direction: column; gap: 5px; }
      .cotg_detailLabel { font-size: 10px; letter-spacing: .04em; text-transform: uppercase; color: var(--dsw-alias-label-secondary); }
      .cotg_pre {
        font-size: 11.5px;
        line-height: 17px;
        white-space: pre-wrap;
        word-break: break-word;
        color: var(--dsw-alias-label-primary);
        font-family: ui-monospace, SFMono-Regular, "Cascadia Mono", Menlo, Consolas, monospace;
      }
      .cotg_preError { color: var(--dsw-alias-state-error-primary); }
      .cotg_metaLine { font-size: 11px; line-height: 16px; color: var(--dsw-alias-label-secondary); word-break: break-word; }
      .cotg_chips { display: flex; flex-wrap: wrap; gap: 4px; }
      .cotg_chip {
        font-size: 10.5px;
        line-height: 16px;
        padding: 0 7px;
        border-radius: 999px;
        border: .5px solid var(--dsw-alias-border-l1);
        background: var(--dsw-alias-bg-layer-2);
        color: var(--dsw-alias-label-secondary);
      }
      .cotg_emptyNote { font-size: 12px; color: var(--dsw-alias-label-secondary); }
      .cotg_fallback { padding: 16px; font-size: 12px; line-height: 18px; color: var(--dsw-alias-state-error-primary); }
    `

    class ViewGuard extends React.Component {
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
            'div',
            { className: 'cotg_fallback' },
            `cot-graph: ${String(this.state.error?.message ?? this.state.error)}`,
          )
        }
        return this.props.children
      }
    }

    function ChainGraphEntry(props) {
      return h(ViewGuard, null, h(ChainGraphView, props))
    }

    function ChainGraphView(props) {
      const t = useTranslate(props.t)
      const useTrajectory = props.useTrajectory
      const snapshot = typeof useTrajectory === 'function' ? useTrajectory(EMPTY_SELECTOR) : undefined
      const model = React.useMemo(() => buildModel(snapshot, t), [snapshot, t])
      const [selectedId, setSelectedId] = React.useState(null)
      const [scale, setScale] = React.useState(1)
      const scrollRef = React.useRef(null)
      const fittedRef = React.useRef(false)

      React.useEffect(() => {
        if (fittedRef.current) return
        const element = scrollRef.current
        if (!element || model.width <= 0) return
        fittedRef.current = true
        const available = element.clientWidth - 48
        if (available > 0 && model.width > available) {
          setScale(Math.max(0.7, Math.min(1, available / model.width)))
        }
      }, [model.width])

      const selected = selectedId === null ? undefined : model.byId.get(selectedId)

      React.useEffect(() => {
        if (selectedId === null) return undefined
        const onKeyDown = (event) => {
          if (event.key === 'Escape') setSelectedId(null)
        }
        window.addEventListener('keydown', onKeyDown)
        return () => window.removeEventListener('keydown', onKeyDown)
      }, [selectedId])

      const fit = React.useCallback(() => {
        const element = scrollRef.current
        if (!element || model.width <= 0) return
        const available = element.clientWidth - 48
        if (available <= 0) return
        setScale(Math.max(0.4, Math.min(1.6, available / model.width)))
      }, [model.width])

      const toolbar = h(
        'div',
        { className: 'cotg_toolbar' },
        h(
          'div',
          { className: 'cotg_titleBlock' },
          h('div', { className: 'cotg_title' }, t('header.title')),
          h('div', { className: 'cotg_subtitle' }, t('header.subtitle')),
        ),
        model.empty
          ? null
          : h(
              'div',
              { className: 'cotg_stats' },
              h('span', { className: 'cotg_stat' }, `${model.stats.steps} ${t('stats.steps')}`),
              h('span', { className: 'cotg_stat' }, `${model.stats.tools} ${t('stats.tools')}`),
              h('span', { className: 'cotg_stat' }, `${model.stats.subagents} ${t('stats.subagents')}`),
            ),
        h('div', { className: 'cotg_spacer' }),
        h(
          'div',
          { className: 'cotg_zoom' },
          h('button', { type: 'button', className: 'cotg_btn', onClick: () => setScale((value) => Math.max(0.4, value / 1.2)), title: t('zoom.out'), 'aria-label': t('zoom.out') }, '−'),
          h('span', { className: 'cotg_scale' }, `${Math.round(scale * 100)}%`),
          h('button', { type: 'button', className: 'cotg_btn', onClick: () => setScale((value) => Math.min(2, value * 1.2)), title: t('zoom.in'), 'aria-label': t('zoom.in') }, '+'),
          h('button', { type: 'button', className: 'cotg_btn', onClick: fit, title: t('zoom.fit') }, '⤢'),
        ),
      )

      let body
      if (model.empty) {
        body = h(EmptyState, { missing: model.missing, t })
      } else {
        const paths = model.edges.map((edge, index) =>
          h('path', {
            key: `edge-${index}`,
            d: edge.d,
            fill: 'none',
            stroke: 'var(--dsw-alias-border-l2)',
            strokeWidth: 1.2,
          }),
        )
        if (model.rail !== null) {
          paths.push(
            h('path', { key: 'rail', d: model.rail.d, fill: 'none', stroke: 'var(--dsw-alias-border-l1)', strokeWidth: 1 }),
          )
          for (const [index, tick] of model.rail.ticks.entries()) {
            paths.push(
              h('path', { key: `tick-${index}`, d: tick, fill: 'none', stroke: 'var(--dsw-alias-border-l1)', strokeWidth: 1 }),
            )
          }
        }
        body = h(
          'div',
          { className: 'cotg_scroll', ref: scrollRef },
          h(
            'div',
            { className: 'cotg_canvas', style: { width: model.width * scale, height: model.height * scale } },
            h(
              'div',
              { className: 'cotg_stage', style: { width: model.width, height: model.height, transform: `scale(${scale})`, transformOrigin: '0 0' } },
              h(
                'svg',
                { className: 'cotg_edges', width: model.width, height: model.height, viewBox: `0 0 ${model.width} ${model.height}`, 'aria-hidden': true },
                paths,
              ),
              model.nodes.map((item) =>
                h(NodeCard, {
                  key: item.id,
                  item,
                  active: item.id === selectedId,
                  onSelect: setSelectedId,
                }),
              ),
            ),
          ),
        )
      }

      return h(
        'div',
        { className: 'cotg_root' },
        h('style', { key: 'cotg-style' }, CSS),
        toolbar,
        h(
          'div',
          { className: 'cotg_body' },
          body,
          selected === undefined ? null : h(DetailPanel, { item: selected, t, onClose: () => setSelectedId(null) }),
        ),
      )
    }

    return {
      inject: ['slots', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(NS, DICTS), 'cot-graph: dictionaries')
        const translate = ctx.locale.bind(NS)
        ctx.slots.inject('conversation.view', () =>
          ctx.slots.register(
            {
              name: 'conversation.view',
              id: 'cot-graph',
              order: 20,
              locale: NS,
              label: () => translate('view.label'),
            },
            ChainGraphEntry,
          ),
        )
      },
    }
  },
})