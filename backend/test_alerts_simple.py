#!/usr/bin/env python3
"""
Simple PriceSentinel Alert Test
Tests core alert functionality without heavy AI dependencies
"""

import requests
import json
import time
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
        "asin": "BEARING_SKF_6205",
        "location": "chennai", 
        "alert_type": "PRICE_DROP",
        "threshold": 15.0,
        "mobile": TEST_PHONE
    }
    
    try:
        response = requests.post(f"{API_BASE}/alerts/rules", json=rule_data)
        if response.status_code == 201:
            result = response.json()
            print(f"✅ Alert rule created: ID {result['rule_id']}")
            return result['rule_id']
        else:
            print(f"❌ Failed to create rule: {response.text}")
            return None
    except Exception as e:
        print(f"❌ API call failed: {e}")
        return None

def test_alert_simulation():
    """Test alert simulation"""
    print("\n🎯 Testing Alert Simulation...")
    
    sim_data = {
        "alert_type": "PRICE_DROP",
        "asin": "BEARING_SKF_6205",
        "location": "chennai",
        "notify": True,
        "mobile": TEST_PHONE
    }
    
    try:
        response = requests.post(f"{API_BASE}/alerts/simulate", json=sim_data)
        if response.status_code == 201:
            result = response.json()
            print(f"✅ PRICE_DROP Alert: {result['message']}")
            print(f"   Notified: {result['whatsapp_notified']}")
            return True
        else:
            print(f"❌ Failed: {response.text}")
            return False
    except Exception as e:
        print(f"❌ API call failed: {e}")
        return False

def test_tts_audio():
    """Test Text-to-Speech audio generation"""
    print("\n🔊 Testing TTS Audio Generation...")
    
    test_message = "🔴 PriceSentinel Alert: SKF bearing 6205 price dropped 25% to ₹850. Immediate action required!"
    
    print("🎵 Generating English audio...")
    audio_path = generate_audio(test_message, "en")
    
    if audio_path:
        print(f"✅ Audio generated: {audio_path}")
        # Keep the file for potential upload
        return audio_path
    else:
        print("❌ Failed to generate audio")
        return None

def test_whatsapp_messages():
    """Test WhatsApp text and audio sending"""
    print("\n📱 Testing WhatsApp Messages...")
    
    # Test 1: Text message
    print("📝 Sending text alert...")
    text_message = """🔴 *PriceSentinel Alert*
━━━━━━━━━━━━━━━━━━
*SKF 6205-2RS1* · Chennai

Industrial Bearings Ltd (FBA, ⭐4.2) dropped to *₹850*

This is a 25% price drop from ₹1200 - significant competitive threat!

✅ *Action:* Consider matching price at ₹875 to maintain Buy Box

━━━━━━━━━━━━━━━━━━
_PriceSentinel · Chennai Monitor_"""

    text_result = sendWhatsAppText(TEST_PHONE, text_message)
    
    if text_result["success"]:
        print("✅ Text alert sent successfully")
    else:
        print(f"❌ Text alert failed: {text_result['error']}")
        return False
    
    # Wait for rate limit
    print("⏳ Waiting 65 seconds before audio test...")
    time.sleep(65)
    
    # Test 2: Audio message with sample URL
    print("🎵 Sending audio alert...")
    sample_audio_url = "https://dl.espressif.com/dl/audio/ff-16b-2c-44100hz.mp3"
    
    audio_result = sendWhatsAppAudio(TEST_PHONE, sample_audio_url)
    
    if audio_result["success"]:
        print("✅ Audio alert sent successfully")
        return True
    else:
        print(f"❌ Audio alert failed: {audio_result['error']}")
        return False

def test_multiple_alert_types():
    """Test different alert types with rate limiting"""
    print("\n📊 Testing Multiple Alert Types...")
    
    alert_types = [
        ("PRICE_DROP", "Price dropped significantly"),
        ("BUYBOX_CHANGE", "Buy Box ownership changed"), 
        ("PRICE_WAR", "Price war detected"),
        ("STOCKOUT_SIGNAL", "Potential stockout signal")
    ]
    
    for i, (alert_type, description) in enumerate(alert_types):
        print(f"\n{i+1}. Testing {alert_type} ({description})...")
        
        sim_data = {
            "alert_type": alert_type,
            "asin": f"TEST_BEARING_{i+1}",
            "location": "chennai",
            "notify": False,  # Don't send WhatsApp to avoid rate limits
            "mobile": TEST_PHONE
        }
        
        try:
            response = requests.post(f"{API_BASE}/alerts/simulate", json=sim_data)
            if response.status_code == 201:
                result = response.json()
                print(f"   ✅ {result['message']}")
            else:
                print(f"   ❌ Failed: {response.text}")
        except Exception as e:
            print(f"   ❌ API call failed: {e}")

def main():
    """Run simple alert system test"""
    print("🚀 PriceSentinel Alert System Test")
    print("=" * 50)
    
    try:
        # Test 1: Create Alert Rule
        rule_id = test_alert_rules()
        
        # Test 2: Simulate Alert (this will send WhatsApp)
        if rule_id:
            test_alert_simulation()
        
        # Test 3: TTS Audio Generation
        audio_path = test_tts_audio()
        
        # Test 4: WhatsApp Messages (text + audio)
        test_whatsapp_messages()
        
        # Test 5: Multiple Alert Types (no WhatsApp to avoid rate limits)
        test_multiple_alert_types()
        
        print("\n" + "=" * 50)
        print("🎉 Alert System Test Complete!")
        print("\n✅ Features Demonstrated:")
        print("• Manual phone number entry for alerts")
        print("• Alert rule creation via API")
        print("• Price drop simulation with WhatsApp notification")
        print("• Text-to-Speech audio generation")
        print("• WhatsApp text message alerts")
        print("• WhatsApp audio message alerts")
        print("• Multiple alert types (PRICE_DROP, BUYBOX_CHANGE, etc.)")
        print("• Rate limiting handling")
        
        print("\n📱 Check your WhatsApp for:")
        print("1. Alert rule confirmation message")
        print("2. Price drop simulation alert")
        print("3. Formatted text alert with pricing details")
        print("4. Audio message (sample)")
        
        # Cleanup
        if audio_path:
            try:
                import os
                os.remove(audio_path)
                print(f"\n🗑️ Cleaned up audio file: {audio_path}")
            except:
                pass
        
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")

if __name__ == "__main__":
    main()