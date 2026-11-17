import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  ReactFlowProvider,
  useReactFlow,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { api } from '../api.js'

const NODE_W = 230
const H_GAP = 40
const V_GAP = 150

const KIND_LABEL = { goya: "G'oya", sinov: 'Sinov', qadam: 'Qadam' }
const OUTCOME_LABEL = { kutilmoqda: 'Kutilmoqda', ishladi: 'Ishladi', ishlamadi: 'Ishlamadi' }
const BRANCH_ORDER = { ishladi: 0, null: 1, ishlamadi: 2 }
const BRANCH_COLOR = { ishladi: '#1D9E75', ishlamadi: '#D85A30', null: '#9c9a92' }

// ---------- Avtomatik joylashtirish: har bir shox o'z kengligini oladi ----------
function layout(list) {
  const children = {}
  list.forEach((n) => (children[n.parent_id ?? 'root'] ||= []).push(n))
  Object.values(children).forEach((arr) =>
    arr.sort((a, b) => BRANCH_ORDER[a.branch] - BRANCH_ORDER[b.branch] || a.id - b.id),
  )
  const width = {}
  const measure = (n) => {
    const kids = children[n.id] || []
    width[n.id] = kids.length
      ? Math.max(NODE_W, kids.reduce((s, k) => s + measure(k), 0) + H_GAP * (kids.length - 1))
      : NODE_W
    return width[n.id]
  }
  const pos = {}
  const place = (n, left, depth) => {
    pos[n.id] = { x: left + width[n.id] / 2 - NODE_W / 2, y: depth * V_GAP }
    let x = left + (width[n.id] - childrenWidth(n)) / 2
    for (const k of children[n.id] || []) {
      place(k, x, depth + 1)
      x += width[k.id] + H_GAP
    }
  }
  const childrenWidth = (n) => {
    const kids = children[n.id] || []
    return kids.reduce((s, k) => s + width[k.id], 0) + H_GAP * Math.max(0, kids.length - 1)
  }
  let left = 0
  for (const root of children.root || []) {
    measure(root)
    place(root, left, 0)
    left += width[root.id] + H_GAP
  }
  return pos
}

// ---------- Tugun ko'rinishi ----------
function TreeNodeCard({ data, selected }) {
  const n = data.node
  const tone = n.kind === 'goya' ? 'goya' : n.kind === 'sinov' ? `sinov-${n.outcome}` : 'qadam'
  return (
    <div className={`tnode ${tone} ${selected ? 'selected' : ''}`}>
      <Handle type="target" position={Position.Top} isConnectable={false} />
      <div className="tnode-top">
        <span className="tnode-kind">{KIND_LABEL[n.kind]}</span>
        {n.kind === 'sinov' && <span className={`outcome o-${n.outcome}`}>{OUTCOME_LABEL[n.outcome]}</span>}
      </div>
      <div className="tnode-title">{n.title}</div>
      {n.criterion && <div className="tnode-sub">Mezon: {n.criterion}</div>}
      {n.note && <div className="tnode-sub note">{n.note}</div>}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  )
}
const nodeTypes = { card: TreeNodeCard }

// ---------- Asosiy komponent ----------
function TreeInner({ ideaId, onChange }) {
  const [list, setList] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const { fitView } = useReactFlow()

  const reload = useCallback(
    () => api.getTree(ideaId).then((l) => setList(l)),
    [ideaId],
  )
  useEffect(() => {
    reload()
  }, [reload])

  // Tugunlar soni o'zgarsa, ko'rinishni moslash
  useEffect(() => {
    const t = setTimeout(() => fitView({ padding: 0.25, duration: 300, maxZoom: 1.1 }), 50)
    return () => clearTimeout(t)
  }, [list.length, fitView])

  const { nodes, edges } = useMemo(() => {
    const pos = layout(list)
    return {
      nodes: list.map((n) => ({
        id: String(n.id),
        type: 'card',
        position: pos[n.id] || { x: 0, y: 0 },
        data: { node: n },
        selected: n.id === selectedId,
        style: { width: NODE_W },
      })),
      edges: list
        .filter((n) => n.parent_id)
        .map((n) => {
          const color = BRANCH_COLOR[n.branch]
          return {
            id: `e${n.parent_id}-${n.id}`,
            source: String(n.parent_id),
            target: String(n.id),
            type: 'smoothstep',
            label: n.branch === 'ishladi' ? '✓ ishladi' : n.branch === 'ishlamadi' ? '✗ ishlamadi' : undefined,
            labelStyle: { fill: color, fontWeight: 500 },
            labelBgStyle: { fill: 'var(--surface)' },
            style: { stroke: color, strokeWidth: n.branch ? 2 : 1.5 },
            markerEnd: { type: MarkerType.ArrowClosed, color },
          }
        }),
    }
  }, [list, selectedId])

  const selected = list.find((n) => n.id === selectedId)

  const addChild = async (parent, kind, branch = null) => {
    const defaults = {
      sinov: { title: 'Yangi sinov', criterion: '' },
      qadam: {
        title: branch === 'ishladi' ? 'Kengaytirish' : branch === 'ishlamadi' ? "O'zgartirish yoki to'xtatish" : 'Yangi qadam',
      },
    }
    const node = await api.addNode(ideaId, { parent_id: parent.id, kind, branch, ...defaults[kind] })
    await reload()
    onChange?.() // backend g'oya holatini "sinovda"ga o'tkazgan bo'lishi mumkin
    setSelectedId(node.id)
  }

  const update = async (patch) => {
    const node = await api.updateNode(selected.id, patch)
    setList((l) => l.map((n) => (n.id === node.id ? node : n)))
  }

  const remove = async () => {
    const count = countDescendants(list, selected.id)
    const msg = count ? `Bu tugun va uning ostidagi ${count} ta tugun o'chirilsinmi?` : "Bu tugun o'chirilsinmi?"
    if (!window.confirm(msg)) return
    await api.deleteNode(selected.id)
    setSelectedId(null)
    reload()
  }

  return (
    <div className="tree-wrap">
      <div className="tree-canvas">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          nodesDraggable={false}
          nodesConnectable={false}
          onNodeClick={(_, n) => setSelectedId(Number(n.id))}
          onPaneClick={() => setSelectedId(null)}
          fitView
          minZoom={0.2}
          proOptions={{ hideAttribution: true }}
        >
          <Background gap={20} size={1} />
          <Controls showInteractive={false} />
        </ReactFlow>
        {list.length === 1 && !selected && (
          <div className="tree-hint">G'oya tugunini bosing va birinchi sinovni qo'shing</div>
        )}
      </div>

      {selected && (
        <NodePanel
          key={selected.id}
          node={selected}
          onUpdate={update}
          onAdd={(kind, branch) => addChild(selected, kind, branch)}
          onDelete={remove}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}

function countDescendants(list, id) {
  const kids = list.filter((n) => n.parent_id === id)
  return kids.reduce((s, k) => s + 1 + countDescendants(list, k.id), 0)
}

// ---------- Tanlangan tugunni tahrirlash paneli ----------
function NodePanel({ node, onUpdate, onAdd, onDelete, onClose }) {
  const [f, setF] = useState({ title: node.title, criterion: node.criterion, note: node.note })
  const blur = (field) => f[field] !== node[field] && onUpdate({ [field]: f[field] })
  const isRoot = node.kind === 'goya'

  return (
    <aside className="panel">
      <div className="panel-head">
        <strong>{KIND_LABEL[node.kind]}</strong>
        <button className="icon-btn" onClick={onClose} aria-label="Yopish">×</button>
      </div>

      <label>Nomi</label>
      <input
        value={f.title}
        disabled={isRoot}
        title={isRoot ? "G'oya nomini yuqoridagi sarlavhadan o'zgartiring" : undefined}
        onChange={(e) => setF({ ...f, title: e.target.value })}
        onBlur={() => blur('title')}
      />

      {!isRoot && (
        <>
          <label>Turi</label>
          <div className="seg">
            {['sinov', 'qadam'].map((k) => (
              <button key={k} className={node.kind === k ? 'active' : ''} onClick={() => onUpdate({ kind: k })}>
                {KIND_LABEL[k]}
              </button>
            ))}
          </div>
        </>
      )}

      {node.kind === 'sinov' && (
        <>
          <label>Sinov mezoni (oldindan yozing!)</label>
          <input
            value={f.criterion}
            placeholder="Masalan: 7 kunda 1000+ ko'rish"
            onChange={(e) => setF({ ...f, criterion: e.target.value })}
            onBlur={() => blur('criterion')}
          />
          <label>Natija</label>
          <div className="seg outcome-seg">
            {Object.entries(OUTCOME_LABEL).map(([k, label]) => (
              <button key={k} className={`o-${k} ${node.outcome === k ? 'active' : ''}`} onClick={() => onUpdate({ outcome: k })}>
                {label}
              </button>
            ))}
          </div>
        </>
      )}

      <label>{node.kind === 'sinov' ? 'Izoh: nima ishladi / nima uchun ishlamadi' : 'Izoh'}</label>
      <textarea
        rows={3}
        value={f.note}
        onChange={(e) => setF({ ...f, note: e.target.value })}
        onBlur={() => blur('note')}
      />

      <div className="panel-actions">
        {node.kind === 'sinov' ? (
          <>
            <button className="btn ok" onClick={() => onAdd('qadam', 'ishladi')}>+ Ishladi shoxi</button>
            <button className="btn fail" onClick={() => onAdd('qadam', 'ishlamadi')}>+ Ishlamadi shoxi</button>
          </>
        ) : (
          <>
            <button className="btn primary" onClick={() => onAdd('sinov')}>+ Sinov</button>
            <button className="btn" onClick={() => onAdd('qadam')}>+ Qadam</button>
          </>
        )}
      </div>

      {!isRoot && (
        <button className="btn danger ghost full" onClick={onDelete}>
          Tugunni o'chirish
        </button>
      )}
    </aside>
  )
}

export default function DecisionTree(props) {
  return (
    <ReactFlowProvider>
      <TreeInner {...props} />
    </ReactFlowProvider>
  )
}
