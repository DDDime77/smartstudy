"""
Test All Frontend Pages

Verifies that all frontend pages load successfully after backend changes.
"""

import requests
import time

FRONTEND_URL = "http://localhost:3000"

PAGES = [
    "/",
    "/dashboard",
    "/dashboard/preparation",
    "/dashboard/tasks",
    "/dashboard/analytics",
    "/dashboard/performance",
    "/dashboard/schedule",
    "/dashboard/settings",
    "/auth/login",
    "/auth/register",
]


def test_page(url):
    """Test if a page loads successfully"""
    try:
        response = requests.get(url, timeout=10, allow_redirects=True)
        if response.status_code == 200:
            return True, "OK"
        else:
            return False, f"Status {response.status_code}"
    except requests.exceptions.ConnectionError:
        return False, "Connection refused - frontend not running"
    except requests.exceptions.Timeout:
        return False, "Timeout"
    except Exception as e:
        return False, str(e)


def main():
    print('='*90)
    print('FRONTEND PAGES TEST')
    print('='*90)
    print()

    print(f'Testing frontend at: {FRONTEND_URL}')
    print()

    # Wait a moment for any services to stabilize
    time.sleep(2)

    results = []
    for page in PAGES:
        url = f"{FRONTEND_URL}{page}"
        success, message = test_page(url)
        results.append((page, success, message))

        status_icon = '✅' if success else '❌'
        print(f'{status_icon} {page:30} {message}')

    print()
    print('='*90)
    print('SUMMARY')
    print('='*90)
    print()

    passed = sum(1 for _, success, _ in results if success)
    total = len(results)

    print(f'Passed: {passed}/{total}')

    if passed == total:
        print('✅ ALL PAGES WORKING')
    else:
        print('❌ SOME PAGES FAILED')
        print()
        print('Failed pages:')
        for page, success, message in results:
            if not success:
                print(f'  - {page}: {message}')

    print()

    return passed == total


if __name__ == "__main__":
    success = main()
    exit(0 if success else 1)
