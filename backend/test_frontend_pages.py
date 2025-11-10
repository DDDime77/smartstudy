#!/usr/bin/env python3
"""
Test all frontend pages are accessible and return 200 OK
"""

import requests
from urllib.parse import urljoin

FRONTEND_URL = "http://localhost:4000"

PAGES = [
    "/",
    "/dashboard",
    "/dashboard/analytics",
    "/dashboard/assistant",
    "/dashboard/notifications",
    "/dashboard/preparation",
    "/dashboard/settings",
    "/dashboard/study-timer",
    "/dashboard/subjects",
    "/dashboard/tasks",
]

def test_page(url, path):
    """Test a single page"""
    full_url = urljoin(url, path)
    try:
        response = requests.get(full_url, timeout=10, allow_redirects=True)

        if response.status_code == 200:
            # Check for common error indicators
            content = response.text.lower()
            if "error" in content and "application error" in content:
                return "⚠️", response.status_code, "Contains 'Application Error'"
            elif "404" in content and "not found" in content:
                return "⚠️", response.status_code, "Contains '404 Not Found'"
            else:
                return "✅", response.status_code, "OK"
        elif response.status_code in [301, 302, 307, 308]:
            return "↗️", response.status_code, f"Redirects to {response.headers.get('Location', 'unknown')}"
        else:
            return "❌", response.status_code, "Not OK"

    except requests.exceptions.Timeout:
        return "❌", "TIMEOUT", "Request timed out"
    except requests.exceptions.ConnectionError:
        return "❌", "CONN_ERR", "Connection error"
    except Exception as e:
        return "❌", "ERROR", str(e)

def main():
    print("="*90)
    print("FRONTEND PAGES TEST")
    print("="*90)
    print()
    print(f"Testing frontend at: {FRONTEND_URL}")
    print()
    print(f"{'Path':<35} {'Status':<5} {'Code':<10} {'Details':<30}")
    print("-" * 90)

    all_ok = True
    for path in PAGES:
        icon, code, details = test_page(FRONTEND_URL, path)
        print(f"{path:<35} {icon:<5} {str(code):<10} {details:<30}")

        if icon == "❌":
            all_ok = False

    print()
    print("="*90)

    if all_ok:
        print("✅ ALL PAGES WORKING")
    else:
        print("❌ SOME PAGES HAVE ISSUES")

    print("="*90)

if __name__ == '__main__':
    main()
