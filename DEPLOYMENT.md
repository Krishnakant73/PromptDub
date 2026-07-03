# PromptDub - Complete Setup & Deployment Guide

## Table of Contents
1. [Quick Start (Local Testing)](#quick-start)
2. [Google Colab Setup](#google-colab)
3. [RunPod Deployment](#runpod)
4. [Chrome Extension Publishing](#chrome-extension)
5. [Testing Workflow](#testing)
6. [Production Deployment](#production)
7. [Android App (Future)](#android)

---

## Quick Start (Local Testing) {#quick-start}

### Prerequisites
- Docker Desktop installed
- NVIDIA GPU with 8GB+ VRAM
- Chrome browser

### Steps
```bash
# 1. Clone the repository
git clone https://github.com/yourusername/PromptDub.git
cd PromptDub

# 2. Start all services
docker-compose up -d

# 3. Check health
curl http://localhost:8000/health
curl http://localhost:8010/health
curl http://localhost:8020/health

# 4. Load extension in Chrome
# - Go to chrome://extensions
# - Enable Developer mode
# - Click "Load unpacked"
# - Select the `extension` folder
```

---

## Google Colab Setup {#google-colab}

### Why Colab?
- Free GPU (T4)
- No installation required
- Great for testing

### Quick Test (Copy & Paste)

#### Step 1: Open Colab
1. Go to [colab.research.google.com](https://colab.research.google.com)
2. Click "File" → "New notebook"

#### Step 2: Cell 1 - Clone & Install
```python
# Clone PromptDub
!git clone https://github.com/yourusername/PromptDub.git
%cd PromptDub

# Install all dependencies
!pip install fastapi uvicorn[standard] numpy torch torchaudio
!pip install faster-whisper transformers httpx
!pip install pyngrok modelscope

# Install CosyVoice dependencies
!pip install -r services/tts/requirements.txt

print("Dependencies installed!")
```

#### Step 3: Cell 2 - Download Models
```python
import os

# Set environment variables
os.environ["TTS_PROVIDER"] = "both"
os.environ["TTS_LOAD_ALL"] = "true"
os.environ["STT_MODEL"] = "deepdml/faster-whisper-large-v3-turbo-ct2"

# Download CosyVoice3 model
!python -c "from modelscope import snapshot_download; snapshot_download('iic/Fun-CosyVoice3-0.5B-2512', local_dir='Fun-CosyVoice3-0.5B')"

print("Models downloaded!")
```

#### Step 4: Cell 3 - Start Server
```python
# Start the Colab gateway
!python scripts/colab_setup.py &
```

#### Step 5: Cell 4 - Expose with Ngrok
```python
from pyngrok import ngrok

# Create tunnel
public_url = ngrok.connect(8000, "http")
print(f"\n{'='*50}")
print(f"YOUR PUBLIC URL: {public_url}")
print(f"{'='*50}")
print(f"\nCopy this URL and paste it in your extension settings!")
print(f"Format: {public_url}/ws/translate")
```

#### Step 6: Cell 5 - Test Connection
```python
import requests

# Test health endpoint
response = requests.get("http://localhost:8000/health")
print("Health check:", response.json())

# Test modes endpoint
response = requests.get("http://localhost:8000/modes")
print("Available modes:", response.json())
```

### Quick Test (All in One Cell)

```python
# Quick test - runs everything
import subprocess, time, os
from pyngrok import ngrok

# Start server
print("Starting server...")
proc = subprocess.Popen(["python", "scripts/colab_setup.py"], 
                       stdout=subprocess.PIPE, stderr=subprocess.PIPE)

time.sleep(10)  # Wait for startup

# Create tunnel
public_url = ngrok.connect(8000, "http")

print(f"\n{'='*50}")
print(f"SERVER RUNNING!")
print(f"Public URL: {public_url}")
print(f"{'='*50}")
print(f"\nAdd this to extension settings:")
print(f"Server: {public_url}/ws/translate")
print(f"\nPress Ctrl+C to stop")
```

### Configure Extension

1. Open Chrome extension
2. Click gear icon ⚙️
3. Paste the ngrok URL in "Server" field
   - Format: `wss://your-url.ngrok.io/ws/translate`
4. Select languages
5. Click "Start Translating"

### Test on YouTube

1. Open YouTube video
2. Click PromptDub pill
3. Wait for "Voice profile ready"
4. Audio should play with dubbed voice

### Troubleshooting

| Issue | Solution |
|-------|----------|
| "Connection refused" | Wait 30 seconds for models to load |
| "Ngrok auth error" | Run `!ngrok authtoken YOUR_TOKEN` |
| "CUDA out of memory" | Use smaller model: `os.environ["STT_MODEL"] = "small"` |
| Server won't start | Check logs: `!cat nohup.out` |

### Colab Limits

| Limit | Value |
|-------|-------|
| Max session | 12 hours |
| GPU | T4 (16GB) |
| RAM | 12GB |
| Storage | 100GB |
| Cost | Free (with limits) |

### Cost Saving Tips

```python
# Use CPU instead of GPU (slower but free)
os.environ["STT_COMPUTE_TYPE"] = "int8"
os.environ["DEVICE"] = "cpu"

# Use smaller models
os.environ["STT_MODEL"] = "base"  # Instead of large-v3-turbo
```

### Colab Tips
- **Session timeout**: Colab disconnects after 12 hours
- **GPU runtime**: Runtime → Change runtime type → T4 GPU
- **Save models**: Use Google Drive to persist models between sessions
- **Cost**: Free tier has ~12 hours/day GPU limit

---

## RunPod Deployment {#runpod}

### Why RunPod?
- Persistent GPU instances
- Better uptime than Colab
- Custom Docker support
- Pay-per-use pricing

### Step-by-Step

#### 1. Create RunPod Account
1. Go to [runpod.io](https://runpod.io)
2. Sign up / Login
3. Add payment method (for production)

#### 2. Create GPU Pod
1. Click "Pods" → "Deploy"
2. Select GPU:
   - **Testing**: RTX 3090 (24GB) - ~$0.20/hr
   - **Production**: A100 (40GB) - ~$1.50/hr
3. Select "Docker" deployment
4. Choose region (closest to your users)

#### 3. Deploy with Docker

**Option A: Use pre-built image (Recommended)**
```bash
# Pull the image
docker pull yourusername/promptdub:latest

# Run on RunPod
docker run -d \
  --gpus all \
  -p 8000:8000 \
  -p 8010:8010 \
  -p 8020:8020 \
  -e STT_MODEL=deepdml/faster-whisper-large-v3-turbo-ct2 \
  -e TTS_PROVIDER=both \
  -e TTS_LOAD_ALL=true \
  -v model-cache:/models \
  yourusername/promptdub:latest
```

**Option B: Build on RunPod**
```bash
# SSH into RunPod instance
ssh root@<runpod-ip>

# Clone and build
git clone https://github.com/yourusername/PromptDub.git
cd PromptDub
docker-compose up -d
```

#### 4. Set Up Persistent Storage
1. In RunPod dashboard, go to "Storage"
2. Create a volume (50GB minimum)
3. Mount to `/models` for model persistence

#### 5. Configure Networking
1. Go to Pod Settings → HTTP Service
2. Set ports: `8000,8010,8020`
3. Enable HTTPS (for production)

#### 6. Get Public URL
```bash
# RunPod provides a public URL
# Format: https://<pod-id>-8000.proxy.runpod.net

# Test it
curl https://<pod-id>-8000.proxy.runpod.net/health
```

### RunPod Pricing (Approximate)
| GPU | VRAM | Price/hr | Best For |
|-----|------|----------|----------|
| RTX 3090 | 24GB | $0.20 | Testing |
| RTX 4090 | 24GB | $0.35 | Development |
| A100 40GB | 40GB | $1.50 | Production |
| A100 80GB | 80GB | $2.50 | Heavy load |

### RunPod Tips
- **Use Spot Instances**: 50-70% cheaper for testing
- **Enable Auto-Stop**: Save costs when not in use
- **Use Community Cloud**: Cheaper than Secure Cloud
- **Monitor usage**: Set up billing alerts

---

## Chrome Extension Publishing {#chrome-extension}

### Google Chrome Web Store

#### Prerequisites
- Google Developer account ($5 one-time fee)
- Extension zip file
- Screenshots and descriptions

#### Steps

##### 1. Prepare Extension
```bash
# Create production build
cd extension

# Update manifest.json for production
# - Change version to 1.0.0
# - Add proper descriptions
# - Add permissions explanations

# Zip the extension
# - Select all files in extension folder
# - Right-click → Send to → Compressed folder
```

##### 2. Create Store Listing
1. Go to [Chrome Web Store Developer Dashboard](https://chrome.google.com/webstore/devconsole)
2. Pay $5 registration fee
3. Click "New Item"
4. Upload your zip file

##### 3. Fill Store Details
```yaml
Name: PromptDub - Real-time Dubbing
Short Description: Translate and dub videos in real-time with AI
Category: Productivity
Language: English

Description: |
  PromptDub translates and dubs videos in real-time using AI.
  
  Features:
  - Real-time translation (50+ languages)
  - Voice cloning
  - Subtitle generation
  - Auto language detection
  
  Supports YouTube, Twitch, and more.

Screenshots:
  - 1280x800 or 640x400
  - At least 1 screenshot
  - Show extension in use
```

##### 4. Submit for Review
1. Click "Publish"
2. Review takes 1-3 business days
3. Check email for approval/rejection

#### Common Rejection Reasons
- Missing privacy policy
- Unclear permissions usage
- Misleading descriptions
- Broken functionality

### Microsoft Edge Add-ons

#### Steps
1. Go to [Partner Center](https://partner.microsoft.com/dashboard/microsoftedge/overview)
2. Sign in with Microsoft account
3. Click "New extension"
4. Upload zip (same as Chrome)
5. Fill details and submit

**Edge accepts Chrome extensions with no changes!**

### Firefox Add-ons

#### Steps
1. Go to [Firefox Developer Hub](https://addons.mozilla.org/developers/)
2. Create account
3. Click "Submit a New Add-on"
4. Upload zip
5. Firefox reviews within 1-5 days

**Note**: Firefox may require manifest.json changes for Manifest V3

### Opera Add-ons

#### Steps
1. Go to [Opera Developer](https://addons.opera.com/en/developers/)
2. Create account
3. Click "Upload extension"
4. Upload zip
5. Review takes 1-3 days

### Brave Web Store

Uses Chrome Web Store! Extensions published to Chrome automatically appear in Brave.

---

## Testing Workflow {#testing}

### Phase 1: Local Testing
```bash
# 1. Start local server
docker-compose up -d

# 2. Load extension in Chrome (developer mode)

# 3. Test on YouTube
# - Open YouTube video
# - Click PromptDub icon
# - Select languages
# - Click "Start Translating"
```

### Phase 2: Colab Testing
```python
# 1. Start Colab server (see Colab section)

# 2. Update extension settings
# - Server URL: ngrok URL from Colab
# - Example: wss://abc123.ngrok.io/ws/translate

# 3. Test with friends
# - Share ngrok URL
# - They can test the extension
```

### Phase 3: RunPod Testing
```bash
# 1. Deploy to RunPod (see RunPod section)

# 2. Update extension settings
# - Server URL: RunPod URL
# - Example: wss://<pod-id>-8000.proxy.runpod.net/ws/translate

# 3. Stress test
# - Multiple concurrent users
# - Monitor latency and errors
```

### Phase 4: Beta Testing
```bash
# 1. Publish as "Unlisted" on Chrome Web Store
# 2. Share link with beta testers
# 3. Collect feedback via Google Form
# 4. Fix issues and iterate
```

### Testing Checklist
- [ ] Extension loads without errors
- [ ] WebSocket connection works
- [ ] Audio capture works
- [ ] Translation works for target languages
- [ ] TTS output is audible
- [ ] Voice cloning works
- [ ] Mode switching works (Fast/Balanced/Quality)
- [ ] No memory leaks
- [ ] Works on YouTube
- [ ] Works on Twitch

---

## Production Deployment {#production}

### Architecture
```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Chrome    │────▶│   RunPod    │────▶│   Models    │
│  Extension  │     │   Gateway   │     │  (CosyVoice │
│             │◀────│  (FastAPI)  │◀────│   Svara)    │
└─────────────┘     └─────────────┘     └─────────────┘
                           │
                    ┌──────┴──────┐
                    │  Redis/DB   │
                    └─────────────┘
```

### Production Checklist
- [ ] Domain name and SSL certificate
- [ ] Load balancer (nginx/HAProxy)
- [ ] Database (PostgreSQL/Redis)
- [ ] Monitoring (Prometheus/Grafana)
- [ ] Logging (ELK Stack)
- [ ] Rate limiting
- [ ] API key authentication
- [ ] Backup strategy
- [ ] Cost monitoring

### Recommended Setup

#### For < 100 users
```yaml
# RunPod single instance
GPU: RTX 3090 (24GB)
Storage: 100GB
Cost: ~$50/month
```

#### For 100-1000 users
```yaml
# RunPod multi-instance
Primary: A100 40GB
Backup: RTX 3090
Load Balancer: Cloudflare
Cost: ~$200-500/month
```

#### For 1000+ users
```yaml
# Dedicated infrastructure
Primary: AWS/GCP with A100
CDN: Cloudflare
Database: Managed PostgreSQL
Cost: ~$1000+/month
```

---

## Android App (Future) {#android}

### Research Phase

#### Current Options
1. **Capacitor/Cordova**: Wrap web app
2. **React Native**: Cross-platform native
3. **Flutter**: Google's cross-platform
4. **Native Android**: Kotlin/Java

#### Recommended: Capacitor
**Why?**
- Reuse existing web code
- Fast development
- Native performance
- Easy maintenance

#### Architecture
```
┌─────────────────┐
│   Android App   │
│  (Capacitor)    │
├─────────────────┤
│   WebView       │
│   (Extension    │
│    code)        │
├─────────────────┤
│   Native        │
│   Plugins       │
│   - Audio       │
│   - TTS         │
│   - Network     │
└─────────────────┘
```

#### Development Timeline
1. **Week 1-2**: Setup Capacitor project
2. **Week 3-4**: Port extension code
3. **Week 5-6**: Native audio handling
4. **Week 7-8**: Testing and polish
5. **Week 9-10**: Play Store submission

### Play Store Submission

#### Requirements
- Google Play Developer account ($25 one-time)
- App icon (512x512)
- Screenshots (phone and tablet)
- Privacy policy
- Content rating questionnaire

#### Steps
1. Build APK/AAB
2. Sign with release key
3. Upload to Play Console
4. Fill store listing
5. Submit for review

---

## Cost Comparison

| Solution | Setup Cost | Monthly Cost | Best For |
|----------|------------|--------------|----------|
| Local | $0 | $0 (electricity) | Development |
| Colab | $0 | $0 (limited) | Testing |
| RunPod | $0 | $50-500 | Production |
| AWS/GCP | $0 | $200-2000 | Enterprise |

---

## Troubleshooting

### Common Issues

#### Extension won't connect
```bash
# Check server health
curl http://localhost:8000/health

# Check WebSocket
wscat -c ws://localhost:8000/ws/translate
```

#### No audio output
- Check browser permissions
- Verify TTS service is running
- Check console for errors

#### High latency
- Switch to "Fast" mode
- Use closer server region
- Check network connection

### Getting Help
- GitHub Issues: https://github.com/yourusername/PromptDub/issues
- Discord: [Join our server]
- Email: support@promptdub.com

---

## Summary

### Recommended Path
1. **Test locally** with Docker
2. **Test with friends** on Colab
3. **Deploy to RunPod** for production
4. **Publish to Chrome Web Store**
5. **Expand to Edge/Firefox**
6. **Build Android app** later

### Key Commands
```bash
# Local testing
docker-compose up -d

# Colab
!python scripts/colab_setup.py

# RunPod
docker run -d --gpus all -p 8000:8000 yourusername/promptdub:latest

# Build extension
cd extension && zip -r promptdub.zip .
```

---

*Last updated: July 2026*
