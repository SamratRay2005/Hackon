#!/usr/bin/env python3
"""
Intelligent Returns Bridge API Integration Test Suite
Pings all 6 architecture layers of the Next.js circular retail MVP.
"""

import json
import urllib.request
import urllib.error

BASE_URL = "http://localhost:3000"

SAMPLE_IMAGE = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

def post_json(endpoint, payload):
    url = f"{BASE_URL}{endpoint}"
    data = json.dumps(payload).encode("utf-8")
    req = urllib.request.Request(
        url, 
        data=data, 
        headers={"Content-Type": "application/json"},
        method="POST"
    )
    try:
        with urllib.request.urlopen(req) as response:
            content_type = response.headers.get("Content-Type", "")
            res_body = response.read().decode("utf-8")
            
            if "event-stream" in content_type:
                # Format streaming events
                output = []
                for line in res_body.split("\n"):
                    if line.startswith("data: "):
                        data_str = line[6:].strip()
                        if data_str == "[DONE]":
                            continue
                        try:
                            parsed = json.loads(data_str)
                            chunk = parsed["choices"][0]["delta"].get("content", "")
                            output.append(chunk)
                        except Exception:
                            pass
                return response.status, {"streaming_text": "".join(output)}
            
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": e.reason}
    except Exception as e:
        return 500, {"error": str(e)}

def get_json(endpoint):
    url = f"{BASE_URL}{endpoint}"
    req = urllib.request.Request(url, method="GET")
    try:
        with urllib.request.urlopen(req) as response:
            res_body = response.read().decode("utf-8")
            return response.status, json.loads(res_body)
    except urllib.error.HTTPError as e:
        try:
            err_body = e.read().decode("utf-8")
            return e.code, json.loads(err_body)
        except Exception:
            return e.code, {"error": e.reason}
    except Exception as e:
        return 500, {"error": str(e)}

def run_tests():
    print("=" * 60)
    print(" STARTING INTELLIGENT RETURNS BRIDGE ENDPOINT AUDITS")
    print("=" * 60)

    # 1. Size Assist (Layer 1)
    print("\n[Layer 1] POST /api/size-assist (Bracketing Sizing Assist)")
    payload = {
        "image": SAMPLE_IMAGE,
        "brand": "UrbanEco",
        "sku": "DENIM-JKT-001",
        "sizes": ["M", "L"],
        "sessionId": "session-samrat"
    }
    status, res = post_json("/api/size-assist", payload)
    print(f"Status: {status}")
    print(json.dumps(res, indent=2))

    # 2. Risk Mitigation (Layer 2)
    print("\n[Layer 2] POST /api/risk-mitigation (Fraud & Risk Engine)")
    payload = {
        "image": SAMPLE_IMAGE,
        "userId": "user_samrat",
        "email": "samrat.ray@example.com",
        "ipAddress": "184.22.109.5",
        "sku": "DENIM-JKT-001",
        "itemName": "Classic Denim Jacket"
    }
    status, res = post_json("/api/risk-mitigation", payload)
    print(f"Status: {status}")
    print(json.dumps(res, indent=2))

    # 3. Chat Deflection (Layer 3)
    # Pings to fetch initial response (not streaming)
    print("\n[Layer 3] POST /api/chat-deflection (Interception & Deflection Chat)")
    payload = {
        "messages": [
            {"role": "bot", "content": "Is it plugged in?"},
            {"role": "user", "content": "Yes, it is plugged in."}
        ],
        "productName": "Smart Drip Coffee Maker",
        "reasonCode": "Defective / Won't turn on",
        "guides": [
            {"title": "Heating Element Replacement", "url": "http://ifixit.com/guide/10292", "summary": "Replace heating coils."}
        ]
    }
    status, res = post_json("/api/chat-deflection", payload)
    print(f"Status: {status}")
    if isinstance(res, dict) and "error" in res:
        print(json.dumps(res, indent=2))
    else:
        # Note: Streaming responses will output raw SSE text
        print("Received streaming response headers successfully.")

    # 4. Grading (Layer 4)
    print("\n[Layer 4] POST /api/grading (Automated Warehouse grading)")
    payload = {
        "images": [SAMPLE_IMAGE],
        "sku": "CF-Mkr-99",
        "itemName": "Smart Drip Coffee Maker"
    }
    status, res = post_json("/api/grading", payload)
    print(f"Status: {status}")
    print(json.dumps(res, indent=2))

    # 5. P2P Logistics (Layer 5)
    print("\n[Layer 5] POST /api/p2p-logistics (Logistics Optimizer)")
    payload = {
        "sku": "DENIM-JKT-001",
        "returnerZip": "98101",
        "buyerZip": "98004"
    }
    status, res = post_json("/api/p2p-logistics", payload)
    print(f"Status: {status}")
    print(json.dumps(res, indent=2))

    # 6. Wallet Refund Choice (Layer 6)
    print("\n[Layer 6] POST /api/wallet (Circularity Green Credits resolution)")
    payload = {
        "choice": "credits",
        "actions": ["p2p", "repair"],
        "baseAmount": 120.00
    }
    status, res = post_json("/api/wallet", payload)
    print(f"Status: {status}")
    print(json.dumps(res, indent=2))

    # 7. Wallet Get Balance
    print("\n[Layer 6] GET /api/wallet (Retrieve User Wallet Balances)")
    status, res = get_json("/api/wallet")
    print(f"Status: {status}")
    print(json.dumps(res, indent=2))

    print("\n" + "=" * 60)
    print(" TESTING COMPLETE")
    print("=" * 60)

if __name__ == "__main__":
    run_tests()
