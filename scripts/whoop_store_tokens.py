import json, os, base64, requests
from nacl import encoding, public

with open("/tmp/whoop_tokens.json") as f:
    tokens = json.load(f)

pat = os.environ["GH_TOKEN"]
repo = os.environ["GH_REPO"]
headers = {"Authorization": f"token {pat}", "Accept": "application/vnd.github+json"}

pk_r = requests.get(f"https://api.github.com/repos/{repo}/actions/secrets/public-key", headers=headers)
pk = pk_r.json()
pub_key = public.PublicKey(pk["key"].encode("utf-8"), encoding.Base64Encoder)
sealed = public.SealedBox(pub_key)

for name in ["access_token", "refresh_token"]:
    val = tokens.get(name, "")
    if val:
        secret_name = f"WHOOP_{name.upper()}"
        enc = base64.b64encode(sealed.encrypt(val.encode())).decode()
        r = requests.put(f"https://api.github.com/repos/{repo}/actions/secrets/{secret_name}",
            headers=headers, json={"encrypted_value": enc, "key_id": pk["key_id"]})
        print(f"Stored {secret_name}: {r.status_code}")

print(f"Expires in: {tokens.get('expires_in','?')}s")
os.remove("/tmp/whoop_tokens.json")
