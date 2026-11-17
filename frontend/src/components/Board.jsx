import { useEffect, useMemo, useRef, useState } from 'react'
import { Excalidraw } from '@excalidraw/excalidraw'
import '@excalidraw/excalidraw/index.css'
import { api, debounce } from '../api.js'

// Har bir element o'zgarganda versiyasi oshadi — arzon "o'zgardimi?" tekshiruvi
const sceneVersion = (elements) =>
  elements.reduce((sum, e) => sum + (e.isDeleted ? 0 : e.version), 0) + ':' + elements.filter((e) => !e.isDeleted).length

export default function Board({ ideaId }) {
  const [initial, setInitial] = useState(undefined) // undefined = yuklanmoqda
  const [saved, setSaved] = useState('saqlandi')
  const lastSaved = useRef('')

  useEffect(() => {
    let cancelled = false
    api.getCanvas(ideaId, 'board').then(({ data }) => {
      if (cancelled) return
      lastSaved.current = sceneVersion(data?.elements || [])
      setInitial(
        data
          ? { elements: data.elements, files: data.files, appState: data.appState, scrollToContent: true }
          : null,
      )
    })
    return () => {
      cancelled = true
    }
  }, [ideaId])

  const save = useMemo(
    () =>
      debounce((elements, appState, files) => {
        const live = elements.filter((e) => !e.isDeleted)
        const key = sceneVersion(elements)
        if (key === lastSaved.current) return setSaved('saqlandi')
        lastSaved.current = key
        // Faqat kerakli qismlar saqlanadi (kursor, tanlov va h.k. emas)
        const usedFiles = Object.fromEntries(
          Object.entries(files || {}).filter(([id]) => live.some((e) => e.fileId === id)),
        )
        api
          .saveCanvas(ideaId, 'board', {
            elements: live,
            files: usedFiles,
            appState: { viewBackgroundColor: appState.viewBackgroundColor, gridSize: appState.gridSize ?? null },
          })
          .then(() => setSaved('saqlandi'))
      }, 1000),
    [ideaId],
  )

  useEffect(() => () => save.cancel(), [save])

  if (initial === undefined) return <div className="muted pad">Yuklanmoqda…</div>

  return (
    <div className="board-wrap">
      <div className="board-status muted small">{saved}</div>
      <Excalidraw
        initialData={initial}
        langCode="en"
        onChange={(elements, appState, files) => {
          if (sceneVersion(elements) !== lastSaved.current) setSaved('saqlanmoqda…')
          save(elements, appState, files)
        }}
      />
    </div>
  )
}
