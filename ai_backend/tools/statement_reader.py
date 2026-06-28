import io
import json
import os
from datetime import datetime
from typing import Any, Optional

from google import genai
from google.genai import types
from PIL import Image


MODEL = "gemini-2.5-flash"

DEFAULT_CATEGORIES = [
    "Income",
    "Salary",
    "Savings",
    "Bills",
    "Housing",
    "Transport",
    "Vacations",
    "Groceries",
    "Dining Out",
    "Shopping",
    "Health & Wellness",
    "Friends & Gatherings",
]

DEFAULT_ASSIGNEES = ["None", "Hima", "Thami"]


def detect_mime_type(file_bytes: bytes, fallback: Optional[str] = None) -> str:
    """Detect MIME type for an image or PDF. Falls back to the value passed in
    by the caller (e.g. UploadFile.content_type) when detection fails."""
    if file_bytes.startswith(b"%PDF-"):
        return "application/pdf"

    try:
        with Image.open(io.BytesIO(file_bytes)) as img:
            fmt = (img.format or "").lower()
            if fmt:
                return f"image/{'jpeg' if fmt == 'jpg' else fmt}"
    except Exception:
        pass

    return fallback or "application/octet-stream"


def _build_response_schema(categories: list[str], assignees: list[str]) -> genai.types.Schema:
    return genai.types.Schema(
        type=genai.types.Type.OBJECT,
        properties={
            "transactions": genai.types.Schema(
                type=genai.types.Type.ARRAY,
                items=genai.types.Schema(
                    type=genai.types.Type.OBJECT,
                    required=["description", "amount", "date", "category", "type"],
                    properties={
                        "description": genai.types.Schema(type=genai.types.Type.STRING),
                        "amount": genai.types.Schema(type=genai.types.Type.NUMBER),
                        "date": genai.types.Schema(type=genai.types.Type.STRING),
                        "category": genai.types.Schema(
                            type=genai.types.Type.STRING,
                            enum=categories,
                        ),
                        "subcategory": genai.types.Schema(type=genai.types.Type.STRING),
                        "type": genai.types.Schema(
                            type=genai.types.Type.STRING,
                            enum=["income", "expense"],
                        ),
                        "assignee": genai.types.Schema(
                            type=genai.types.Type.STRING,
                            enum=assignees,
                        ),
                    },
                ),
            ),
        },
    )


def _build_system_instruction(
    categories: list[str],
    subcategories_by_category: dict[str, list[str]],
    assignees: list[str],
) -> str:
    now = datetime.now()
    current_year = now.year
    current_month = now.strftime("%B")

    subcategory_lines = "\n".join(
        f"  - {cat}: {', '.join(subs)}"
        for cat, subs in subcategories_by_category.items()
        if subs
    ) or "  (none provided)"

    return f"""You are an expert financial analyst. You will be given a bank or credit card statement (image or PDF). Extract every real transaction precisely and return JSON matching the response schema.

CURRENT DATE CONTEXT
- Today: {now.strftime('%Y-%m-%d')} (year {current_year}, month {current_month})
- If a transaction row shows only a day/month, infer the year from the statement period header. If still ambiguous, use {current_year}; if the resulting date would be in the future, use {current_year - 1}.

FIELD RULES
- description: concise lower-case description, max 3 words (e.g. "grocery store", "netflix sub").
- amount: positive number with up to 2 decimals. Never negative.
- date: format YYYY-MM-DD.
- category: must be exactly one of: {', '.join(categories)}.
- subcategory: pick the best match from the list below for the chosen category. Omit if nothing fits.
- type: "income" for credits/deposits, "expense" for debits/withdrawals.
- assignee: one of {', '.join(assignees)}. Use "None" if unsure.

SUBCATEGORIES BY CATEGORY
{subcategory_lines}

DEBIT vs CREDIT RULES
- If the statement has separate Debit and Credit columns: Debit -> expense, Credit -> income.
- If amounts use signs: negative -> expense, positive -> income (unless the statement is clearly an "amount charged" view where everything is an expense).
- Refunds and cashback are income.

ROWS TO SKIP
- Opening balance, closing balance, running balance, statement totals.
- Page headers, footers, column titles.
- Credit-card "PAYMENT THANK YOU" entries (these are payments to the card, not real spending).
- Interest charges/fees only if they are summary lines that duplicate already-listed individual fees.

EXAMPLE
Input row: "03/15  WHOLE FOODS MARKET #123  -$48.27"
Output: {{"description": "whole foods", "amount": 48.27, "date": "{current_year}-03-15", "category": "Groceries", "subcategory": "Produce", "type": "expense", "assignee": "None"}}

Input row: "04/01  PAYROLL DEPOSIT  +$3,200.00"
Output: {{"description": "payroll deposit", "amount": 3200.00, "date": "{current_year}-04-01", "category": "Salary", "subcategory": "Base Pay", "type": "income", "assignee": "None"}}

OUTPUT
- Return JSON only. No prose, no markdown.
- If no transactions are found, return {{"transactions": []}}."""


def read_statement(
    file_bytes: bytes,
    customer_message: Optional[str] = None,
    content_type: Optional[str] = None,
    schema_hints: Optional[dict[str, Any]] = None,
) -> str:
    """Read a bank statement (image or PDF) and return a JSON string with extracted transactions.

    Returns a JSON string of the form: '{"transactions": [...]}'.
    """
    hints = schema_hints or {}
    categories = hints.get("categories") or DEFAULT_CATEGORIES
    assignees = hints.get("assignees") or DEFAULT_ASSIGNEES
    subcategories_by_category = hints.get("subcategoriesByCategory") or {}

    client = genai.Client(api_key=os.environ.get("GEMINI_API_KEY"))
    mime_type = detect_mime_type(file_bytes, fallback=content_type)
    user_text = (customer_message or "").strip() or "Extract every transaction from this statement."

    contents = [
        types.Content(
            role="user",
            parts=[
                types.Part.from_bytes(data=file_bytes, mime_type=mime_type),
                types.Part.from_text(text=user_text),
            ],
        ),
    ]

    config = types.GenerateContentConfig(
        response_mime_type="application/json",
        response_schema=_build_response_schema(categories, assignees),
        system_instruction=[
            types.Part.from_text(
                text=_build_system_instruction(
                    categories=categories,
                    subcategories_by_category=subcategories_by_category,
                    assignees=assignees,
                )
            )
        ],
    )

    try:
        response = client.models.generate_content(
            model=MODEL,
            contents=contents,
            config=config,
        )
        return response.text or json.dumps({"transactions": []})
    except Exception as e:
        print(f"Error extracting transactions: {e}")
        return json.dumps({"transactions": []})
