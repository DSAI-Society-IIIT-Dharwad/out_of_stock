from langchain.tools import tool
from dotenv import load_dotenv
from pathlib import Path
import os

env_path = Path(__file__).parent / ".env"
load_dotenv(dotenv_path=env_path)

# import here AFTER load_dotenv so credentials are ready
from whatsapp_sender import send_whatsapp


@tool
def tool_send_whatsapp(phone_number: str, message: str) -> str:
    """
    Send a WhatsApp message to a distributor.
    Use this as the final step after composing the message.
    phone_number must include country code e.g. +919876543210
    """
    result = send_whatsapp(phone_number, message)
    if result["success"]:
        return f"Message delivered. SID: {result['sid']}"
    else:
        return f"Delivery failed: {result['error']}"


@tool
def tool_assess_threat(
    fulfillment_type: str,
    price_drop: float,
    seller_rating: float,
    is_new_seller: bool
) -> str:
    """
    Assess how serious a competitor price drop really is.
    fulfillment_type: 'FBA' or 'FBM'
    price_drop: rupee amount the price dropped
    seller_rating: competitor rating out of 5.0
    is_new_seller: True if this seller appeared this week
    Returns a threat level and reasoning.
    """
    score = 0
    reasons = []

    # Fulfillment type matters most
    if fulfillment_type == "FBA":
        score += 3
        reasons.append("FBA seller — real Buy Box threat")
    else:
        score += 1
        reasons.append("FBM seller — rarely beats FBA in Buy Box")

    # Size of the drop
    if price_drop >= 25:
        score += 3
        reasons.append(f"Large drop of Rs.{price_drop:.0f}")
    elif price_drop >= 15:
        score += 2
        reasons.append(f"Moderate drop of Rs.{price_drop:.0f}")
    else:
        score += 1
        reasons.append(f"Small drop of Rs.{price_drop:.0f}")

    # Seller quality
    if seller_rating >= 4.7:
        score += 2
        reasons.append("High rating — established seller")
    elif seller_rating >= 4.3:
        score += 1
        reasons.append("Decent rating")
    else:
        reasons.append("Low rating — less trusted by Amazon")

    # New entrants are unpredictable
    if is_new_seller:
        score += 1
        reasons.append("New entrant — unknown strategy")

    if score >= 8:
        level = "CRITICAL"
    elif score >= 6:
        level = "HIGH"
    elif score >= 4:
        level = "MEDIUM"
    else:
        level = "LOW"

    return f"Threat: {level} (score {score}/10) | {' | '.join(reasons)}"


@tool
def tool_recommend_price(
    our_current_price: float,
    competitor_new_price: float,
    our_fulfillment: str,
    competitor_fulfillment: str,
    floor_price: float,
    buybox_win_prob: float
) -> str:
    """
    Calculate the best price to recommend to the distributor.
    floor_price: minimum price they can sell at (cost + min margin)
    buybox_win_prob: current % chance of winning Buy Box (0 to 100)
    Returns recommended price with explanation.
    """

    # Case 1 — We are FBA, they are FBM
    # Amazon naturally favours us, no need to panic
    if our_fulfillment == "FBA" and competitor_fulfillment == "FBM":
        if buybox_win_prob >= 55:
            return (
                f"Hold at Rs.{our_current_price:.0f}. "
                f"Your FBA status protects you. "
                f"FBM competitors almost never win Buy Box against FBA "
                f"even at lower prices."
            )
        else:
            small_drop = min(8, our_current_price - floor_price)
            new_price = our_current_price - small_drop
            return (
                f"Small drop to Rs.{new_price:.0f} recommended. "
                f"FBM threat is low but your win probability is soft. "
                f"This should push you above 60 percent."
            )

    # Case 2 — Both FBA — direct competition
    elif our_fulfillment == "FBA" and competitor_fulfillment == "FBA":
        recommended = max(competitor_new_price - 2, floor_price)

        if recommended <= floor_price:
            return (
                f"Cannot compete on price — already at floor Rs.{floor_price:.0f}. "
                f"Focus on increasing review count and rating instead. "
                f"Price war here will only hurt margin."
            )

        margin_sacrificed = our_current_price - recommended
        return (
            f"Lower to Rs.{recommended:.0f} (give up Rs.{margin_sacrificed:.0f} margin). "
            f"Placing Rs.2 below their FBA price is the minimum needed "
            f"to recapture Buy Box."
        )

    # Case 3 — We are FBM (harder position)
    else:
        if competitor_fulfillment == "FBA":
            return (
                f"Difficult position — FBA competitor has structural advantage. "
                f"Consider moving this ASIN to FBA. "
                f"On price alone, drop to Rs.{max(competitor_new_price - 15, floor_price):.0f} "
                f"to partially compensate for FBM disadvantage."
            )
        else:
            recommended = max(competitor_new_price - 2, floor_price)
            return (
                f"Both FBM — standard competition. "
                f"Drop to Rs.{recommended:.0f} to undercut by Rs.2."
            )