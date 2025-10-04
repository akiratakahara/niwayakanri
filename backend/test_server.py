from fastapi import FastAPI

app = FastAPI(title="勤怠・社内申請システム API", version="1.0.0")

@app.get("/")
async def root():
    return {"message": "勤怠・社内申請システム API が正常に動作しています！"}

@app.get("/health")
async def health_check():
    return {"status": "healthy", "message": "サーバーは正常に動作しています"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
