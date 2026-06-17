import base64, json, urllib.request, urllib.error, os

API_KEY = os.environ.get("VISION_KEY", "")
results = {}

for img_file in ["scripts/probe_img1.jpg", "scripts/probe_img2.jpg"]:
    with open(img_file, "rb") as f:
        img_b64 = base64.b64encode(f.read()).decode("utf-8")

    payload = json.dumps({
        "requests": [{
            "image": {"content": img_b64},
            "features": [
                {"type": "WEB_DETECTION", "maxResults": 20},
                {"type": "LABEL_DETECTION", "maxResults": 10}
            ]
        }]
    }).encode("utf-8")

    url = f"https://vision.googleapis.com/v1/images:annotate?key={API_KEY}"
    req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json"}, method="POST")

    try:
        with urllib.request.urlopen(req) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results[img_file] = data
    except urllib.error.HTTPError as e:
        results[img_file] = {"error": f"HTTP {e.code}", "body": e.read().decode("utf-8")[:500]}
    except Exception as ex:
        results[img_file] = {"error": str(ex)}

with open("outbox/vision-probe/results.json", "w") as f:
    json.dump(results, f, indent=2)

# Human-readable summary
with open("outbox/vision-probe/summary.txt", "w") as f:
    for img, data in results.items():
        f.write(f"\n{'='*60}\n{img}\n{'='*60}\n")
        if "error" in data:
            f.write(f"ERROR: {data['error']}\n{data.get('body','')}\n")
            continue
        resp = data.get("responses", [{}])[0]
        web = resp.get("webDetection", {})
        
        f.write("\n--- Web Entities ---\n")
        for e in web.get("webEntities", []):
            f.write(f"  {e.get('description','?')} (score: {e.get('score',0):.3f})\n")
        
        f.write("\n--- Pages with Matching Images ---\n")
        for p in web.get("pagesWithMatchingImages", []):
            f.write(f"  {p.get('pageTitle','?')}\n  URL: {p.get('url','?')}\n\n")
        
        f.write("\n--- Full Matching Images ---\n")
        for m in web.get("fullMatchingImages", []):
            f.write(f"  {m.get('url','?')}\n")
        
        f.write("\n--- Partial Matching Images ---\n")
        for m in web.get("partialMatchingImages", []):
            f.write(f"  {m.get('url','?')}\n")
        
        f.write("\n--- Visually Similar Images ---\n")
        for m in web.get("visuallySimilarImages", []):
            f.write(f"  {m.get('url','?')}\n")
        
        f.write("\n--- Labels ---\n")
        for l in resp.get("labelAnnotations", []):
            f.write(f"  {l.get('description','?')} ({l.get('score',0):.3f})\n")

print("Done. Results in outbox/vision-probe/")
