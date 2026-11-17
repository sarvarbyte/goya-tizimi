"""G'oya tizimi — FastAPI backend.

Ishga tushirish:  uvicorn main:app --reload --port 8020
"""
import json
from contextlib import asynccontextmanager
from pathlib import Path
from typing import Any, Optional

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
from sqlmodel import Session, SQLModel, create_engine, select

from models import (
    CANVAS_KINDS,
    IDEA_STATUSES,
    Canvas,
    Idea,
    IdeaCreate,
    IdeaUpdate,
    TreeNode,
    TreeNodeCreate,
    TreeNodeUpdate,
    now,
)

BASE_DIR = Path(__file__).resolve().parent
DB_PATH = BASE_DIR / "ideas.db"
FRONTEND_DIST = BASE_DIR.parent / "frontend" / "dist"

engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"check_same_thread": False})



@asynccontextmanager
async def lifespan(_app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield


app = FastAPI(title="G'oya tizimi", version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


def get_session():
    with Session(engine) as session:
        yield session


def get_idea_or_404(session: Session, idea_id: int) -> Idea:
    idea = session.get(Idea, idea_id)
    if not idea:
        raise HTTPException(404, "G'oya topilmadi")
    return idea


# ======================= G'oyalar =======================
@app.get("/api/ideas")
def list_ideas(
    status: Optional[str] = None,
    tag: Optional[str] = None,
    q: Optional[str] = None,
    session: Session = Depends(get_session),
):
    stmt = select(Idea).order_by(Idea.updated_at.desc())
    if status:
        stmt = stmt.where(Idea.status == status)
    ideas = session.exec(stmt).all()
    if tag:
        ideas = [i for i in ideas if tag in [t.strip() for t in i.tags.split(",")]]
    if q:
        ql = q.lower()
        ideas = [i for i in ideas if ql in i.title.lower() or ql in i.description.lower()]
    return ideas


@app.post("/api/ideas", status_code=201)
def create_idea(data: IdeaCreate, session: Session = Depends(get_session)):
    if data.status not in IDEA_STATUSES:
        raise HTTPException(400, f"Holat {IDEA_STATUSES} dan biri bo'lishi kerak")
    idea = Idea.model_validate(data)
    session.add(idea)
    session.commit()
    session.refresh(idea)
    # Har bir g'oyaning daraxti ildiz tugundan boshlanadi
    session.add(TreeNode(idea_id=idea.id, kind="goya", title=idea.title, outcome="kutilmoqda"))
    session.commit()
    session.refresh(idea)
    return idea


@app.get("/api/ideas/{idea_id}")
def get_idea(idea_id: int, session: Session = Depends(get_session)):
    return get_idea_or_404(session, idea_id)


@app.patch("/api/ideas/{idea_id}")
def update_idea(idea_id: int, data: IdeaUpdate, session: Session = Depends(get_session)):
    idea = get_idea_or_404(session, idea_id)
    changes = data.model_dump(exclude_unset=True)
    if "status" in changes and changes["status"] not in IDEA_STATUSES:
        raise HTTPException(400, f"Holat {IDEA_STATUSES} dan biri bo'lishi kerak")
    for key, value in changes.items():
        setattr(idea, key, value)
    idea.updated_at = now()
    # Sarlavha o'zgarsa, daraxt ildizi ham yangilansin
    if "title" in changes:
        root = session.exec(
            select(TreeNode).where(TreeNode.idea_id == idea_id, TreeNode.parent_id == None)  # noqa: E711
        ).first()
        if root:
            root.title = changes["title"]
            session.add(root)
    session.add(idea)
    session.commit()
    session.refresh(idea)
    return idea


@app.delete("/api/ideas/{idea_id}", status_code=204)
def delete_idea(idea_id: int, session: Session = Depends(get_session)):
    idea = get_idea_or_404(session, idea_id)
    for node in session.exec(select(TreeNode).where(TreeNode.idea_id == idea_id)).all():
        session.delete(node)
    for canvas in session.exec(select(Canvas).where(Canvas.idea_id == idea_id)).all():
        session.delete(canvas)
    session.delete(idea)
    session.commit()


@app.get("/api/stats")
def stats(session: Session = Depends(get_session)):
    ideas = session.exec(select(Idea)).all()
    nodes = session.exec(select(TreeNode).where(TreeNode.kind == "sinov")).all()
    return {
        "ideas": {s: sum(1 for i in ideas if i.status == s) for s in IDEA_STATUSES},
        "tests": {
            o: sum(1 for n in nodes if n.outcome == o) for o in ("kutilmoqda", "ishladi", "ishlamadi")
        },
    }


# ======================= Qaror daraxti =======================
@app.get("/api/ideas/{idea_id}/tree")
def get_tree(idea_id: int, session: Session = Depends(get_session)):
    get_idea_or_404(session, idea_id)
    return session.exec(
        select(TreeNode).where(TreeNode.idea_id == idea_id).order_by(TreeNode.id)
    ).all()


@app.post("/api/ideas/{idea_id}/tree", status_code=201)
def add_node(idea_id: int, data: TreeNodeCreate, session: Session = Depends(get_session)):
    idea = get_idea_or_404(session, idea_id)
    if data.parent_id is not None:
        parent = session.get(TreeNode, data.parent_id)
        if not parent or parent.idea_id != idea_id:
            raise HTTPException(400, "Ota tugun bu g'oyaga tegishli emas")
    node = TreeNode(idea_id=idea_id, **data.model_dump())
    session.add(node)
    idea.updated_at = now()
    if idea.status == "yangi" and node.kind == "sinov":
        idea.status = "sinovda"
    session.add(idea)
    session.commit()
    session.refresh(node)
    return node


@app.patch("/api/nodes/{node_id}")
def update_node(node_id: int, data: TreeNodeUpdate, session: Session = Depends(get_session)):
    node = session.get(TreeNode, node_id)
    if not node:
        raise HTTPException(404, "Tugun topilmadi")
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(node, key, value)
    session.add(node)
    idea = session.get(Idea, node.idea_id)
    if idea:
        idea.updated_at = now()
        session.add(idea)
    session.commit()
    session.refresh(node)
    return node


@app.delete("/api/nodes/{node_id}", status_code=204)
def delete_node(node_id: int, session: Session = Depends(get_session)):
    node = session.get(TreeNode, node_id)
    if not node:
        raise HTTPException(404, "Tugun topilmadi")
    if node.parent_id is None:
        raise HTTPException(400, "Ildiz tugunni o'chirib bo'lmaydi — g'oyani o'chiring")
    # Tugun va uning barcha avlodlarini o'chirish
    all_nodes = session.exec(select(TreeNode).where(TreeNode.idea_id == node.idea_id)).all()
    children: dict[int, list[TreeNode]] = {}
    for n in all_nodes:
        children.setdefault(n.parent_id, []).append(n)
    stack = [node]
    while stack:
        cur = stack.pop()
        stack.extend(children.get(cur.id, []))
        session.delete(cur)
    session.commit()


# ======================= Kanvaslar =======================
def check_kind(kind: str) -> None:
    if kind not in CANVAS_KINDS:
        raise HTTPException(400, f"Kanvas turi {CANVAS_KINDS} dan biri bo'lishi kerak")


@app.get("/api/ideas/{idea_id}/canvas/{kind}")
def get_canvas(idea_id: int, kind: str, session: Session = Depends(get_session)):
    check_kind(kind)
    get_idea_or_404(session, idea_id)
    canvas = session.exec(
        select(Canvas).where(Canvas.idea_id == idea_id, Canvas.kind == kind)
    ).first()
    return {"kind": kind, "data": json.loads(canvas.data) if canvas else None}


@app.put("/api/ideas/{idea_id}/canvas/{kind}")
def save_canvas(idea_id: int, kind: str, body: dict[str, Any], session: Session = Depends(get_session)):
    check_kind(kind)
    idea = get_idea_or_404(session, idea_id)
    canvas = session.exec(
        select(Canvas).where(Canvas.idea_id == idea_id, Canvas.kind == kind)
    ).first() or Canvas(idea_id=idea_id, kind=kind)
    canvas.data = json.dumps(body.get("data"), ensure_ascii=False)
    canvas.updated_at = now()
    idea.updated_at = now()
    session.add(canvas)
    session.add(idea)
    session.commit()
    return {"ok": True}


# ======================= Frontend (build qilingan) =======================
# `npm run build` dan keyin hamma narsa bitta portda: http://localhost:8020
if FRONTEND_DIST.exists():
    app.mount("/assets", StaticFiles(directory=FRONTEND_DIST / "assets"), name="assets")

    @app.get("/{full_path:path}")
    def spa(full_path: str):
        file = FRONTEND_DIST / full_path
        if full_path and file.is_file():
            return FileResponse(file)
        return FileResponse(FRONTEND_DIST / "index.html")
