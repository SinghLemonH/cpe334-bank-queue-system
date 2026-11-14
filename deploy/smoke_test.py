#!/usr/bin/env python3
"""
deploy/smoke_test.py — Post-deployment health and readiness check
Invoked by deploy/deploy.sh and .github/workflows/deploy.yml (Episode 7)

Checks:
  1. GET <API_URL>/api/health -> 200 OK
  2. GET <API_URL>/api/ready  -> 200 OK (verifies active database connectivity)
  3. GET <WEB_URL>/           -> 200 OK
  4. GET <WEB_URL>/api/version -> 200, and commit == $EXPECTED_COMMIT when that is set (L5-4, R-08)
"""

import sys
import time
import urllib.request
import urllib.error
import json
import os

def check_url(url, description, expected_status=200, retries=5, delay=5):
    print(f"Checking {description} at: {url} ...", end=" ", flush=True)
    for attempt in range(1, retries + 1):
        try:
            req = urllib.request.Request(
                url,
                headers={"User-Agent": "SmokeTest/1.0"}
            )
            with urllib.request.urlopen(req, timeout=15) as response:
                if response.status == expected_status:
                    print(f"PASS (HTTP {response.status})")
                    return True
                else:
                    print(f"FAIL (Unexpected status: {response.status})")
                    return False
        except urllib.error.HTTPError as e:
            if attempt == retries:
                print(f"FAIL (HTTPError: {e.code})")
                return False
        except Exception as e:
            if attempt == retries:
                print(f"FAIL (Error: {e})")
                return False
        time.sleep(delay)
    return False

def main():
    if len(sys.argv) < 2:
        print("Usage: python3 smoke_test.py <WEB_URL> [API_URL]")
        sys.exit(1)

    web_url = sys.argv[1].rstrip("/")
    api_url = sys.argv[2].rstrip("/") if len(sys.argv) > 2 else web_url

    print("========================================================================")
    print("Running Bank Queue System Smoke Tests")
    print(f"Web URL : {web_url}")
    print(f"API URL : {api_url}")
    print("========================================================================")

    all_passed = True

    # 1. Direct API Health Check
    if not check_url(f"{api_url}/api/health", "Direct API Health (/api/health)"):
        all_passed = False

    # 2. Web-Proxied API Health Check (Confirms web runtime proxy and API_BASE_URL work)
    if not check_url(f"{web_url}/api/health", "Web-Proxied API Health (via Web /api/health)"):
        all_passed = False

    # 3. Direct Database Readiness Check
    if not check_url(f"{api_url}/api/ready", "Database Readiness (/api/ready)"):
        all_passed = False

    # 4. Web Frontend Home Page
    if not check_url(f"{web_url}/", "Frontend Home Page (/)"):
        all_passed = False

    # 5. Running release (R-08, mandatory since L5-4): /api/version through the web proxy
    #    must report the commit this pipeline deployed (EXPECTED_COMMIT), when given.
    expected_commit = os.environ.get("EXPECTED_COMMIT", "").strip()
    print("Checking running release (/api/version) ...", end=" ", flush=True)
    try:
        req = urllib.request.Request(f"{web_url}/api/version", headers={"User-Agent": "SmokeTest/1.0"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
        commit = data.get("commit", "")
        if expected_commit and commit != expected_commit:
            print(f"FAIL (running commit {commit}, expected {expected_commit})")
            all_passed = False
        else:
            print(f"PASS (Version: {data.get('version', 'unknown')}, Commit: {commit})")
    except Exception as e:
        print(f"FAIL (Error: {e})")
        all_passed = False

    print("========================================================================")
    if all_passed:
        print("All Smoke Tests PASSED!")
        sys.exit(0)
    else:
        print("Smoke Tests FAILED!")
        sys.exit(1)

if __name__ == "__main__":
    main()
