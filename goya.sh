#!/usr/bin/env bash
# G'oya tizimi launcher.
#   ./goya.sh            ilovani ishga tushiradi va brauzerda ochadi
#   ./goya.sh --install  `goya` buyrug'i va "G'oya tizimi" ilova belgisini qo'shadi
#   ./goya.sh --dev      dasturlash rejimi (Vite, o'zgarishlar darhol ko'rinadi)
#   ./goya.sh --build    frontendni qayta qurish (src o'zgartirgandan keyin)
# Port: 8020 (Beatframe 8000/8001, Maxzan 8010/5173 bilan to'qnashmasligi uchun).
set -e
DIR="$(cd "$(dirname "$(readlink -f "$0")")" && pwd)"
cd "$DIR"
PORT=8020
URL="http://localhost:$PORT"

if [ "$1" = "--install" ]; then
  mkdir -p "$HOME/.local/bin" "$HOME/.local/share/applications"
  chmod +x "$DIR/goya.sh"
  ln -sf "$DIR/goya.sh" "$HOME/.local/bin/goya"
  cat > "$HOME/.local/share/applications/goya-tizimi.desktop" <<DESKTOP
[Desktop Entry]
Type=Application
Name=G'oya tizimi
Comment=G'oya va rejalar: qaror daraxti, mind map, doska
Exec=bash "$DIR/goya.sh"
Icon=$DIR/icon.svg
Terminal=true
Categories=Office;Utility;
DESKTOP
  update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true
  echo "✓ O'rnatildi."
  echo "  • Yangi terminalda 'goya' deb yozing"
  echo "  • Yoki ilovalar menyusida \"G'oya tizimi\" ni qidiring (dock'ga qadab qo'yish mumkin)"
  exit 0
fi

port_open() { (exec 3<>"/dev/tcp/127.0.0.1/$1") 2>/dev/null; }

# Allaqachon ishlayaptimi? Faqat brauzerni ochamiz.
if [ "$1" != "--dev" ] && port_open "$PORT"; then
  xdg-open "$URL" >/dev/null 2>&1 &
  echo "G'oya tizimi allaqachon ishlayapti → $URL"
  sleep 1
  exit 0
fi

fail() {
  echo "✗ $1"
  read -r -p "Yopish uchun Enter bosing" _
  exit 1
}

echo "G'oya tizimi ishga tushmoqda… (to'xtatish uchun shu oynani yoping yoki Ctrl+C)"

# 1) Python muhiti (uv bo'lsa — tezroq)
cd "$DIR/backend"
if [ ! -x .venv/bin/uvicorn ]; then
  echo "→ Python paketlari o'rnatilmoqda (faqat birinchi marta)…"
  if command -v uv >/dev/null; then
    uv venv -q .venv && uv pip install -q --python .venv/bin/python -r requirements.txt
  else
    python3 -m venv .venv || fail "python3-venv kerak: sudo apt install python3-venv"
    .venv/bin/pip install -q -r requirements.txt
  fi
fi

# 2) Frontend: tayyor build bor, faqat yo'q bo'lsa yoki --build/--dev da npm kerak
need_npm() {
  command -v npm >/dev/null || fail "npm topilmadi (Node.js o'rnating)"
  [ -d "$DIR/frontend/node_modules" ] || (cd "$DIR/frontend" && npm install)
}
if [ "$1" = "--build" ] || [ ! -f "$DIR/frontend/dist/index.html" ]; then
  need_npm
  echo "→ Frontend qurilmoqda…"
  (cd "$DIR/frontend" && npm run build)
fi

if [ "$1" = "--dev" ]; then
  need_npm
  .venv/bin/uvicorn main:app --reload --port "$PORT" &
  BACK_PID=$!
  trap 'kill $BACK_PID 2>/dev/null' EXIT INT TERM HUP
  (sleep 3 && xdg-open http://localhost:5173 >/dev/null 2>&1) &
  cd "$DIR/frontend" && GOYA_API_PORT=$PORT npm run dev
  exit 0
fi

.venv/bin/uvicorn main:app --port "$PORT" &
BACK_PID=$!
trap 'kill $BACK_PID 2>/dev/null; exit 0' EXIT INT TERM HUP

for _ in $(seq 1 40); do
  port_open "$PORT" && break
  sleep 0.25
done
xdg-open "$URL" >/dev/null 2>&1 &
echo "✓ G'oya tizimi ochildi → $URL"
wait
