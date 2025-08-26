from fastapi import FastAPI
from .db import Base, engine
from .routers import auth as auth_router
from .routers import accounts as accounts_router


def create_app() -> FastAPI:
	app = FastAPI(title="Banking API")

	# Create tables if they do not exist
	Base.metadata.create_all(bind=engine)

	app.include_router(auth_router.router)
	app.include_router(accounts_router.router)

	@app.get("/")
	def read_root():
		return {"message": "Banking API is running"}

	return app


app = create_app()