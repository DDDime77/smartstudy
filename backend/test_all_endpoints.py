"""
Comprehensive endpoint and page testing

Tests:
1. Backend API endpoints
2. Frontend page accessibility
3. Database connectivity
4. LNIRT functionality
"""

import os
import sys
from pathlib import Path

backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

import requests
from dotenv import load_dotenv
import psycopg2
from uuid import UUID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from app.ml import LNIRTService

load_dotenv()

# Server URLs
FRONTEND_URL = "http://localhost:3000"
BACKEND_URL = "http://localhost:4008"

# Test user
BULK_USER_ID = '537b7b10-dd68-4e27-844f-20882922538a'


def test_backend_endpoints():
    """
    Test backend API endpoints
    """
    print('='*90)
    print('BACKEND API TESTS')
    print('='*90)
    print()

    endpoints = [
        ('GET', '/'),
        ('GET', '/health'),
        ('GET', '/docs'),
    ]

    passed = 0
    failed = 0

    for method, path in endpoints:
        try:
            if method == 'GET':
                response = requests.get(f'{BACKEND_URL}{path}', timeout=5)
            else:
                response = requests.request(method, f'{BACKEND_URL}{path}', timeout=5)

            if response.status_code < 400:
                print(f'✓ {method:6} {path:30} - {response.status_code}')
                passed += 1
            else:
                print(f'✗ {method:6} {path:30} - {response.status_code}')
                failed += 1
        except Exception as e:
            print(f'✗ {method:6} {path:30} - ERROR: {e}')
            failed += 1

    print(f'\nBackend API: {passed} passed, {failed} failed\n')
    return failed == 0


def test_frontend_pages():
    """
    Test frontend page accessibility
    """
    print('='*90)
    print('FRONTEND PAGE TESTS')
    print('='*90)
    print()

    pages = [
        '/',
        '/dashboard',
        '/dashboard/study-timer',
        '/dashboard/preparation',
        '/dashboard/tasks',
        '/dashboard/analytics',
        '/dashboard/settings',
        '/dashboard/subjects',
        '/dashboard/assistant',
        '/dashboard/notifications',
    ]

    passed = 0
    failed = 0

    for page in pages:
        try:
            response = requests.get(f'{FRONTEND_URL}{page}', timeout=10)

            if response.status_code == 200:
                print(f'✓ {page:40} - {response.status_code}')
                passed += 1
            else:
                print(f'✗ {page:40} - {response.status_code}')
                failed += 1
        except Exception as e:
            print(f'✗ {page:40} - ERROR: {e}')
            failed += 1

    print(f'\nFrontend Pages: {passed} passed, {failed} failed\n')
    return failed == 0


def test_database_connectivity():
    """
    Test database connectivity
    """
    print('='*90)
    print('DATABASE CONNECTIVITY TEST')
    print('='*90)
    print()

    try:
        conn = psycopg2.connect(os.getenv('DATABASE_URL'))
        cursor = conn.cursor()

        # Test basic query
        cursor.execute('SELECT 1')
        result = cursor.fetchone()

        if result and result[0] == 1:
            print('✓ Database connection successful')

            # Test user count
            cursor.execute('SELECT COUNT(*) FROM users')
            user_count = cursor.fetchone()[0]
            print(f'✓ Users table accessible ({user_count} users)')

            # Test practice_tasks count
            cursor.execute('SELECT COUNT(*) FROM practice_tasks')
            task_count = cursor.fetchone()[0]
            print(f'✓ Practice tasks table accessible ({task_count} tasks)')

            # Test lnirt_models count
            cursor.execute('SELECT COUNT(*) FROM lnirt_models')
            model_count = cursor.fetchone()[0]
            print(f'✓ LNIRT models table accessible ({model_count} models)')

            cursor.close()
            conn.close()
            print('\n✅ Database connectivity: PASSED\n')
            return True
        else:
            print('✗ Database query returned unexpected result\n')
            return False

    except Exception as e:
        print(f'✗ Database connection failed: {e}\n')
        return False


def test_lnirt_functionality():
    """
    Test LNIRT service functionality
    """
    print('='*90)
    print('LNIRT FUNCTIONALITY TEST')
    print('='*90)
    print()

    try:
        engine = create_engine(os.getenv('DATABASE_URL'))
        Session = sessionmaker(bind=engine)
        db = Session()
        lnirt = LNIRTService(db)

        user_uuid = UUID(BULK_USER_ID)
        passed = 0
        failed = 0

        # Test predictions for both topics
        for topic in ['Calculus', 'Microeconomics']:
            try:
                for difficulty in ['easy', 'medium', 'hard']:
                    p_correct, pred_time = lnirt.predict(user_uuid, topic, difficulty)

                    if 0 <= p_correct <= 1 and pred_time > 0:
                        print(f'✓ {topic:15} {difficulty:6}: {p_correct:5.1%} success, {pred_time:4.0f}s')
                        passed += 1
                    else:
                        print(f'✗ {topic:15} {difficulty:6}: Invalid prediction')
                        failed += 1
            except Exception as e:
                print(f'✗ {topic:15} prediction failed: {e}')
                failed += 1

        # Test get_user_parameters
        try:
            for topic in ['Calculus', 'Microeconomics']:
                params = lnirt.get_user_parameters(user_uuid, topic)
                theta = params.get('theta', 0)
                tau = params.get('tau', 0)
                is_personalized = params.get('is_personalized', False)

                if is_personalized and tau > 0:
                    print(f'✓ {topic:15} params: θ={theta:.3f}, τ={tau:.3f}, personalized={is_personalized}')
                    passed += 1
                else:
                    print(f'✗ {topic:15} params: Invalid or not personalized')
                    failed += 1
        except Exception as e:
            print(f'✗ get_user_parameters failed: {e}')
            failed += 1

        db.close()

        print(f'\nLNIRT Functionality: {passed} passed, {failed} failed\n')
        return failed == 0

    except Exception as e:
        print(f'✗ LNIRT service initialization failed: {e}\n')
        return False


def main():
    """
    Main execution
    """
    print('='*90)
    print('COMPREHENSIVE SYSTEM TEST')
    print('='*90)
    print()
    print('Testing all endpoints, pages, and functionality...')
    print()

    results = {
        'Backend API': test_backend_endpoints(),
        'Frontend Pages': test_frontend_pages(),
        'Database': test_database_connectivity(),
        'LNIRT Service': test_lnirt_functionality(),
    }

    # Summary
    print('='*90)
    print('TEST SUMMARY')
    print('='*90)
    print()

    all_passed = True
    for component, passed in results.items():
        status = '✅ PASSED' if passed else '✗ FAILED'
        print(f'{component:20} {status}')
        if not passed:
            all_passed = False

    print()
    if all_passed:
        print('✅ ALL TESTS PASSED - System is fully operational')
    else:
        print('⚠ SOME TESTS FAILED - Review errors above')

    print('='*90)


if __name__ == "__main__":
    main()
