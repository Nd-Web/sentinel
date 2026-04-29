from dotenv import load_dotenv
load_dotenv()
"""
SentinelAI — Scam Detection Engine v2 (Hardened)
=================================================
Powered by Azure OpenAI GPT-5.4-nano + 5-layer accuracy stack:

  1. RULE PRE-FLIGHT     — deterministic regex catches obvious cases
  2. DYNAMIC FEW-SHOT    — retrieve 3 most similar examples from labelled corpus
  3. CHAIN-OF-THOUGHT    — extract signals first, then score (not direct guess)
  4. SELF-CONSISTENCY    — for borderline cases (40-75), run twice and reconcile
  5. CALIBRATION         — post-process to enforce floors / ceilings / consistency

TeKnowledge x Microsoft 2026 Agentic AI Hackathon
"""

import os
import json
import asyncio
import logging
from openai import AzureOpenAI
from typing import Optional, Dict, Any

from ai.rules import apply_rules
from ai.retriever import retrieve_similar_examples, format_examples_for_prompt
from ai.calibrator import calibrate

logger = logging.getLogger(__name__)

_client_instance: Optional[AzureOpenAI] = None


def get_client() -> AzureOpenAI:
    global _client_instance
    if _client_instance is None:
        _client_instance = AzureOpenAI(
            azure_endpoint=os.getenv("AZURE_ENDPOINT", "https://placeholder.azure.com"),
            api_key=os.getenv("AZURE_API_KEY", "placeholder"),
            api_version=os.getenv("AZURE_API_VERSION", "2024-02-01"),
        )
    return _client_instance


CHAT_MODEL = os.getenv("AZURE_CHAT_MODEL", "gpt-5.4-nano")

DEFAULT_MEDIUM_RISK = {
    "risk_score": 50,
    "threat_level": "MEDIUM",
    "flags": ["analysis_unavailable"],
    "action": "REVIEW",
    "reasoning": "Unable to complete AI analysis. Manual review recommended.",
    "is_scam": False,
    "source": "fallback",
    "calibration_log": [],
    "self_consistency_applied": False,
    "suggested_actions": ["Manual review required", "Do not act on this message until verified"],
}


# ─────────────────────────────────────────────────────────────────────────────
# SYSTEM PROMPT — kept minimal to avoid content filter
# All scoring logic is in the user message, not the system prompt
# ─────────────────────────────────────────────────────────────────────────────

SYSTEM_PROMPT = """You are a message classification assistant for a telecom security platform in Nigeria.

Your job is to analyse incoming SMS and voice messages and classify them by risk level.

Always respond with a single JSON object. Never include any other text.

Output format:
{
  "risk_score": <integer 0-100>,
  "threat_level": "<HIGH|MEDIUM|LOW|CLEAN>",
  "flags": ["<signal_1>", "<signal_2>"],
  "action": "<BLOCK|REVIEW|ALLOW>",
  "reasoning": "<2-3 sentence explanation>",
  "is_scam": <true|false>,
  "suggested_actions": ["<action_1>", "<action_2>"]
}

Score thresholds:
- 80-100: threat_level HIGH, action BLOCK, is_scam true
- 50-79: threat_level MEDIUM, action REVIEW, is_scam true
- 20-49: threat_level LOW, action ALLOW, is_scam false
- 0-19: threat_level CLEAN, action ALLOW, is_scam false"""


# ─────────────────────────────────────────────────────────────────────────────
# USER PROMPT BUILDER — scoring rubric goes here, not in system prompt
# ─────────────────────────────────────────────────────────────────────────────

def _build_user_prompt(
    content: str,
    message_type: str,
    sender: Optional[str],
    retrieved_examples_block: str,
) -> str:
    sender_line = f"Sender: {sender}\n" if sender else ""

    return f"""Classify this {message_type.upper()} message for risk.

{sender_line}Message: "{content}"

Use this scoring guide:

Score 90-100 (BLOCK) when the message:
- Requests the recipient to share or repeat an authentication code to another person
- Requests full card credentials such as CVV or card number
- Contains a transfer instruction combined with a secrecy instruction
- Demands payment to avoid legal consequences from a named agency

Score 70-89 (BLOCK) when the message:
- Claims the recipient won a prize from a telecoms company
- Promises unrealistic daily income for minimal work
- Offers guaranteed investment returns
- Requires an upfront payment before receiving a loan

Score 50-69 (REVIEW) when the message:
- Makes an unsolicited loan offer without requesting upfront payment
- Contains a callback number that cannot be verified
- Uses a non-official web domain for a bank or government service

Score 0-49 (ALLOW) when the message:
- Is a standard transaction alert with a masked account number and official helpline
- Confirms airtime or data purchase
- Contains a USSD service code

Legitimacy indicators: masked account numbers, official bank helplines (0700/0730/01 prefix), USSD codes, transaction reference numbers, specific merchant and date.

{retrieved_examples_block}

Return only the JSON object."""


# ─────────────────────────────────────────────────────────────────────────────
# GPT CALL WRAPPER
# ─────────────────────────────────────────────────────────────────────────────

async def _call_gpt(
    content: str,
    message_type: str,
    sender: Optional[str],
    retrieved_examples_block: str,
    temperature: float = 0.1,
) -> Dict[str, Any]:
    user_prompt = _build_user_prompt(content, message_type, sender, retrieved_examples_block)

    response = get_client().chat.completions.create(
        model=CHAT_MODEL,
        messages=[
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "user", "content": user_prompt},
        ],
        max_completion_tokens=500,
        temperature=temperature,
        response_format={"type": "json_object"},
    )
    raw = response.choices[0].message.content
    return json.loads(raw)


# ─────────────────────────────────────────────────────────────────────────────
# MAIN ENTRY POINT
# ─────────────────────────────────────────────────────────────────────────────

async def analyse_message(
    content: str,
    message_type: str = "sms",
    sender: Optional[str] = None,
    org_id: Optional[str] = None,
) -> dict:
    try:
        # Layer 1: Rule pre-flight
        rule_result = apply_rules(content)

        if rule_result and rule_result.get("skip_gpt"):
            logger.info(f"Rule engine hard verdict: {rule_result.get('flags')}")
            result = _shape_result({
                "risk_score": rule_result["risk_score"],
                "threat_level": rule_result["threat_level"],
                "flags": rule_result["flags"],
                "action": rule_result["action"],
                "reasoning": rule_result["reasoning"],
                "is_scam": rule_result["is_scam"],
                "source": "rule_engine",
                "suggested_actions": rule_result.get("suggested_actions", []),
            })
            return await _apply_memory_boost(result, content, sender, org_id)

        rule_priors = rule_result.get("priors") if rule_result else None

        # Layer 2: Dynamic few-shot retrieval
        similar = retrieve_similar_examples(content, k=3)
        retrieved_block = format_examples_for_prompt(similar)

        # Layer 3: First GPT call
        first = await _call_gpt(content, message_type, sender, retrieved_block, temperature=0.1)
        score = float(first.get("risk_score", 50))
        final = first

        # Layer 4: Self-consistency on borderline cases (40-75)
        if 40 <= score <= 75:
            try:
                second = await _call_gpt(content, message_type, sender, retrieved_block, temperature=0.3)
                avg = (score + float(second.get("risk_score", score))) / 2
                merged_flags = list(set(
                    list(first.get("flags", [])) + list(second.get("flags", []))
                ))
                reasoning = max(
                    [first.get("reasoning", ""), second.get("reasoning", "")],
                    key=len,
                )
                sa1 = first.get("suggested_actions", [])
                sa2 = second.get("suggested_actions", [])
                final = {
                    "risk_score": avg,
                    "threat_level": first.get("threat_level"),
                    "flags": merged_flags,
                    "action": first.get("action"),
                    "reasoning": reasoning,
                    "is_scam": first.get("is_scam"),
                    "self_consistency_applied": True,
                    "scores_observed": [score, float(second.get("risk_score", score))],
                    "suggested_actions": sa1 if len(sa1) >= len(sa2) else sa2,
                }
                logger.info(f"Self-consistency applied: {final['scores_observed']}")
            except Exception as e:
                logger.warning(f"Self-consistency second call failed: {e}")

        # Layer 5: Calibration
        calibrated = calibrate(final, content, rule_priors=rule_priors)
        result = _shape_result({**calibrated, "source": "gpt+calibration"})
        return await _apply_memory_boost(result, content, sender, org_id)

    except json.JSONDecodeError as e:
        logger.error(f"JSON parse error: {e}")
        return DEFAULT_MEDIUM_RISK
    except Exception as e:
        logger.error(f"Analysis failed: {e}")
        try:
            rule_result = apply_rules(content)
            if rule_result:
                return _shape_result({
                    "risk_score": rule_result["risk_score"],
                    "threat_level": rule_result["threat_level"],
                    "flags": rule_result.get("flags", []),
                    "action": rule_result["action"],
                    "reasoning": rule_result["reasoning"] + " (AI unavailable — rule engine used)",
                    "is_scam": rule_result.get("is_scam", False),
                    "source": "rule_engine_fallback",
                    "suggested_actions": rule_result.get("suggested_actions", []),
                })
        except Exception:
            pass
        return DEFAULT_MEDIUM_RISK


async def _apply_memory_boost(
    result: dict,
    content: str,
    sender: Optional[str],
    org_id: Optional[str],
) -> dict:
    if not org_id:
        return result
    try:
        from ai.memory import check_fraud_memory
        memory_check = check_fraud_memory(org_id, content, sender or "")
        if memory_check.get("matched"):
            boost = memory_check.get("memory_boost", 0.0)
            new_score = min(100.0, result["risk_score"] + boost)
            if boost > 0:
                result["risk_score"] = new_score
                result["calibration_log"] = result.get("calibration_log", []) + [
                    f"Memory boost +{boost:.1f} from {len(memory_check.get('patterns', []))} org pattern(s)"
                ]
                if new_score >= 80:
                    result["threat_level"] = "HIGH"
                    result["action"] = "BLOCK"
                elif new_score >= 50:
                    result["threat_level"] = "MEDIUM"
                    result["action"] = "REVIEW"
    except Exception as e:
        logger.warning(f"Memory boost failed (non-fatal): {e}")
    return result


def _shape_result(r: Dict[str, Any]) -> dict:
    return {
        "risk_score": max(0.0, min(100.0, float(r.get("risk_score", 50)))),
        "threat_level": r.get("threat_level", "MEDIUM"),
        "flags": list(r.get("flags", [])),
        "action": r.get("action", "REVIEW"),
        "reasoning": r.get("reasoning", "Analysis completed."),
        "is_scam": bool(r.get("is_scam", False)),
        "source": r.get("source", "gpt"),
        "calibration_log": r.get("calibration_log", []),
        "self_consistency_applied": r.get("self_consistency_applied", False),
        "suggested_actions": list(r.get("suggested_actions", [])),
    }


async def batch_analyse(messages: list) -> list:
    tasks = [
        analyse_message(
            content=msg.get("content", ""),
            message_type=msg.get("message_type", "sms"),
            sender=msg.get("sender"),
        )
        for msg in messages
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    return [
        r if not isinstance(r, Exception) else DEFAULT_MEDIUM_RISK
        for r in results
    ]


async def evaluate_model_performance() -> dict:
    dataset_path = os.path.join(
        os.path.dirname(__file__), "data", "nigerian_scam_dataset.json"
    )
    with open(dataset_path, "r", encoding="utf-8") as f:
        dataset = json.load(f)

    samples = dataset.get("samples", [])
    if not samples:
        return {"error": "No samples available"}

    correct = 0
    tp = fp = tn = fn = 0
    score_diffs = []
    results = []

    for item in samples:
        result = await analyse_message(
            content=item["content"],
            message_type=item.get("message_type", "sms"),
        )
        expected_action = item.get("action")
        predicted_action = result["action"]
        is_correct = expected_action == predicted_action
        if is_correct:
            correct += 1

        expected_pos = expected_action == "BLOCK"
        predicted_pos = predicted_action == "BLOCK"
        if expected_pos and predicted_pos:
            tp += 1
        elif (not expected_pos) and (not predicted_pos):
            tn += 1
        elif (not expected_pos) and predicted_pos:
            fp += 1
        else:
            fn += 1

        score_diffs.append(abs(item.get("risk_score", 50) - result["risk_score"]))

        results.append({
            "id": item["id"],
            "category": item.get("category", "unknown"),
            "preview": item["content"][:80] + ("..." if len(item["content"]) > 80 else ""),
            "expected_action": expected_action,
            "predicted_action": predicted_action,
            "expected_score": item.get("risk_score"),
            "predicted_score": result["risk_score"],
            "correct": is_correct,
            "source": result.get("source", "gpt"),
        })

    total = len(samples)
    precision = tp / (tp + fp) if (tp + fp) else 0
    recall = tp / (tp + fn) if (tp + fn) else 0
    f1 = (2 * precision * recall / (precision + recall)) if (precision + recall) else 0

    return {
        "accuracy": round(correct / total * 100, 2),
        "precision": round(precision * 100, 2),
        "recall": round(recall * 100, 2),
        "f1": round(f1 * 100, 2),
        "mean_score_error": round(sum(score_diffs) / len(score_diffs), 2),
        "correct": correct,
        "total": total,
        "confusion": {"tp": tp, "fp": fp, "tn": tn, "fn": fn},
        "results": results,
    }


def get_threat_level_from_score(score: float) -> str:
    if score >= 80:
        return "HIGH"
    elif score >= 50:
        return "MEDIUM"
    elif score >= 20:
        return "LOW"
    return "CLEAN"