#!/usr/bin/env python3
"""Test WasenderAPI integration."""

import os
from dotenv import load_dotenv
from whatsapp_sender import sendWhatsAppText, sendWhatsAppAudio

load_dotenv()

def test_text_message():
    """Test sending a text message."""
    # Use your personal number for testing
    phone = "+918329832867"  # Your personal WhatsApp number
    message = "🔔 TEST: WasenderAPI integration working! This is from your PriceSentinel system."
    
    print(f"Sending test message to {phone}...")
    result = sendWhatsAppText(phone, message)
    print(f"Text message result: {result}")
    return result

def test_audio_message():
    """Test sending an audio message."""
    phone = "+918329832867"  # Your personal WhatsApp number
    # Use a sample audio URL for testing
    audio_url = "https://dl.espressif.com/dl/audio/ff-16b-2c-44100hz.mp3"
    
    print(f"Sending test audio to {phone}...")
    result = sendWhatsAppAudio(phone, audio_url)
    print(f"Audio message result: {result}")
    return result

def test_price_alert_simulation():
    """Simulate a real price alert."""
    phone = "+918329832867"  # Your personal WhatsApp number
    alert_message = """🔔 PriceSentinel Alert!

📱 Product: iPhone 15 Pro
💰 Price Drop: ₹1,20,000 → ₹95,000
📉 Discount: 21% OFF
🛒 Available at: Amazon

⏰ Limited time offer!"""
    
    print(f"Sending price alert simulation to {phone}...")
    result = sendWhatsAppText(phone, alert_message)
    print(f"Price alert result: {result}")
    return result

if __name__ == "__main__":
    print("🚀 Testing WasenderAPI Integration...")
    print("=" * 50)
    
    # Test 1: Simple text message
    print("\n1️⃣ Testing Text Message:")
    test_text_message()
    
    # Test 2: Audio message
    print("\n2️⃣ Testing Audio Message:")
    test_audio_message()
    
    # Test 3: Price alert simulation
    print("\n3️⃣ Testing Price Alert Simulation:")
    test_price_alert_simulation()
    
    print("\n✅ All tests completed!")
    print("Check your WhatsApp for messages from +918698641488")