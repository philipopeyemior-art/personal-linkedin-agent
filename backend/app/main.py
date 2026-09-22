from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
import logging
from datetime import datetime

from .config import settings
from .routes import briefing, welcome, reply, intake, auth, health

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

limiter = Limiter(key_func=get_remote_address)

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description="Philip's Personal LinkedIn AI Agent — Production Python Backend",
    docs_url="/docs",
    redoc_url="/redoc"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to your Vercel URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global exception handler — safe error messages, no stack traces to user
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled exception: {exc} - Path: {request.url.path} - Method: {request.method}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "message": "An unexpected error occurred. Please try again or check logs.",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

# Include routers
app.include_router(health.router, prefix="", tags=["health"])
app.include_router(briefing.router, prefix="/agent", tags=["agent"])
app.include_router(welcome.router, prefix="/agent", tags=["agent"])
app.include_router(reply.router, prefix="/agent", tags=["agent"])
app.include_router(intake.router, prefix="/agent", tags=["agent"])
app.include_router(auth.router, prefix="/auth", tags=["auth"])

@app.get("/")
async def root():
    return {
        "service": settings.app_name,
        "version": settings.version,
        "status": "running",
        "docs": "/docs",
        "health": "/health",
        "timezone": settings.timezone,
        "owner": "Philip Opeyemi Ogungboye"
    }

@app.middleware("http")
async def log_requests(request: Request, call_next):
    start_time = datetime.utcnow()
    # Never log tokens
    path = request.url.path
    if "token" in path.lower() or "secret" in path.lower():
        logger.info(f"Request: {request.method} {path} - [REDACTED]")
    else:
        logger.info(f"Request: {request.method} {path} - IP: {request.client.host if request.client else 'unknown'}")
    
    response = await call_next(request)
    
    duration = (datetime.utcnow() - start_time).total_seconds()
    logger.info(f"Response: {request.method} {path} - Status: {response.status_code} - Duration: {duration:.3f}s")
    
    return response
