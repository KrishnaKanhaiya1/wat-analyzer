"""
Domain-specific trait mappers.
Converts generic trait vectors into module-specific labels and explanations.
"""

from typing import Dict, List, Any

# Module-specific trait label mappings
TRAIT_MAPPINGS = {
    "ssb": {
        "positivity": {"label": "Optimism & Positive Outlook", "olq": "Effective Intelligence"},
        "emotional_stability": {"label": "Emotional Stability", "olq": "Emotional Maturity"},
        "agency": {"label": "Initiative & Decisiveness", "olq": "Initiative"},
        "leadership": {"label": "Leadership & Commanding Presence", "olq": "Effective Intelligence"},
        "responsibility": {"label": "Sense of Responsibility", "olq": "Sense of Responsibility"},
        "empathy": {"label": "Cooperation & Fellow Feeling", "olq": "Cooperation"},
        "clarity": {"label": "Power of Expression", "olq": "Power of Expression"},
    },
    "interview": {
        "positivity": {"label": "Positive Attitude & Confidence"},
        "emotional_stability": {"label": "Composure Under Pressure"},
        "agency": {"label": "Proactiveness & Self-Starter"},
        "leadership": {"label": "Leadership Potential"},
        "responsibility": {"label": "Ownership & Accountability"},
        "empathy": {"label": "Teamwork & Collaboration"},
        "clarity": {"label": "Communication Clarity"},
    },
    "student": {
        "positivity": {"label": "Growth Mindset & Optimism"},
        "emotional_stability": {"label": "Emotional Resilience"},
        "agency": {"label": "Self-Discipline & Initiative"},
        "leadership": {"label": "Peer Leadership"},
        "responsibility": {"label": "Responsibility & Accountability"},
        "empathy": {"label": "Empathy & Kindness"},
        "clarity": {"label": "Articulation & Expressiveness"},
    },
    "workplace": {
        "positivity": {"label": "Constructive Outlook"},
        "emotional_stability": {"label": "Professional Composure"},
        "agency": {"label": "Assertiveness & Initiative"},
        "leadership": {"label": "Strategic Leadership"},
        "responsibility": {"label": "Ownership & Alignment"},
        "empathy": {"label": "Empathy & Emotional Intelligence"},
        "clarity": {"label": "Communication Effectiveness"},
    },
}

def map_traits_to_domain(
    generic_traits: Dict[str, float],
    module: str
) -> List[Dict[str, Any]]:
    """Convert generic trait scores to domain-specific labels and scores."""
    mapping = TRAIT_MAPPINGS.get(module, TRAIT_MAPPINGS["interview"])
    
    result = []
    for trait_key, score in generic_traits.items():
        info = mapping.get(trait_key, {"label": trait_key.replace("_"," ").title()})
        entry = {
            "trait": trait_key,
            "label": info["label"],
            "score": score,
            "level": _score_to_level(score),
        }
        if "olq" in info:
            entry["olq"] = info["olq"]
        result.append(entry)
    
    return sorted(result, key=lambda x: x["score"], reverse=True)

def _score_to_level(score: float) -> str:
    if score >= 0.75:
        return "strong"
    elif score >= 0.5:
        return "moderate"
    elif score >= 0.25:
        return "developing"
    else:
        return "needs_focus"

def generate_trait_explanation(trait_key: str, score: float, module: str) -> str:
    """Generate a brief explanation for a trait score."""
    mapping = TRAIT_MAPPINGS.get(module, TRAIT_MAPPINGS["interview"])
    info = mapping.get(trait_key, {"label": trait_key})
    label = info["label"]
    level = _score_to_level(score)
    
    explanations = {
        "strong": f"Your '{label}' is strong (score: {score:.0%}). Your responses consistently demonstrate this quality through your word choices, emotional tone, and sentence structure.",
        "moderate": f"Your '{label}' is moderate (score: {score:.0%}). There are clear signs of this quality, with room to strengthen it through more intentional language and active phrasing.",
        "developing": f"Your '{label}' is developing (score: {score:.0%}). Consider using more first-person active language and concrete examples to enhance this trait in your responses.",
        "needs_focus": f"Your '{label}' needs attention (score: {score:.0%}). Focus on using decisive, action-oriented language and taking clear ownership in your responses.",
    }
    return explanations.get(level, f"'{label}': {score:.0%}")

def get_passport_narrative(all_traits: Dict[str, float], module_history: Dict[str, int]) -> str:
    """Generate a narrative summary for the soft-skill passport."""
    sorted_traits = sorted(all_traits.items(), key=lambda x: x[1], reverse=True)
    strengths = sorted_traits[:3]
    growth_areas = sorted_traits[-3:]
    
    narrative = "## Your Soft-Skill Profile\n\n"
    narrative += "### Top Strengths\n"
    for trait, score in strengths:
        label = trait.replace("_", " ").title()
        narrative += f"- **{label}** ({score:.0%}): This is one of your standout qualities, consistently appearing across your responses.\n"
    
    narrative += "\n### Growth Areas\n"
    for trait, score in growth_areas:
        label = trait.replace("_", " ").title()
        narrative += f"- **{label}** ({score:.0%}): This area has the most potential for improvement through targeted practice.\n"
    
    total = sum(module_history.values())
    if total > 0:
        narrative += f"\n### Activity Summary\n"
        narrative += f"You have completed **{total}** sessions across modules: "
        parts = [f"{k.upper()} ({v})" for k, v in module_history.items() if v > 0]
        narrative += ", ".join(parts) + ".\n"
    
    return narrative
