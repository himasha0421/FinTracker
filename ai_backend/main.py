import json
from typing import Optional

from dotenv import load_dotenv
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from tools.statement_reader import read_statement
from tools.youtube_processor import process_youtube_video

load_dotenv()

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:5173",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


ACCEPTED_MIME_PREFIXES = ("image/",)
ACCEPTED_MIME_TYPES = {"application/pdf"}


class YouTubeRequest(BaseModel):
    url: str


def _parse_schema_hints(raw: Optional[str]) -> dict:
    if not raw:
        return {}
    try:
        parsed = json.loads(raw)
        return parsed if isinstance(parsed, dict) else {}
    except json.JSONDecodeError:
        return {}


def _parse_transactions(raw: str) -> list:
    try:
        parsed = json.loads(raw)
    except (TypeError, ValueError):
        return []
    if isinstance(parsed, dict):
        transactions = parsed.get("transactions", [])
        return transactions if isinstance(transactions, list) else []
    if isinstance(parsed, list):
        return parsed
    return []


@app.post("/api/chat")
async def chat(
    file: Optional[UploadFile] = File(None),
    message: Optional[str] = Form(None),
    schema_hints: Optional[str] = Form(None),
):
    if not file and not message:
        raise HTTPException(status_code=400, detail="No file or message provided")

    transactions: list = []

    if file:
        content_type = file.content_type or ""
        is_image = content_type.startswith(ACCEPTED_MIME_PREFIXES)
        is_pdf = content_type in ACCEPTED_MIME_TYPES

        if not (is_image or is_pdf):
            raise HTTPException(
                status_code=400,
                detail="Unsupported file type. Upload an image or PDF.",
            )

        try:
            file_bytes = await file.read()
            raw = read_statement(
                file_bytes=file_bytes,
                customer_message=message,
                content_type=content_type,
                schema_hints=_parse_schema_hints(schema_hints),
            )
            transactions = _parse_transactions(raw)
        except Exception as e:
            print(f"Statement extraction failed: {e}")
            raise HTTPException(status_code=500, detail="Failed to extract transactions from the file")

    response_text = (
        f"I've extracted {len(transactions)} transaction(s) from your statement."
        if transactions
        else "No transactions were found."
    )

    return {
        "response": response_text,
        "data": transactions,
        "task_type": "add_transactions" if transactions else None,
    }


@app.post("/api/youtube-summary")
async def youtube_summary(request: YouTubeRequest):
    if not request.url or ("youtube.com" not in request.url and "youtu.be" not in request.url):
        raise HTTPException(
            status_code=400,
            detail="Invalid YouTube URL. Please provide a valid YouTube video URL.",
        )

    try:
        result = process_youtube_video(request.url)
    except Exception as e:
        print(f"YouTube processing failed: {e}")
        raise HTTPException(status_code=500, detail="Error processing YouTube video")

    if not result.get("success"):
        raise HTTPException(status_code=400, detail=result.get("error", "Unknown error"))

    metadata = result["metadata"]
    return {
        "response": "Successfully processed YouTube video",
        "data": {
            "title": metadata["title"],
            "thumbnail_url": metadata["thumbnail_url"],
            "video_url": metadata["video_url"],
            "summary": result["summary"],
            "tags": metadata["tags"],
            "publish_date": metadata["publish_date"],
        },
        "task_type": "youtube_summary",
    }


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
