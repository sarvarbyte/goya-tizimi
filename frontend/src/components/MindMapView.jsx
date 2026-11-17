import { useEffect, useRef, useState } from 'react'
import MindMap from 'simple-mind-map'
import Drag from 'simple-mind-map/src/plugins/Drag.js'
import Export from 'simple-mind-map/src/plugins/Export.js'
import { api, debounce } from '../api.js'

MindMap.usePlugin(Drag).usePlugin(Export)

// Ilova uslubiga mos mavzu (kutubxonaning standart shrifti xitoycha)
const FONT = "Inter, 'Segoe UI', system-ui, sans-serif"
const THEME = {
  lineColor: '#9c9a92',
  root: { fillColor: '#534AB7', fontFamily: FONT, color: '#fff', borderColor: '#534AB7' },
  second: { fillColor: '#EEEDFE', fontFamily: FONT, color: '#26215C', borderColor: '#AFA9EC' },
  node: { fontFamily: FONT, color: '#444441' },
  generalization: { fontFamily: FONT },
}

const LAYOUTS = [
  { value: 'mindMap', label: 'Mind map' },
  { value: 'logicalStructure', label: "O'ngga shoxlar" },
  { value: 'organizationStructure', label: 'Tashkiliy' },
  { value: 'fishbone', label: 'Baliq suyagi' },
]

export default function MindMapView({ ideaId, rootTitle }) {
  const elRef = useRef(null)
  const mapRef = useRef(null)
  const [layout, setLayout] = useState('mindMap')
  const [saved, setSaved] = useState('saqlandi')
  const [hasActive, setHasActive] = useState(false)

  useEffect(() => {
    let cancelled = false
    let mindMap = null
    const save = debounce(() => {
      if (!mindMap) return
      api.saveCanvas(ideaId, 'mindmap', mindMap.getData(true)).then(() => !cancelled && setSaved('saqlandi'))
    }, 800)

    api.getCanvas(ideaId, 'mindmap').then(({ data }) => {
      if (cancelled || !elRef.current) return
      mindMap = new MindMap({
        el: elRef.current,
        layout: data?.layout || 'mindMap',
        themeConfig: { ...THEME, ...(data?.theme?.config || {}) },
        defaultInsertSecondLevelNodeText: 'Yangi shox',
        defaultInsertBelowSecondLevelNodeText: 'Yangi fikr',
        defaultGeneralizationText: 'Xulosa',
        data: data?.root || {
          data: { text: rootTitle },
          children: [
            { data: { text: 'Nima uchun?' }, children: [] },
            { data: { text: 'Qanday qilaman?' }, children: [] },
            { data: { text: 'Xavflar' }, children: [] },
          ],
        },
      })
      if (data?.theme?.template) mindMap.setTheme(data.theme.template)
      if (data?.view) mindMap.view.setTransformData(data.view)
      mapRef.current = mindMap
      setLayout(mindMap.getLayout())
      mindMap.on('data_change', () => {
        setSaved('saqlanmoqda…')
        save()
      })
      mindMap.on('node_active', (_, list) => setHasActive(list.length > 0))
      if (!data) save.flush() // birinchi marta ochilganda boshlang'ich xarita saqlansin
    })

    const onResize = () => mapRef.current?.resize()
    window.addEventListener('resize', onResize)
    return () => {
      cancelled = true
      window.removeEventListener('resize', onResize)
      if (mindMap) {
        save.flush()
        mindMap.destroy()
      }
      mapRef.current = null
    }
  }, [ideaId])

  const exec = (cmd) => mapRef.current?.execCommand(cmd)
  const changeLayout = (v) => {
    setLayout(v)
    mapRef.current?.setLayout(v)
    api.saveCanvas(ideaId, 'mindmap', mapRef.current.getData(true))
  }
  const exportPng = () => mapRef.current?.export('png', true, `mindmap-${ideaId}`)

  return (
    <div className="mm-wrap">
      <div className="toolbar">
        <button className="btn" disabled={!hasActive} onClick={() => exec('INSERT_CHILD_NODE')}>+ Shox (Tab)</button>
        <button className="btn" disabled={!hasActive} onClick={() => exec('INSERT_NODE')}>+ Yonma-yon (Enter)</button>
        <button className="btn" disabled={!hasActive} onClick={() => exec('REMOVE_NODE')}>O'chirish (Del)</button>
        <button className="btn" onClick={() => exec('BACK')}>↶</button>
        <button className="btn" onClick={() => exec('FORWARD')}>↷</button>
        <select value={layout} onChange={(e) => changeLayout(e.target.value)}>
          {LAYOUTS.map((l) => (
            <option key={l.value} value={l.value}>{l.label}</option>
          ))}
        </select>
        <button className="btn" onClick={exportPng}>PNG</button>
        <span className="muted small push">{saved} · tugunni tanlang, ikki marta bosib tahrirlang</span>
      </div>
      <div ref={elRef} className="mm-canvas" />
    </div>
  )
}
