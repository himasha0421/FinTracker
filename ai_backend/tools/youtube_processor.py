import re
import os
from typing import Dict, Any, List, Optional, Tuple
from youtube_transcript_api import (
    YouTubeTranscriptApi,
    TranscriptsDisabled,
    NoTranscriptFound,
)
from google import genai
from google.genai import types
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError
import os


def extract_video_id(youtube_url: str) -> Optional[str]:
    """
    Extract the video ID from a YouTube URL.

    Args:
        youtube_url (str): The YouTube URL

    Returns:
        Optional[str]: The video ID or None if not found
    """
    # Regular expressions for different YouTube URL formats
    patterns = [
        r"(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/|youtube\.com\/watch\?.*v=)([^&\n?#]+)",
        r"(?:youtube\.com\/shorts\/)([^&\n?#]+)",
    ]

    for pattern in patterns:
        match = re.search(pattern, youtube_url)
        if match:
            return match.group(1)

    return None


def get_video_metadata(video_id):
    """
    Retrieves metadata for a YouTube video given its ID.

    Args:
        video_id: The YouTube video ID (e.g., 'dQw4w9WgXcQ').
        api_key: Your Google API key for YouTube Data API v3.
                 You can obtain one from the Google Cloud Console:
                 https://console.cloud.google.com/

    Returns:
        A dictionary containing the video metadata, or None if an error occurred.
        Example:
        {
            'kind': 'youtube#videoListResponse',
            'etag': '...',
            'items': [{
                'kind': 'youtube#video',
                'etag': '...',
                'id': 'dQw4w9WgXcQ',
                'snippet': {
                    'publishedAt': '2009-10-25T06:57:20Z',
                    'channelId': 'UCn1jCMv6t4244jBpOhEm5XQ',
                    'title': 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
                    'description': '...',
                    'thumbnails': {
                        'default': {'url': '...', 'width': 120, 'height': 90},
                        'medium': {'url': '...', 'width': 320, 'height': 180},
                        'high': {'url': '...', 'width': 480, 'height': 360},
                        'standard': {'url': '...', 'width': 640, 'height': 480},
                        'maxres': {'url': '...', 'width': 1280, 'height': 720}
                    },
                    'channelTitle': 'RickAstley',
                    'tags': ['rick astley', 'never gonna give you up', 'rickrolling'],
                    'categoryId': '10',
                    'liveBroadcastContent': 'none',
                    'localized': {
                        'title': 'Rick Astley - Never Gonna Give You Up (Official Music Video)',
                        'description': '...'
                    },
                    'defaultAudioLanguage': 'en'
                },
                'contentDetails': {
                    'duration': 'PT3M33S',
                    'dimension': '2d',
                    'definition': 'hd',
                    'caption': 'false',
                    'licensedContent': True,
                    'contentRating': {},
                    'projection': 'rectangular'
                },
                'statistics': {
                    'viewCount': '1417145751',
                    'likeCount': '15371464',
                    'favoriteCount': '0',
                    'commentCount': '494259'
                }
            }],
            'pageInfo': {'totalResults': 1, 'resultsPerPage': 1}
        }


    Raises:
        googleapiclient.errors.HttpError: If there's an issue with the API request (e.g., invalid API key, quota exceeded, video not found).
        Exception: If there's another unexpected error.
    """

    # set the default response
    metadata = {
        "title": "Unknown Title",
        "thumbnail_url": f"https://img.youtube.com/vi/{video_id}/maxresdefault.jpg",
        "video_url": f"https://www.youtube.com/watch?v={video_id}",
        "tags": [],
        "publish_date": None,
    }

    try:

        youtube = build("youtube", "v3", developerKey=os.environ.get("YOUTUBE_API_KEY"))

        request = youtube.videos().list(
            part="snippet,contentDetails,statistics", id=video_id
        )

        response = request.execute()

        # extract video metadata
        if "items" in response and len(response["items"]) > 0:
            video_data = response["items"][0]
            # add metadata
            metadata = {
                "title": video_data["snippet"]["title"],
                "thumbnail_url": video_data["snippet"]["thumbnails"]["maxres"]["url"],
                "tags": video_data["snippet"]["tags"],
                "publish_date": video_data["snippet"]["publishedAt"],
                "video_url": f"https://www.youtube.com/watch?v={video_id}",
            }

        return metadata

    except HttpError as e:
        print(f"An HTTP error occurred: {e}")
        return metadata
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return metadata


def get_video_transcript(video_id: str) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Get the transcript for a YouTube video.

    Args:
        video_id (str): The YouTube video ID

    Returns:
        Tuple[List[Dict[str, Any]], Optional[str]]:
            - List of transcript segments
            - Error message if any
    """
    try:
        transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)

        # Try to get English transcript first
        try:
            transcript = transcript_list.find_transcript(["en"])
        except:
            # If English not available, get the first available transcript
            transcript = transcript_list.find_transcript(["en-US", "en-GB"])

        transcript_data = transcript.fetch()
        return transcript_data, None

    except TranscriptsDisabled:
        return [], "Transcripts are disabled for this video."
    except NoTranscriptFound:
        return [], "No transcript found for this video."
    except Exception as e:
        return [], f"Error fetching transcript: {str(e)}"


def concatenate_transcript(transcript_data: List[Dict[str, Any]]) -> str:
    """
    Concatenate transcript segments into a single text.

    Args:
        transcript_data (List[Dict[str, Any]]): List of transcript segments

    Returns:
        str: Concatenated transcript text
    """
    return " ".join([segment.text for segment in transcript_data])


def generate_summary(transcript_text: str, video_metadata: Dict[str, Any]) -> str:
    """
    Generate a summary of the video transcript using Gemini API.

    Args:
        transcript_text (str): The video transcript text
        video_metadata (Dict[str, Any]): Video metadata

    Returns:
        str: Generated summary
    """
    # Initialize Gemini client
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-2.0-flash-thinking-exp-01-21"

    # Prepare prompt with video metadata
    prompt = f"""    
    YouTube Video Transcript:
    {transcript_text}
    """

    contents = [
        types.Content(
            role="user",
            parts=[types.Part.from_text(text=prompt)],
        ),
    ]
    
    # add system prompts and generate configs
    generate_content_config = types.GenerateContentConfig(
        temperature=0.2,
        response_mime_type="text/plain",
        system_instruction=[
            types.Part.from_text(text=f"""You are an expert YouTube transcript summarizer. Analyze the provided YouTube video transcript to identify its core concepts, major arguments, and essential information. Generate a concise yet comprehensive summary report structured according to the guidelines below. The goal is to allow someone to quickly understand the video's main message, key findings, and overall significance without watching the entire video.

Output Structure & Guidelines:

1.  Key Points / Core Concepts:
    * Identify and list the 3-5 most critical concepts, arguments, or findings discussed in the video.
    * Use concise, informative bullet points. Each point should represent a distinct major idea.
    * Focus on *what* is being discussed, not just topic mentions.


2.  Detailed Summary:
    * Weave the Key Points identified above into a coherent narrative summary.
    * Expand on each key point by incorporating supporting details, context, explanations, important facts, figures, statistics, or specific examples mentioned in the transcript.
    * Ensure the summary flows logically, connecting the different ideas presented in the video.
    * Maintain a neutral and objective tone, accurately reflecting the information in the transcript.
    * Prioritize clarity and conciseness while ensuring all crucial information is included.


3.  Main Takeaway / Conclusion:
    * State the single most important message, conclusion, or call to action the video aims to convey.
    * This should encapsulate the essence or primary purpose of the video in one or two sentences.

Mandatory Formatting & Rules:
* Format the entire output using Markdown for readability (use bullet points, bolding where appropriate).
* Strictly adhere to the section structure: Key Points, Detailed Summary, Main Takeaway.
* **Do not** include any introductory phrases like \"Here's a summary...\" or \"This report summarizes...\".
* Base the summary *only* on the provided transcript text. Do not add external information or interpretations not explicitly supported by the transcript."""),
        ],
    )  
    

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config
        )
        return response.text
    except Exception as e:
        print(f"Error generating summary: {str(e)}")
        return "Failed to generate summary. Please try again later."


def process_youtube_video(youtube_url: str) -> Dict[str, Any]:
    """
    Process a YouTube video to extract transcript and generate summary.

    Args:
        youtube_url (str): The YouTube URL

    Returns:
        Dict[str, Any]: Processing results including summary and metadata
    """
    # Extract video ID
    video_id = extract_video_id(youtube_url)
    if not video_id:
        return {
            "success": False,
            "error": "Invalid YouTube URL. Could not extract video ID.",
        }

    # Get video metadata
    metadata = get_video_metadata(video_id)

    # Get video transcript
    transcript_data, error = get_video_transcript(video_id)

    if error:
        return {"success": False, "error": error, "metadata": metadata}

    if not transcript_data:
        return {
            "success": False,
            "error": "No transcript data available for this video.",
            "metadata": metadata,
        }

    # Concatenate transcript segments
    transcript_text = concatenate_transcript(transcript_data)

    # Generate summary
    summary = generate_summary(transcript_text, metadata)

    return {"success": True, "metadata": metadata, "summary": summary}
