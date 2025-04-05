import base64
import os
import mimetypes
import imghdr
from google import genai
from google.genai import types


def get_image_mime_type(image_bytes: bytes) -> str:
    """
    Detect the MIME type of an image from its bytes.
    """
    image_type = imghdr.what(None, image_bytes)
    if image_type:
        return f"image/{image_type}"
    return "image/png"  # Default to PNG if detection fails


def read_statement(image_bytes: bytes, customer_message: str) -> dict:
    """
    Read a bank statement image and extract transactions using Gemini API.

    Args:
        image_bytes (bytes): The bank statement image in bytes
        customer_message (str): Customer's message about the statement

    Returns:
        dict: Extracted transactions in JSON format
    """
    client = genai.Client(
        api_key=os.environ.get("GEMINI_API_KEY"),
    )

    model = "gemini-2.5-pro-exp-03-25"
    # Detect MIME type from image bytes
    mime_type = get_image_mime_type(image_bytes)

    # Encode image bytes to base64
    base64_image = base64.b64encode(image_bytes).decode("utf-8")

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_bytes(
                    data=base64.b64decode(base64_image),
                    mime_type=mime_type,
                ),
                types.Part.from_text(text=f"{customer_message}"),
            ],
        ),
    ]

    generate_content_config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=genai.types.Schema(
            type=genai.types.Type.OBJECT,
            properties={
                "transactions": genai.types.Schema(
                    type=genai.types.Type.ARRAY,
                    items=genai.types.Schema(
                        type=genai.types.Type.OBJECT,
                        properties={
                            "description": genai.types.Schema(
                                type=genai.types.Type.STRING,
                            ),
                            "amount": genai.types.Schema(
                                type=genai.types.Type.NUMBER,
                            ),
                            "date": genai.types.Schema(
                                type=genai.types.Type.STRING,
                            ),
                            "category": genai.types.Schema(
                                type=genai.types.Type.STRING,
                                enum=[
                                    "Income",
                                    "Food",
                                    "Shopping",
                                    "Entertainment",
                                    "Bills",
                                    "Transport",
                                    "Health",
                                    "Electronics",
                                    "Software",
                                ],
                            ),
                            "type": genai.types.Schema(
                                type=genai.types.Type.STRING,
                                enum=["income", "expense"],
                            ),
                            "icon": genai.types.Schema(
                                type=genai.types.Type.STRING,
                                enum=["shopping-bag", "shopping-cart", "briefcase"],
                            ),
                            "accountId": genai.types.Schema(
                                type=genai.types.Type.STRING,
                                enum=["2"],
                            ),
                        },
                    ),
                ),
            },
        ),
        system_instruction=[
            types.Part.from_text(
                text="""You are a expert finance analyzer. You will be given a screen shot of a account statement. Your task is to read the required data preciously. You should response in the given JSON format.

JSON Schema keys:
- description ( concise description maximum 3 words, make this lower case as well )
- amount
- date (format the transaction date in YYYY-MM-DD, use 2025 as default year if couldn't found)
- category
- type
- icon
- accountId (set the value always to 2)

Must Follow Rules:
* Don't provide any explanations.
* Just output the transactions as a list of JSON objects.
* specially disregard the payment with description PAYMENT THANK YOU (they are credit card payments)"""
            ),
        ],
    )

    try:
        response = client.models.generate_content(
            model=model,
            contents=contents,
            config=generate_content_config,
        )
        return response.text

    except Exception as e:
        print(f"Error processing image: {str(e)}")
        return {"transactions": []}
