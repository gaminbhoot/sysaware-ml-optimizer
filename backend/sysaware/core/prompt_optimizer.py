import re
from typing import Dict, List, Tuple

# Advanced Prompt Engineering Configs V3
INTENT_CONFIGS = {
    "general": {
        "persona": "You are a versatile and precise AI assistant.",
        "goal": "Complete the request clearly, accurately, and with minimal fluff.",
        "constraints": [
            "Be direct and objective.",
            "Call out uncertainty if the request is ambiguous.",
            "Prioritize accuracy over length.",
            "Avoid corporate jargon and filler phrases."
        ],
        "output": "A clear, structured response with a final summary.",
        "few_shot": [
            {"in": "How do I make a cake?", "out": "Provide a list of ingredients, a step-by-step preparation guide, and baking instructions."}
        ],
        "failure_clause": "If you cannot answer based on the provided context, say 'I don't know' instead of hallucinating."
    },
    "coding": {
        "persona": "You are a Senior Software Engineer and Architect specializing in clean, maintainable systems.",
        "goal": "Produce production-ready, maintainable code with architectural context.",
        "constraints": [
            "Use type hints and follow PEP 8 (or language-specific idiomatic standards).",
            "Prioritize readability and modularity.",
            "Include brief explanations for complex logic.",
            "Avoid boilerplate; focus on the core implementation.",
            "Explicitly handle edge cases and potential errors."
        ],
        "output": "Clean code blocks within markdown tags, followed by a 'How it Works' section and a 'Complexity Analysis'.",
        "few_shot": [
            {"in": "Write a python function to check for palindromes.", "out": "```python\ndef is_palindrome(text: str) -> bool:\n    \"\"\"Checks if a string is a palindrome ignoring case and non-alphanumeric chars.\"\"\"\n    clean_text = ''.join(char.lower() for char in text if char.isalnum())\n    return clean_text == clean_text[::-1]\n```\n**How it Works:** Filter alphanumeric, lowercase, then reverse compare."}
        ],
        "failure_clause": "If the task is technically impossible or the requirements are fundamentally flawed, explain the technical limitation clearly."
    },
    "analysis": {
        "persona": "You are a Principal Data Scientist and Strategic Business Analyst.",
        "goal": "Provide a deep-dive analysis focusing on trade-offs, ROI, and adversarial critique.",
        "constraints": [
            "Evaluate both pros and cons with balanced weight.",
            "Focus on actionable insights rather than general observations.",
            "Quantify impact where possible.",
            "Adversarial Validation: Generate two distinct perspectives on the problem and critique both before reaching a final conclusion.",
            "Use a 'Situation-Complication-Resolution' framework."
        ],
        "output": "A detailed analysis including a 'Trade-offs Table' and a final 'Strategic Recommendation'.",
        "few_shot": [
            {"in": "Should we move to AWS or stay on-prem?", "out": "Compare costs, scalability, and security. Analyze the 'Cloud vs On-Prem' debate from a long-term ROI perspective."}
        ],
        "failure_clause": "If the data provided is insufficient for a robust analysis, specify exactly what additional data is required."
    },
    "creative": {
        "persona": "You are a Creative Director and Master Storyteller with a focus on evocative, high-impact narratives.",
        "goal": "Produce vivid, original, and engaging content that captures attention and resonates emotionally.",
        "constraints": [
            "Prioritize strong imagery and evocative language.",
            "Maintain a consistent tone and voice throughout.",
            "Break traditional patterns to create something unique.",
            "Ensure the output aligns strictly with the target audience's psychological profile."
        ],
        "output": "A compelling narrative or creative piece followed by a short 'Creative Rationale' explaining the stylistic choices.",
        "few_shot": [
            {"in": "Write a tagline for a futuristic coffee brand.", "out": "'Neuro-Brew: Wake up the 23rd Century.'\n**Rationale:** Uses a high-tech prefix with a time-anchored promise."}
        ],
        "failure_clause": "If the creative constraints are mutually exclusive, prioritize the primary emotional goal and explain the trade-off."
    }
}

# Backward compatibility for tests and older integrations
INTENT_HINTS = {k: v["goal"] for k, v in INTENT_CONFIGS.items()}

def _normalize_spaces(text: str) -> str:
    return " ".join(text.strip().split())

def _has_output_hint(text: str) -> bool:
    markers = ["format", "json", "table", "list", "bullet", "steps", "code block", "xml", "tag", "requirement"]
    lower = text.lower()
    return any(m in lower for m in markers)

def _has_constraints(text: str) -> bool:
    markers = ["must", "should", "limit", "max", "avoid", "do not", "only", "rule", "constraint"]
    lower = text.lower()
    return any(m in lower for m in markers)

def _has_context(text: str) -> bool:
    markers = ["context", "background", "for", "because", "project", "audience", "scenario", "abc"]
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
        suggestions.append("Prompt already has good structure; keep it as-is or add more concrete examples.")

    return suggestions

def _remove_filler_words(text: str) -> Tuple[str, List[str]]:
    filler_pattern = r"(?i)\b(please\s+can\s+you\s+|can\s+you\s+|please\s+|could\s+you\s+|i\s+want\s+you\s+to\s+|kindly\s+)\b|\b(please|kindly)\b"
    removed = re.findall(filler_pattern, text)
    # Flatten and clean the found matches
    removed_list = [m[0] or m[1] for m in removed if m[0] or m[1]]
    cleaned = re.sub(filler_pattern, " ", text).strip()
    return cleaned, removed_list

def _extract_sections(text: str) -> Dict[str, List[str]]:
    """Deconstructs a prompt into logical sections: context, constraints, and requirements."""
    sections = {
        "context": [],
        "constraints": [],
        "output_format": [],
        "task": []
    }
    
    sentences = re.split(r'(?<=[.!?])\s+', text)
    
    context_keywords = ["working on", "project", "audience", "scenario", "context", "background", "because", "in order to", "considering", "planning", "thinking about", "situation"]
    constraint_keywords = ["must", "should", "limit", "max", "avoid", "do not", "only", "rule", "constraint", "don't", "prevent", "ensure", "strict"]
    output_keywords = ["format", "json", "table", "list", "bullet", "steps", "code block", "xml", "tag"]
    
    for sentence in sentences:
        lower = sentence.lower()
        if any(kw in lower for kw in context_keywords):
            sections["context"].append(sentence)
        elif any(kw in lower for kw in constraint_keywords):
            sections["constraints"].append(sentence)
        elif any(kw in lower for kw in output_keywords):
            sections["output_format"].append(sentence)
        else:
            sections["task"].append(sentence)
            
    return sections

def optimize_prompt(user_prompt: str, intent: str = "general") -> Dict[str, object]:
    normalized = _normalize_spaces(user_prompt)
    if not normalized:
        return {
            "original_prompt": user_prompt,
            "optimized_prompt": "",
            "suggestions": ["Enter a prompt to optimize."],
            "removed_words": [],
            "before_score": 0,
            "after_score": 0,
        }
    
    cleaned_prompt, removed_words = _remove_filler_words(normalized)
    cleaned_prompt = _normalize_spaces(cleaned_prompt)
    
    # Smart Deconstruction
    sections = _extract_sections(cleaned_prompt)
    
    intent_key = intent if intent in INTENT_CONFIGS else "general"
    config = INTENT_CONFIGS[intent_key]
    
    before_score = score_prompt(normalized)
    suggestions = build_suggestions(cleaned_prompt)

    # Reconstruct Task: Use identified task sentences or the whole cleaned prompt if none found
    core_task = " ".join(sections["task"]) if sections["task"] else cleaned_prompt
    
    # Build dynamic sections
    context_str = "\n".join(sections["context"]) if sections["context"] else "[No specific context provided; assume general use-case]"
    
    # Merge extracted constraints with config defaults
    all_constraints = config["constraints"] + sections["constraints"]
    constraints_str = "\n".join([f"- {c}" for c in all_constraints])
    
    # Output formatting: Merge user preference with config default
    output_pref = " ".join(sections["output_format"])
    final_output_format = f"{config['output']} {output_pref}".strip()

    few_shot_str = "\n".join([f"Input: {ex['in']}\nOutput: {ex['out']}" for ex in config["few_shot"]])

    optimized = (
        f"# Persona/Role\n{config['persona']}\n\n"
        f"# Task Definition\nTask: {core_task}\nGoal: {config['goal']}\n\n"
        f"# Context & Constraints (ABC Rule)\n"
        f"<context>\n{context_str}\n</context>\n\n"
        f"<constraints>\n{constraints_str}\n- {config['failure_clause']}\n</constraints>\n\n"
        f"# Few-Shot Examples\n{few_shot_str}\n\n"
        f"# Chain-of-Thought Instruction\n"
        f"<thought_process>\nBefore providing the final output, think step-by-step. Analyze the requirements, list your assumptions, and identify potential complications.\n</thought_process>\n\n"
        f"# Output Requirements\nFormat: {final_output_format}"
    )

    after_score = score_prompt(optimized)

    return {
        "original_prompt": user_prompt,
        "optimized_prompt": optimized,
        "suggestions": suggestions,
        "removed_words": removed_words,
        "before_score": before_score,
        "after_score": after_score,
    }
