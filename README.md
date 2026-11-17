# G'oya tizimi

G'oya va rejalarni vizual saqlash uchun shaxsiy tizim. Har bir g'oyaning bitta kartochkasi bor, uning ichida uchta ko'rinish:

- **Qaror daraxti** — g'oya → sinov (mezoni bilan) → *ishladi* / *ishlamadi* shoxlari → keyingi qadam
- **Mind map** — g'oyani shoxlarga yoyish (mind map, o'ngga shoxlar, tashkiliy, baliq suyagi)
- **Doska** — Excalidraw bilan erkin chizish

Hammasi noutbukda lokal ishlaydi, ma'lumotlar `backend/ideas.db` faylida saqlanadi.

## Ishga tushirish

Kerak: Python 3.10+ (yoki `uv`). Node.js faqat frontend kodini o'zgartirsangiz kerak.

```bash
bash goya.sh --install   # bir marta: `goya` buyrug'i va menyudagi "G'oya tizimi" belgisi
goya                     # yoki menyudan bosing → http://localhost:8020
goya --dev               # kod yozish uchun: http://localhost:5173, o'zgarishlar darhol ko'rinadi
goya --build             # src o'zgargandan keyin frontendni qayta qurish
```

Port **8020** — Beatframe (8000/8001) va Maxzan (8010/5173) bilan to'qnashmaydi.
Birinchi ishga tushirishda Python paketlari o'rnatiladi (bir necha soniya). Ilova allaqachon ishlayotgan bo'lsa, tugma faqat brauzerni ochadi.

## Qanday ishlatiladi

1. **Inbox** — g'oyani yozib Enter bosing. Teglar: `Yangi short formati #youtube #short`.
2. G'oyani oching → **Qaror daraxti** → g'oya tugunini bosing → **+ Sinov**.
3. Sinovga **mezon** yozing (oldindan!): masalan, "7 kunda 1000+ ko'rish".
4. Natija aniq bo'lgach: **Ishladi** / **Ishlamadi** ni tanlang va izoh yozing.
5. **+ Ishladi shoxi** / **+ Ishlamadi shoxi** bilan keyingi qadamni qo'shing.

Inbox'dagi statistika nechta sinov ishlagan / ishlamaganini ko'rsatadi.

### Mind map tugmalari
| Tugma | Amal |
|---|---|
| Tab | Tanlangan tugunga shox qo'shish |
| Enter | Yonma-yon tugun |
| Delete | O'chirish |
| Ikki marta bosish | Matnni tahrirlash |
| Ctrl+Z / Ctrl+Y | Orqaga / oldinga |

## Tuzilma

```
goya-tizimi/
├── backend/            FastAPI + SQLModel + SQLite
│   ├── main.py         API endpointlar (+ build qilingan frontendni beradi)
│   ├── models.py       ideas, tree_nodes, canvases jadvallari
│   └── ideas.db        ma'lumotlar (avtomatik yaratiladi)
├── frontend/           React + Vite
│   └── src/
│       ├── pages/      Inbox, IdeaPage
│       ├── components/ DecisionTree (React Flow), MindMapView (simple-mind-map), Board (Excalidraw)
│       └── api.js
├── goya.sh           launcher (Maxzan'dagi kabi)
└── icon.svg
```

API hujjati: ishga tushgandan keyin http://localhost:8020/docs

## Zaxira nusxa

Barcha ma'lumot bitta faylda — `backend/ideas.db`. Uni nusxalab qo'yish kifoya.

## Ishlatilgan ochiq kodli kutubxonalar

- [Excalidraw](https://github.com/excalidraw/excalidraw) — MIT
- [simple-mind-map](https://github.com/wanglin2/mind-map) — MIT (mualliflik belgisini saqlash sharti bilan)
- [React Flow / xyflow](https://github.com/xyflow/xyflow) — MIT
- FastAPI, SQLModel — MIT
