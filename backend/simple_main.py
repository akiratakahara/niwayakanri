from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="勤怠・社内申請システム API",
    description="勤怠・社内申請業務をWeb化したシステムのAPI",
    version="1.0.0",
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002", "http://localhost:3003", "https://niwayakanri.com"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
async def root():
    return {
        "message": "勤怠・社内申請システム API",
        "version": "1.0.0",
        "status": "healthy"
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/api/v1/auth/me")
async def get_current_user():
    return {
        "user_id": "1",
        "name": "管理者",
        "email": "admin@example.com",
        "role": "admin"
    }

@app.post("/api/v1/auth/login")
async def login(request: dict):
    email = request.get("email", "")
    password = request.get("password", "")
    
    if email == "admin@example.com" and password == "password":
        return {
            "access_token": "dummy-token",
            "token_type": "bearer",
            "user_id": "1",
            "name": "管理者",
            "role": "admin"
        }
    
    return {"error": "メールアドレスまたはパスワードが正しくありません"}

@app.get("/api/v1/requests/")
async def get_requests():
    return [
        {
            "id": "1",
            "type": "leave",
            "applicant_id": "2",
            "status": "applied",
            "title": "有給休暇申請",
            "description": "家族旅行のため",
            "applied_at": "2025-01-23T10:00:00Z",
            "created_at": "2025-01-23T10:00:00Z"
        },
        {
            "id": "2",
            "type": "overtime",
            "applicant_id": "2",
            "status": "approved",
            "title": "残業申請",
            "description": "プロジェクトの締切対応",
            "applied_at": "2025-01-23T10:00:00Z",
            "created_at": "2025-01-23T10:00:00Z"
        }
    ]

if __name__ == "__main__":
    import uvicorn
    import sys
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8000
    uvicorn.run(app, host="0.0.0.0", port=port)





