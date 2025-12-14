from fastapi import FastAPI, HTTPException, UploadFile, Form, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, HttpUrl
from typing import List, Optional, Dict, Any
import os
from dotenv import load_dotenv
import openai
from PIL import Image
import io
from tools.statement_reader import read_statement
from tools.youtube_processor import process_youtube_video
import json

# Load environment variables
load_dotenv()

# Initialize FastAPI app
app = FastAPI()

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Add your frontend URL
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize OpenAI client with proper configuration
openai.api_key = os.getenv("OPENAI_API_KEY")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


class YouTubeRequest(BaseModel):
    url: str


async def process_image(file: UploadFile, message: str) -> str:
    """Process an uploaded image using OCR."""
    try:
        # Read the image file
        contents = await file.read()
        # extract statement transcations
        transactions = read_statement(contents, message)
        return json.loads(transactions)["transactions"]
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")


@app.post("/api/chat")
async def chat(
    file: Optional[UploadFile] = File(None), message: Optional[str] = Form(None)
):
    try:
        messages = []
        extracted_transactions = []

        # If there's a file, process it with OCR to extract necessary transaction information.
        if file:
            if file.content_type.startswith("image/"):
                ocr_text = await process_image(file, message)
                system_message = {
                    "role": "system",
                    "content": "You are a financial assistant. Analyze the following bank statement and extract all transactions:",
                }
                messages.append(system_message)
                messages.append(
                    {
                        "role": "user",
                        "content": f"Here is the text extracted from the bank statement:\n\n{ocr_text}",
                    }
                )
                # Store the extracted transactions
                if isinstance(ocr_text, dict):
                    extracted_transactions = [ocr_text]  # Single transaction
                elif isinstance(ocr_text, list):
                    extracted_transactions = ocr_text  # Multiple transactions
            else:
                raise HTTPException(
                    status_code=400,
                    detail="Unsupported file type. Please upload an image file.",
                )

        # Add the user's message if provided
        if message:
            messages.append({"role": "user", "content": message})

        # If no file or message provided, return error
        if not file and not message:
            raise HTTPException(status_code=400, detail="No file or message provided")

        # Call OpenAI API
        # response = openai.ChatCompletion.create(
        #     model="gpt-3.5-turbo", messages=messages, temperature=0.7, max_tokens=500
        # )
        response = "I have updated the transactions"
        # Return both the chat response and extracted transactions
        return {
            "response": response,
            "data": extracted_transactions,
            "task_type": "add_transactions",
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/api/youtube-summary")
async def youtube_summary(request: YouTubeRequest):
    """
    Process a YouTube video URL to extract transcript and generate summary.

    Args:
        request (YouTubeRequest): Request containing YouTube URL

    Returns:
        Dict[str, Any]: Processing results including summary and metadata
    """
    try:
        # Validate the URL (basic check)
        if (
            not request.url
            or "youtube.com" not in request.url
            and "youtu.be" not in request.url
        ):
            raise HTTPException(
                status_code=400,
                detail="Invalid YouTube URL. Please provide a valid YouTube video URL.",
            )

        # Process the YouTube video
        result = process_youtube_video(request.url)

        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])

        # Return the processing results
        return {
            "response": "Successfully processed YouTube video",
            "data": {
                "title": result["metadata"]["title"],
                "thumbnail_url": result["metadata"]["thumbnail_url"],
                "video_url": result["metadata"]["video_url"],
                "summary": result["summary"],
                "tags": result["metadata"]["tags"],
                "publish_date": result["metadata"]["publish_date"],
            },
            "task_type": "youtube_summary",
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500, detail=f"Error processing YouTube video: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
