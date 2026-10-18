import json
from pathlib import Path

p = str(Path(__file__).resolve().parent.parent)

nodes = [
    # CLAUDE.md
    {
        "id": "claude_editorial_guidelines",
        "label": "Éditorial Guidelines & Anti-Hallucination Rules",
        "file_type": "rationale",
        "source_file": f"{p}/CLAUDE.md",
        "source_location": "CLAUDE.md:L1-L60",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "claude_adhd_output_format",
        "label": "ADHD Output Rules Contract",
        "file_type": "rationale",
        "source_file": f"{p}/CLAUDE.md",
        "source_location": "CLAUDE.md:L30-L50",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    # README.md
    {
        "id": "readme_pipeline_architecture",
        "label": "Pipeline n8n Architecture",
        "file_type": "document",
        "source_file": f"{p}/README.md",
        "source_location": "README.md:L9-L28",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "readme_16_rss_sources",
        "label": "16 Verified RSS Feeds Catalog",
        "file_type": "document",
        "source_file": f"{p}/README.md",
        "source_location": "README.md:L31-L53",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "readme_n8n_credentials",
        "label": "n8n Credentials Config (Gemini & Telegram)",
        "file_type": "concept",
        "source_file": f"{p}/README.md",
        "source_location": "README.md:L56-L65",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "readme_schedule_trigger",
        "label": "Schedule Trigger (07:00 Africa/Algiers)",
        "file_type": "concept",
        "source_file": f"{p}/README.md",
        "source_location": "README.md:L67-L78",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "readme_troubleshooting_checklist",
        "label": "Troubleshooting 2-Minute Checklist",
        "file_type": "document",
        "source_file": f"{p}/README.md",
        "source_location": "README.md:L97-L117",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    # docker-compose.yml
    {
        "id": "docker_compose_n8n_service",
        "label": "n8n Self-Hosted Container Service",
        "file_type": "concept",
        "source_file": f"{p}/docker-compose.yml",
        "source_location": "docker-compose.yml:L1-L25",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    # prompts/summarizer.system.md
    {
        "id": "prompts_summarizer_system_gemini_prompt",
        "label": "Gemini 3.8 Flash System Prompt",
        "file_type": "concept",
        "source_file": f"{p}/prompts/summarizer.system.md",
        "source_location": "prompts/summarizer.system.md:L1-L150",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "prompts_summarizer_json_schema",
        "label": "Strict JSON Output Schema Contract",
        "file_type": "concept",
        "source_file": f"{p}/prompts/summarizer.system.md",
        "source_location": "prompts/summarizer.system.md:L40-L100",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "prompts_summarizer_verbatim_proof_rule",
        "label": "Verbatim Proof & Numeric Fact Extraction Rule",
        "file_type": "rationale",
        "source_file": f"{p}/prompts/summarizer.system.md",
        "source_location": "prompts/summarizer.system.md:L20-L45",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    # docs/rapport_final.md
    {
        "id": "docs_rapport_final_source_replacements",
        "label": "RSS Sources Replacement Audit (MarketWatch)",
        "file_type": "document",
        "source_file": f"{p}/docs/rapport_final.md",
        "source_location": "docs/rapport_final.md:L5-L18",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "docs_rapport_final_quotas_and_formats",
        "label": "Editorial Quotas & Output Hypotheses",
        "file_type": "rationale",
        "source_file": f"{p}/docs/rapport_final.md",
        "source_location": "docs/rapport_final.md:L20-L40",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "docs_rapport_final_known_limits",
        "label": "Pipeline Known Boundaries & Limits",
        "file_type": "document",
        "source_file": f"{p}/docs/rapport_final.md",
        "source_location": "docs/rapport_final.md:L42-L55",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    {
        "id": "docs_rapport_final_manual_checks",
        "label": "3 Pre-Activation Verification Checks",
        "file_type": "document",
        "source_file": f"{p}/docs/rapport_final.md",
        "source_location": "docs/rapport_final.md:L57-L70",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    # docs/instagram-phase2.md
    {
        "id": "docs_instagram_carousel_pipeline",
        "label": "Instagram Carousel Publication Architecture",
        "file_type": "concept",
        "source_file": f"{p}/docs/instagram-phase2.md",
        "source_location": "docs/instagram-phase2.md:L1-L60",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    },
    # templates/card.html
    {
        "id": "templates_card_html_visual_design",
        "label": "News Card 1080x1350 Visual Template",
        "file_type": "concept",
        "source_file": f"{p}/templates/card.html",
        "source_location": "templates/card.html:L1-L100",
        "source_url": None, "captured_at": None, "author": None, "contributor": None
    }
]

edges = [
    {
        "source": "readme_pipeline_architecture",
        "target": "readme_16_rss_sources",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": f"{p}/README.md",
        "source_location": "README.md:L12",
        "weight": 1.0
    },
    {
        "source": "readme_pipeline_architecture",
        "target": "prompts_summarizer_system_gemini_prompt",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": f"{p}/README.md",
        "source_location": "README.md:L16",
        "weight": 1.0
    },
    {
        "source": "prompts_summarizer_system_gemini_prompt",
        "target": "prompts_summarizer_json_schema",
        "relation": "implements",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": f"{p}/prompts/summarizer.system.md",
        "source_location": "prompts/summarizer.system.md:L45",
        "weight": 1.0
    },
    {
        "source": "prompts_summarizer_system_gemini_prompt",
        "target": "prompts_summarizer_verbatim_proof_rule",
        "relation": "implements",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": f"{p}/prompts/summarizer.system.md",
        "source_location": "prompts/summarizer.system.md:L25",
        "weight": 1.0
    },
    {
        "source": "claude_editorial_guidelines",
        "target": "prompts_summarizer_verbatim_proof_rule",
        "relation": "rationale_for",
        "confidence": "INFERRED",
        "confidence_score": 0.95,
        "source_file": f"{p}/CLAUDE.md",
        "source_location": "CLAUDE.md:L20",
        "weight": 1.0
    },
    {
        "source": "docs_rapport_final_source_replacements",
        "target": "readme_16_rss_sources",
        "relation": "cites",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": f"{p}/docs/rapport_final.md",
        "source_location": "docs/rapport_final.md:L6-L15",
        "weight": 1.0
    },
    {
        "source": "docs_rapport_final_quotas_and_formats",
        "target": "readme_pipeline_architecture",
        "relation": "rationale_for",
        "confidence": "INFERRED",
        "confidence_score": 0.95,
        "source_file": f"{p}/docs/rapport_final.md",
        "source_location": "docs/rapport_final.md:L22",
        "weight": 1.0
    },
    {
        "source": "docs_instagram_carousel_pipeline",
        "target": "templates_card_html_visual_design",
        "relation": "references",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": f"{p}/docs/instagram-phase2.md",
        "source_location": "docs/instagram-phase2.md:L40",
        "weight": 1.0
    },
    {
        "source": "readme_n8n_credentials",
        "target": "readme_pipeline_architecture",
        "relation": "conceptually_related_to",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": f"{p}/README.md",
        "source_location": "README.md:L60",
        "weight": 1.0
    },
    {
        "source": "readme_schedule_trigger",
        "target": "readme_pipeline_architecture",
        "relation": "conceptually_related_to",
        "confidence": "EXTRACTED",
        "confidence_score": 1.0,
        "source_file": f"{p}/README.md",
        "source_location": "README.md:L70",
        "weight": 1.0
    },
    {
        "source": "docs_rapport_final_manual_checks",
        "target": "readme_troubleshooting_checklist",
        "relation": "semantically_similar_to",
        "confidence": "INFERRED",
        "confidence_score": 0.85,
        "source_file": f"{p}/docs/rapport_final.md",
        "source_location": "docs/rapport_final.md:L58",
        "weight": 1.0
    }
]

hyperedges = [
    {
        "id": "daily_news_editorial_pipeline",
        "label": "Daily News Editorial Pipeline Core",
        "nodes": [
            "readme_pipeline_architecture",
            "readme_16_rss_sources",
            "prompts_summarizer_system_gemini_prompt",
            "docs_rapport_final_quotas_and_formats"
        ],
        "relation": "form",
        "confidence": "EXTRACTED",
        "confidence_score": 0.95,
        "source_file": f"{p}/README.md"
    }
]

chunk_data = {
    "nodes": nodes,
    "edges": edges,
    "hyperedges": hyperedges,
    "input_tokens": 0,
    "output_tokens": 0
}

Path("graphify-out/.graphify_chunk_01.json").write_text(json.dumps(chunk_data, indent=2, ensure_ascii=False), encoding="utf-8")
print(f"Generated semantic chunk with {len(nodes)} nodes, {len(edges)} edges, {len(hyperedges)} hyperedges")
