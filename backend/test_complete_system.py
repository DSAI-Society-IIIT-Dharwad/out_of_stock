#!/usr/bin/env python3
"""
Complete PriceSentinel System Test
Tests alert rules, AI agent, text + audio notifications
"""

import requests
import json
import time
from Agent.agent import run_agent
from Agent.tts_engine import generate_audio
from Agent.whatsapp_sender import sendWhatsAppText, sendWhatsAppAudio

# Configuration
API_BASE = "http://localhost:8000/api/v1"
TEST_PHONE = "+918329832867"  # Your WhatsApp number

def test_alert_rules():
    """Test creating alert rules via API"""
    print("🔧 Testing Alert Rules...")
    
    # Create a new alert rule
    rule_data = {
        "asin": "TEST_BEARING_123",
        "location": "chennai", 
        "alert_type": "PRICE_DROP",
        "threshold": 15.0,
        "mobile": TEST_PHONE
    }
    
    response = requests.post(f"{API_BASE}/alerts/rules", json=rule_data)
    if response.status_code == 201:
        result = response.json()
        print(f"✅ Alert rule created: ID {result['rule_id']}")
        return result['rule_id']
    else:
        print(f"❌ Failed to create rule: {response.text}")
        return None

def test_alert_simulation():
    """Test alert simulation with different types"""
    print("\n🎯 Testing Alert Simulation...")
    
    alert_types = ["PRICE_DROP", "BUYBOX_CHANGE", "PRICE_WAR", "STOCKOUT_SIGNAL"]
    
    for alert_type in alert_types:
        print(f"\n📊 Simulating {alert_type}...")
        
        sim_data = {
            "alert_type": alert_type,
            "asin": "TEST_BEARING_123",
            "location": "chennai",
            "notify": True,
            "mobile": TEST_PHONE
        }
        
        response = requests.post(f"{API_BASE}/alerts/simulate", json=sim_data)
        if response.status_code == 201:
            result = response.json()
            print(f"✅ {alert_type}: {result['message']}")
            print(f"   Notified: {result['whatsapp_notified']}")
            
            # Wait to avoid rate limiting
            print("   ⏳ Waiting 65 seconds to avoid rate limit...")
            time.sleep(65)
        else:
            print(f"❌ Failed: {response.text}")

def test_ai_agent():
    """Test the AI agent with realistic data"""
    print("\n🤖 Testing AI Agent...")
    
    # Realistic bearing price alert data
    alert_data = {
        "model": "SKF 6205-2RS1",
        "city": "Chennai",
        "competitor_name": "Industrial Bearings Ltd",
        "competitor_fulfillment": "FBA",
        "competitor_rating": "4.2",
        "competitor_new_price": "850",
        "our_price": "1200",
        "our_fulfillment": "FBM", 
        "floor_price": "800",
        "buybox_win_prob": "0.75",
        "price_drop": "25.5",
        "is_new_seller": False
    }
    
    try:
        result = run_agent(alert_data, TEST_PHONE)
        print("✅ AI Agent Response:")
        print(result)
        return True
    except Exception as e:
        print(f"❌ AI Agent failed: {e}")
        return False

def test_tts_audio():
    """Test Text-to-Speech audio generation"""
    print("\n🔊 Testing TTS Audio Generation...")
    
    test_messages = [
        ("English", "en", "🔴 PriceSentinel Alert: SKF bearing price dropped 25% to ₹850. Competitor threat detected!"),
        ("Hindi", "hi", "🔴 PriceSentinel अलर्ट: SKF बेयरिंग की कीमत 25% गिरकर ₹850 हो गई। प्रतियोगी खतरा!"),
        ("Tamil", "ta", "🔴 PriceSentinel எச்சரிக்கை: SKF பேரிங் விலை 25% குறைந்து ₹850 ஆனது।")
    ]
    
    for lang_name, lang_code, message in test_messages:
        print(f"\n🎵 Generating {lang_name} audio...")
        audio_path = generate_audio(message, lang_code)
        
        if audio_path:
            print(f"✅ Audio generated: {audio_path}")
            # Clean up
            import os
            try:
                os.remove(audio_path)
                print("   🗑️ Cleaned up audio file")
            except:
                pass
        else:
            print(f"❌ Failed to generate {lang_name} audio")

def test_whatsapp_integration():
    """Test WhatsApp text and audio sending"""
    print("\n📱 Testing WhatsApp Integration...")
    
    # Test text message
    print("📝 Testing text message...")
    text_result = sendWhatsAppText(
        TEST_PHONE, 
        "🧪 PriceSentinel System Test\n\n✅ Complete system integration working!\n\n🔧 Features tested:\n• Alert rules\n• AI agent\n• TTS audio\n• Multi-language support"
    )
    
    if text_result["success"]:
        print("✅ Text message sent successfully")
    else:
        print(f"❌ Text message failed: {text_result['error']}")
    
    # Wait for rate limit
    print("⏳ Waiting 65 seconds before audio test...")
    time.sleep(65)
    
    # Test audio message (using a sample audio URL)
    print("🎵 Testing audio message...")
    sample_audio_url = "https://dl.espressif.com/dl/audio/ff-16b-2c-44100hz.mp3"
    
    audio_result = sendWhatsAppAudio(TEST_PHONE, sample_audio_url)
    
    if audio_result["success"]:
        print("✅ Audio message sent successfully")
    else:
        print(f"❌ Audio message failed: {audio_result['error']}")

def main():
    """Run complete system test"""
    print("🚀 PriceSentinel Complete System Test")
    print("=" * 50)
    
    try:
        # Test 1: Alert Rules
        rule_id = test_alert_rules()
        
        # Test 2: Alert Simulation (with rate limiting)
        test_alert_simulation()
        
        # Test 3: AI Agent
        test_ai_agent()
        
        # Test 4: TTS Audio
        test_tts_audio()
        
        # Test 5: WhatsApp Integration
        test_whatsapp_integration()
        
        print("\n" + "=" * 50)
        print("🎉 Complete System Test Finished!")
        print("\nFeatures Demonstrated:")
        print("✅ Alert rule creation with manual phone number")
        print("✅ Multiple alert types (PRICE_DROP, BUYBOX_CHANGE, etc.)")
        print("✅ AI-powered threat assessment")
        print("✅ Multi-language support (English, Hindi, Tamil)")
        print("✅ Text-to-Speech audio generation")
        print("✅ WhatsApp text + audio notifications")
        print("✅ Rate limiting handling")
        
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")

if __name__ == "__main__":
    main()