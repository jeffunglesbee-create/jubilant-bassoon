import base64, json, urllib.request, urllib.error, os

os.makedirs("outbox/vision-probe", exist_ok=True)
API_KEY = os.environ.get("VISION_KEY", "")
results = {}

for img_file in ["scripts/probe_img1.jpg", "scripts/probe_img2.jpg"]:
    with open(img_file, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    payload = json.dumps({
        "contents": [{
            "parts": [
                {"inline_data": {"mime_type": "image/jpeg", "data": img_b64}},
                {"text": "Analyze this image for reverse image search purposes. Describe every identifying detail: clothing brands, jewelry, background location clues, phone case, setting type, any text or logos visible. Then search the web to find if this exact image or this person appears on any social media profiles, dating sites, or other websites. Report all URLs found."}
            ]
        }],
        "tools": [{"google_search": {}}],
        "generationConfig": {"temperature": 0.1}
    }).encode("utf-8")

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={API_KEY}"
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results[img_file] = data
    except urllib.error.HTTPError as e:
        results[img_file] = {"error": f"HTTP {e.code}", "body": e.read().decode("utf-8")[:1000]}
    except Exception as ex:
        results[img_file] = {"error": str(ex)}

with open("outbox/vision-probe/results.json", "w") as f:
    json.dump(results, f, indent=2)

with open("outbox/vision-probe/summary.txt", "w") as f:
    for img, data in results.items():
        f.write(f"\n{'='*60}\n{img}\n{'='*60}\n")
        if "error" in data:
            f.write(f"ERROR: {data['error']}\n{data.get('body','')}\n")
            continue
        candidates = data.get("candidates", [])
        for c in candidates:
            parts = c.get("content", {}).get("parts", [])
            for p in parts:
                if "text" in p:
                    f.write(p["text"] + "\n")
        # Also extract grounding metadata
        gm = data.get("candidates", [{}])[0].get("groundingMetadata", {})
        if gm:
            f.write("\n--- Grounding Sources ---\n")
            for chunk in gm.get("groundingChunks", []):
                web = chunk.get("web", {})
                f.write(f"  {web.get('title','?')}: {web.get('uri','?')}\n")

print("Done.")
