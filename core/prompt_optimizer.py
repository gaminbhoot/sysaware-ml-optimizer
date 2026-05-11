import re
from typing import Dict, List

# Personas and Goals V2
INTENT_CONFIGS = {
    "general": {
        "persona": "You are a versatile and precise AI assistant.",
        "goal": "Complete the request clearly, accurately, and with minimal fluff.",
        "constraints": [
            "Be direct and objective.",
            "Call out uncertainty if the request is ambiguous.",
            "Prioritize accuracy over length."
        ],
        "output": "A clear, structured response with a final summary."
    },
    "coding": {
        "persona": "You are a Senior Software Engineer and Architect.",
        "goal": "Produce production-ready, maintainable code with architectural context.",
        "constraints": [
            "Use type hints and follow PEP 8 for Python.",
            "Prioritize readability and modularity.",
            "Include brief explanations for complex logic.",
            "Avoid boilerplate; focus on the core implementation."
        ],
        "output": "Clean code blocks followed by a brief 'How it Works' section."
    },
    "analysis": {
        "persona": "You are a Principal Data Scientist and Business Analyst.",
        "goal": "Provide a deep-dive analysis focusing on trade-offs and ROI.",
        "constraints": [
            "Evaluate both pros and cons.",
            "Focus on actionable insights rather than general observations.",
            "Quantify impact where possible.",
            "Structure the response using a 'Situation-Complication-Resolution' framework."
        ],
        "output": "A detailed analysis with a table for comparison and a clear recommendation."
    },
    "creative": {
        "persona": "You are a Creative Director and Master Storyteller.",
        "goal": "Produce vivid, original, and engaging content that captures attention.",
        "constraints": [
            "Prioritize strong imagery and evocative language.",
            "Maintain a consistent tone and voice throughout.",
            "Break traditional patterns to create something unique.",
            "Ensure the output aligns strictly with any stylistic constraints."
        ],
        "output": "A compelling narrative or creative piece followed by a short 'Creative Rationale'."
    }
}

# Backward compatibility for tests and older integrations
INTENT_HINTS = {k: v["goal"] for k, v in INTENT_CONFIGS.items()}

def _normalize_spaces(text: str) -> str:
    return " ".join(text.strip().split())

def _has_output_hint(text: str) -> bool:
    markers = ["format", "json", "table", "list", "bullet", "steps", "code block", "xml", "tag"]
    lower = text.lower()
    return any(m in lower for m in markers)

def _has_constraints(text: str) -> bool:
    markers = ["must", "should", "limit", "max", "avoid", "do not", "only", "rule"]
    lower = text.lower()
    return any(m in lower for m in markers)

def _has_context(text: str) -> bool:
    markers = ["context", "background", "for", "because", "project", "audience", "scenario"]
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

def _remove_filler_words(text: str) -> str:
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

    intent_key = intent if intent in INTENT_CONFIGS else "general"
    config = INTENT_CONFIGS[intent_key]
    
    before_score = score_prompt(normalized)
    suggestions = build_suggestions(cleaned_prompt)

    # Building V2 Template with XML tagging and CoT triggers
    constraints_str = "\n".join([f"- {c}" for c in config["constraints"]])

    optimized = (
        f"Persona: {config['persona']}\n"
        f"Goal: {config['goal']}\n\n"
        f"<task>\nTask: {cleaned_prompt}\n</task>\n\n"
        f"<context>\n[Provide relevant background, audience info, or technical environment here]\n</context>\n\n"
        f"<constraints>\n{constraints_str}\n</constraints>\n\n"
        f"<thought_process>\nBefore providing the final output, briefly outline your reasoning and key assumptions.\n</thought_process>\n\n"
        f"Output Format: {config['output']}"
    )

    after_score = score_prompt(optimized)

    return {
        "original_prompt": user_prompt,
        "optimized_prompt": optimized,
        "suggestions": suggestions,
        "before_score": before_score,
        "after_score": after_score,
    }
