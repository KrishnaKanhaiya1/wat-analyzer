"""
Rewrite Coach: Uses Gemini API to generate improved rewrites of user responses.
Re-runs each rewrite through the AI pipeline to show trait improvements.
Falls back to rule-based rewrites if no API key is available.
"""

import os
import logging
import re
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

_gemini_model = None

def _init_gemini():
    global _gemini_model
    if _gemini_model is not None:
        return True
    try:
        import google.generativeai as genai
        api_key = os.getenv("GEMINI_API_KEY", "")
        if not api_key:
            logger.warning("No GEMINI_API_KEY set, using fallback rewrite")
            return False
        genai.configure(api_key=api_key)
        _gemini_model = genai.GenerativeModel("gemini-2.0-flash")
        return True
    except Exception as e:
        logger.warning(f"Could not init Gemini: {e}")
        return False

def generate_rewrites(
    original_text: str,
    prompt_word: str,
    focus_traits: List[str],
    module: str,
    count: int = 3
) -> List[Dict[str, Any]]:
    """
    Generate improved rewrites of a user response.
    Uses Gemini if available, else falls back to simple transformations.
    """
    if _init_gemini() and _gemini_model:
        return _rewrites_via_gemini(original_text, prompt_word, focus_traits, module, count)
    else:
        return _fallback_rewrites(original_text, prompt_word, focus_traits, count)

def _rewrites_via_gemini(original_text, prompt_word, focus_traits, module, count):
    """Use Gemini to generate intelligent rewrites."""
    trait_str = ", ".join(focus_traits)
    module_context = {
        "ssb": "SSB defence interview preparation - responses should show Officer Like Qualities",
        "interview": "job interview preparation - responses should show professional competence",
        "student": "student mindset development - responses should show growth mindset",
        "workplace": "workplace communication - responses should show professional leadership",
    }.get(module, "general soft-skill improvement")
    
    prompt = f"""You are a soft-skills communication coach for {module_context}.

The user was given the word/prompt: "{prompt_word}"
They wrote: "{original_text}"

Generate exactly {count} improved versions of this response that specifically strengthen these traits: {trait_str}.

Rules:
- Each rewrite should be a natural, authentic response (not robotic)
- Use first-person active voice where appropriate
- Include concrete actions, decisions, or outcomes
- Keep responses concise (1-2 sentences)
- Each version should take a slightly different approach

Return ONLY the rewrites, one per line, numbered 1-{count}. After each rewrite, add a brief explanation in parentheses of why it's better.

Example format:
1. [rewrite text] (Explanation: uses active voice and shows initiative)
2. [rewrite text] (Explanation: demonstrates empathy and team focus)
3. [rewrite text] (Explanation: shows clear ownership and outcome focus)"""

    try:
        response = _gemini_model.generate_content(prompt)
        text = response.text.strip()
        return _parse_gemini_rewrites(text, count)
    except Exception as e:
        logger.error(f"Gemini rewrite error: {e}")
        return _fallback_rewrites(original_text, prompt_word, focus_traits, count)

def _parse_gemini_rewrites(text: str, expected: int) -> List[Dict[str, Any]]:
    """Parse numbered rewrites from Gemini output."""
    results = []
    lines = text.strip().split("\n")
    
    for line in lines:
        line = line.strip()
        if not line:
            continue
        
        # Match pattern: 1. text (Explanation: ...)
        match = re.match(r'^\d+\.\s*(.+?)(?:\s*\((?:Explanation:\s*)?(.+?)\))?$', line)
        if match:
            rewrite = match.group(1).strip()
            explanation = match.group(2).strip() if match.group(2) else "Improved version with stronger trait expression."
            results.append({
                "rewrite": rewrite,
                "explanation": explanation,
            })
    
    if not results:
        # Fallback: treat each non-empty line as a rewrite
        for line in lines:
            line = line.strip().lstrip("0123456789.) ")
            if line and len(results) < expected:
                results.append({
                    "rewrite": line,
                    "explanation": "AI-generated improvement.",
                })
    
    return results[:expected]

def _fallback_rewrites(
    original: str, prompt_word: str, focus_traits: List[str], count: int
) -> List[Dict[str, Any]]:
    """Rule-based fallback when Gemini is unavailable."""
    rewrites = []
    
    # Version 1: Add first-person agency
    v1 = original
    if not any(w in original.lower().split()[:3] for w in ["i", "we", "my"]):
        v1 = f"I believe that {original.lower()}" if original else f"I would take initiative regarding {prompt_word.lower()}."
    rewrites.append({
        "rewrite": v1,
        "explanation": "Added first-person perspective to show personal ownership and agency."
    })
    
    # Version 2: Add action orientation
    v2 = f"When I think of {prompt_word.lower()}, I take decisive action — {original.lower()}" if original else f"When facing {prompt_word.lower()}, I take immediate action and lead by example."
    rewrites.append({
        "rewrite": v2,
        "explanation": "Restructured with action-oriented language showing initiative and decisiveness."
    })
    
    # Version 3: Add empathy/team angle
    v3 = f"For me, {prompt_word.lower()} means working together — {original.lower()}" if original else f"{prompt_word} is about bringing people together and achieving shared goals."
    rewrites.append({
        "rewrite": v3,
        "explanation": "Added collaborative framing to show empathy and team orientation."
    })
    
    return rewrites[:count]
