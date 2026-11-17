"""Ma'lumotlar modeli: g'oyalar, qaror daraxti tugunlari va kanvaslar."""
from datetime import datetime, timezone
from typing import Optional

from sqlmodel import Field, SQLModel


def now() -> datetime:
    return datetime.now(timezone.utc)


# ---------- G'oya ----------
IDEA_STATUSES = ("yangi", "sinovda", "ishladi", "toxtatildi")


class IdeaBase(SQLModel):
    title: str
    description: str = ""
    tags: str = ""  # vergul bilan: "youtube,short"
    status: str = "yangi"


class Idea(IdeaBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    created_at: datetime = Field(default_factory=now)
    updated_at: datetime = Field(default_factory=now)


class IdeaCreate(IdeaBase):
    pass


class IdeaUpdate(SQLModel):
    title: Optional[str] = None
    description: Optional[str] = None
    tags: Optional[str] = None
    status: Optional[str] = None


# ---------- Qaror daraxti ----------
# kind:    "goya" (ildiz) | "sinov" (tekshiriladigan qadam) | "qadam" (oddiy harakat)
# outcome: "kutilmoqda" | "ishladi" | "ishlamadi"  (faqat sinov uchun)
# branch:  ota tugunning qaysi shoxida turibdi: None | "ishladi" | "ishlamadi"
class TreeNodeBase(SQLModel):
    parent_id: Optional[int] = Field(default=None, foreign_key="treenode.id")
    kind: str = "sinov"
    title: str
    criterion: str = ""  # sinov mezoni: "1000+ ko'rish 7 kunda"
    outcome: str = "kutilmoqda"
    branch: Optional[str] = None
    note: str = ""  # natija izohi: nima ishladi / nima uchun ishlamadi


class TreeNode(TreeNodeBase, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    idea_id: int = Field(foreign_key="idea.id", index=True)
    created_at: datetime = Field(default_factory=now)


class TreeNodeCreate(TreeNodeBase):
    pass


class TreeNodeUpdate(SQLModel):
    title: Optional[str] = None
    kind: Optional[str] = None
    criterion: Optional[str] = None
    outcome: Optional[str] = None
    branch: Optional[str] = None
    note: Optional[str] = None


# ---------- Kanvas (mind map / doska) ----------
CANVAS_KINDS = ("mindmap", "board")


class Canvas(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    idea_id: int = Field(foreign_key="idea.id", index=True)
    kind: str  # "mindmap" | "board"
    data: str = "null"  # kutubxonaning o'z JSON formati, o'zgartirmasdan
    updated_at: datetime = Field(default_factory=now)
