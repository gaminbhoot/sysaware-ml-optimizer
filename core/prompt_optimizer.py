from typing import Dict, List


INTENT_HINTS = {
    "general": "complete the request clearly and accurately",
    "coding": "produce correct, maintainable code with concise explanations",
    "analysis": "analyze trade-offs and provide actionable conclusions",
    "creative": "produce original, vivid output while following constraints",
}


def _normalize_spaces(text: str) -> str:
    return " ".join(text.strip().split())


def _has_output_hint(text: str) -> bool:
    markers = ["format", "json", "table", "list", "bullet", "steps", "code block"]
    lower = text.lower()
    return any(m in lower for m in markers)


def _has_constraints(text: str) -> bool:
    markers = ["must", "should", "limit", "max", "avoid", "do not", "only"]
    lower = text.lower()
    return any(m in lower for m in markers)


def _has_context(text: str) -> bool:
    markers = ["context", "background", "for", "because", "project", "audience"]
    lower = text.lower()
    return any(m in lower for m in markers)


def _is_long_enough(text: str) -> bool:
    return len(text.split()) >= 10


def score_prompt(prompt: str) -> int:
    text = _normalize_spaces(prompt)
    if not text:
        return 0

    score = 0
    if _is_long_enough(text):
        score += 25
    if _has_context(text):
        score += 25
    if _has_constraints(text):
        score += 25
    if _has_output_hint(text):
        score += 25
    return score


def build_suggestions(prompt: str) -> List[str]:
    text = _normalize_spaces(prompt)
    suggestions: List[str] = []

    if not _is_long_enough(text):
        suggestions.append("Add more details about the exact task and expected result.")
    if not _has_context(text):
        suggestions.append("Include project or audience context so the assistant can tailor the answer.")
    if not _has_constraints(text):
        suggestions.append("Add constraints such as limits, style preferences, or things to avoid.")
    if not _has_output_hint(text):
        suggestions.append("Specify output format (for example: JSON, bullets, steps, or code block).")

    if not suggestions:
        suggestions.append("Prompt already has good structure; keep it as-is or add concrete examples.")

    return suggestions


import re

def _remove_filler_words(text: str) -> str:
    # A simple regex to strip common filler words at the start or embedded smoothly
    filler_pattern = r"(?i)^(please\s+can\s+you\s+|can\s+you\s+|please\s+|could\s+you\s+|i\s+want\s+you\s+to\s+|kindly\s+)|(\s+(please|kindly)\s+)"
    cleaned = re.sub(filler_pattern, " ", text).strip()
    return cleaned

def optimize_prompt(user_prompt: str, intent: str = "general") -> Dict[str, object]:
    normalized = _normalize_spaces(user_prompt)
    if not normalized:
        return {
            "original_prompt": user_prompt,
            "optimized_prompt": "",
            "suggestions": ["Enter a prompt to optimize."],
            "before_score": 0,
            "after_score": 0,
        }
    
    cleaned_prompt = _remove_filler_words(normalized)
    cleaned_prompt = _normalize_spaces(cleaned_prompt)

    intent_key = intent if intent in INTENT_HINTS else "general"
    before_score = score_prompt(normalized)
    suggestions = build_suggestions(cleaned_prompt)

    optimized = (
        f"Task: {cleaned_prompt}\n"
        f"Goal: {INTENT_HINTS[intent_key]}.\n"
        "Context: Include relevant project background, target audience, and assumptions.\n"
        "Constraints: Keep the response focused, avoid filler, and call out uncertainty when needed.\n"
        "Output Format: Provide a clear step-by-step answer with concise bullets and a final summary."
    )

    after_score = score_prompt(optimized)

    return {
        "original_prompt": user_prompt,
        "optimized_prompt": optimized,
        "suggestions": suggestions,
        "before_score": before_score,
        "after_score": after_score,
    }
