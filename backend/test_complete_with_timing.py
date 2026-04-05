#!/usr/bin/env python3
"""
Complete PriceSentinel Test with Rate Limiting Management
Handles 1-minute rate limits and tests all functionality
"""

import requests
import json
import time
from datetime import datetime, timedelta
from Agent.tts_engine import generate_audio
from Agent.whatsapp_sender import sendWhatsAppText, sendWhatsAppAudio
import os
import tempfile
import shutil

# Configuration
API_BASE = "http://localhost:8000/api/v1"
TEST_PHONE = "+918329832867"
RATE_LIMIT_SECONDS = 65  # 65 seconds to be safe

class RateLimitManager:
    def __init__(self):
        self.last_message_time = None
    
    def wait_if_needed(self, message="Waiting for rate limit..."):
        if self.last_message_time:
            elapsed = time.time() - self.last_message_time
            if elapsed < RATE_LIMIT_SECONDS:
                wait_time = RATE_LIMIT_SECONDS - elapsed
                print(f"⏳ {message} ({wait_time:.0f}s remaining)")
                time.sleep(wait_time)
        
        self.last_message_time = time.time()
        timestamp = datetime.now().strftime("%H:%M:%S")
        print(f"🕐 Message sent at {timestamp}")

rate_limiter = RateLimitManager()

def test_alert_rules():
    """Test creating alert rules via API"""
    print("🔧 Testing Alert Rules...")
    
    rule_data = {
        "asin": "SKF_6205_BEARING_COMPLETE",
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
            rate_limiter.wait_if_needed("Rule confirmation sent")
            return result['rule_id']
        else:
            print(f"❌ Failed to create rule: {response.text}")
            return None
    except Exception as e:
        print(f"❌ API call failed: {e}")
        return None

def test_tts_multilingual():
    """Test TTS in multiple languages"""
    print("\n🌐 Testing Multi-Language TTS...")
    
    messages = [
        ("English", "en", "PriceSentinel Alert: SKF bearing price dropped 25 percent to 850 rupees"),
        ("Hindi", "hi", "प्राइस सेंटिनल अलर्ट: SKF बेयरिंग की कीमत 25 प्रतिशत गिरकर 850 रुपये हो गई"),
        ("Tamil", "ta", "விலை காவலர் எச்சரிக்கை: SKF தாங்கி விலை 25 சதவீதம் குறைந்து 850 ரூபாய் ஆனது")
    ]
    
    audio_files = []
    
    for lang_name, lang_code, message in messages:
        print(f"\n🎵 Generating {lang_name} TTS...")
        audio_path = generate_audio(message, lang_code)
        
        if audio_path:
            # Create a permanent file with proper naming
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            permanent_path = f"alert_audio_{lang_code}_{timestamp}.mp3"
            shutil.copy2(audio_path, permanent_path)
            
            print(f"✅ {lang_name} audio: {permanent_path}")
            audio_files.append((lang_name, permanent_path))
            
            # Clean up temp file
            try:
                os.remove(audio_path)
            except:
                pass
        else:
            print(f"❌ Failed to generate {lang_name} audio")
    
    return audio_files

def test_whatsapp_text_alerts():
    """Test formatted WhatsApp text alerts"""
    print("\n📱 Testing WhatsApp Text Alerts...")
    
    alerts = [
        {
            "title": "Price Drop Alert",
            "message": """🔴 *PriceSentinel Alert*
━━━━━━━━━━━━━━━━━━
*SKF 6205-2RS1* · Chennai

Industrial Bearings Ltd (FBA, ⭐4.2) 
Price: ₹1,200 → *₹850* (-29%)

🚨 *CRITICAL THREAT DETECTED*

✅ *Recommended Action:*
Match competitor at ₹875 to maintain Buy Box

━━━━━━━━━━━━━━━━━━
_PriceSentinel · Chennai Monitor_"""
        },
        {
            "title": "Buy Box Change Alert", 
            "message": """🟠 *PriceSentinel Alert*
━━━━━━━━━━━━━━━━━━
*NSK 6206-ZZ* · Mumbai

🔄 *Buy Box Changed*
From: SKF India → NTN Bearings
Price: ₹950 (unchanged)

⚠️ Monitor for price changes

━━━━━━━━━━━━━━━━━━
_PriceSentinel · Mumbai Monitor_"""
        }
    ]
    
    for i, alert in enumerate(alerts):
        print(f"\n📝 Sending {alert['title']}...")
        
        rate_limiter.wait_if_needed(f"Sending {alert['title']}")
        
        result = sendWhatsAppText(TEST_PHONE, alert['message'])
        
        if result["success"]:
            print(f"✅ {alert['title']} sent successfully")
        else:
            print(f"❌ {alert['title']} failed: {result['error']}")

def test_whatsapp_audio_alerts(audio_files):
    """Test WhatsApp audio alerts"""
    print("\n🎵 Testing WhatsApp Audio Alerts...")
    
    if not audio_files:
        print("❌ No audio files to test")
        return
    
    # Test with a public audio URL first
    print("📡 Testing with public audio URL...")
    rate_limiter.wait_if_needed("Sending public audio")
    
    public_audio_url = "https://dl.espressif.com/dl/audio/ff-16b-2c-44100hz.mp3"
    result = sendWhatsAppAudio(TEST_PHONE, public_audio_url)
    
    if result["success"]:
        print("✅ Public audio sent successfully")
    else:
        print(f"❌ Public audio failed: {result['error']}")
    
    # Note about local files
    print(f"\n📁 Generated {len(audio_files)} local audio files:")
    for lang_name, file_path in audio_files:
        print(f"   🎵 {lang_name}: {file_path}")
    
    print("\n💡 To send local audio files:")
    print("1. Upload files to a public server/CDN")
    print("2. Use the public URLs with sendWhatsAppAudio()")
    print("3. Or set up webhook_server.py to serve local files")

def test_alert_simulation():
    """Test alert simulation with rate limiting"""
    print("\n🎯 Testing Alert Simulation...")
    
    alert_types = [
        ("PRICE_DROP", "Price drop detected"),
        ("BUYBOX_CHANGE", "Buy Box ownership changed"),
        ("PRICE_WAR", "Price war in progress"),
        ("STOCKOUT_SIGNAL", "Stockout signal detected")
    ]
    
    for i, (alert_type, description) in enumerate(alert_types):
        print(f"\n{i+1}. Testing {alert_type} ({description})...")
        
        if i > 0:  # Skip rate limiting for first alert
            rate_limiter.wait_if_needed(f"Simulating {alert_type}")
        
        sim_data = {
            "alert_type": alert_type,
            "asin": f"TEST_BEARING_{alert_type}",
            "location": "chennai",
            "notify": True,
            "mobile": TEST_PHONE
        }
        
        try:
            response = requests.post(f"{API_BASE}/alerts/simulate", json=sim_data)
            if response.status_code == 201:
                result = response.json()
                print(f"   ✅ {result['message']}")
                print(f"   📱 WhatsApp: {result['whatsapp_notified']}")
            else:
                print(f"   ❌ Failed: {response.text}")
        except Exception as e:
            print(f"   ❌ API call failed: {e}")

def test_language_selector():
    """Test language selection functionality"""
    print("\n🌐 Testing Language Selector...")
    
    languages = {
        "1": ("hi", "Hindi", "हिंदी में अलर्ट"),
        "2": ("ta", "Tamil", "தமிழில் எச்சரிக்கை"), 
        "3": ("te", "Telugu", "తెలుగులో హెచ్చరిక"),
        "4": ("kn", "Kannada", "ಕನ್ನಡದಲ್ಲಿ ಎಚ್ಚರಿಕೆ"),
        "5": ("mr", "Marathi", "मराठीत सूचना"),
        "6": ("bn", "Bengali", "বাংলায় সতর্কতা"),
        "7": ("gu", "Gujarati", "ગુજરાતીમાં ચેતવણી"),
        "8": ("en", "English", "Alert in English")
    }
    
    language_menu = """🌐 *PriceSentinel Language Selector*

Choose your preferred language:

1️⃣ Hindi (हिंदी)
2️⃣ Tamil (தமிழ்)
3️⃣ Telugu (తెలుగు)
4️⃣ Kannada (ಕನ್ನಡ)
5️⃣ Marathi (मराठी)
6️⃣ Bengali (বাংলা)
7️⃣ Gujarati (ગુજરાતી)
8️⃣ English

_Reply with the number of your choice_
_Reply *LANG* anytime to change language_"""

    rate_limiter.wait_if_needed("Sending language selector")
    
    result = sendWhatsAppText(TEST_PHONE, language_menu)
    
    if result["success"]:
        print("✅ Language selector sent")
        print("📱 Check WhatsApp and reply with a number 1-8")
        
        # Generate sample audio for each language
        print("\n🎵 Generating sample audio for all languages...")
        for num, (code, name, sample_text) in languages.items():
            audio_path = generate_audio(sample_text, code)
            if audio_path:
                timestamp = datetime.now().strftime("%H%M%S")
                permanent_path = f"sample_{code}_{timestamp}.mp3"
                shutil.copy2(audio_path, permanent_path)
                print(f"   ✅ {name}: {permanent_path}")
                try:
                    os.remove(audio_path)
                except:
                    pass
            else:
                print(f"   ❌ {name}: Failed")
    else:
        print(f"❌ Language selector failed: {result['error']}")

def main():
    """Run complete system test with proper timing"""
    print("🚀 PriceSentinel Complete System Test")
    print("=" * 60)
    print(f"📱 Testing with: {TEST_PHONE}")
    print(f"⏱️ Rate limit: {RATE_LIMIT_SECONDS}s between messages")
    print("=" * 60)
    
    try:
        # Test 1: Alert Rules (sends confirmation message)
        rule_id = test_alert_rules()
        
        # Test 2: Multi-language TTS generation
        audio_files = test_tts_multilingual()
        
        # Test 3: WhatsApp Text Alerts (2 messages with timing)
        test_whatsapp_text_alerts()
        
        # Test 4: WhatsApp Audio Alerts
        test_whatsapp_audio_alerts(audio_files)
        
        # Test 5: Language Selector
        test_language_selector()
        
        # Test 6: Alert Simulation (4 different types with timing)
        test_alert_simulation()
        
        print("\n" + "=" * 60)
        print("🎉 Complete System Test Finished!")
        print("\n✅ Features Demonstrated:")
        print("• Manual phone number entry for alerts")
        print("• Rate limiting with timestamps (65s between messages)")
        print("• Multi-language TTS audio generation (8 languages)")
        print("• Formatted WhatsApp text alerts")
        print("• WhatsApp audio message support")
        print("• Language selector interface")
        print("• Multiple alert types with proper timing")
        print("• MP3 audio file generation")
        
        print(f"\n📱 Check your WhatsApp for {7 + len(audio_files)} messages:")
        print("1. Alert rule confirmation")
        print("2-3. Formatted price alerts")
        print("4. Audio message (sample)")
        print("5. Language selector menu")
        print("6-9. Simulated alerts (4 types)")
        
        print(f"\n🎵 Generated audio files:")
        for lang_name, file_path in audio_files:
            print(f"   • {lang_name}: {file_path}")
        
        # Cleanup note
        print(f"\n🗑️ To clean up audio files:")
        print("   rm *.mp3")
        
    except KeyboardInterrupt:
        print("\n⏹️ Test interrupted by user")
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main()