from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routers import auth as auth_router
from .routers import banking as banking_router


app = FastAPI(title=settings.app_name)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router.router, prefix="/auth", tags=["auth"])
app.include_router(banking_router.router, prefix="/bank", tags=["bank"])


@app.get("/")
def read_root() -> dict:
    return {"name": settings.app_name, "status": "ok"}