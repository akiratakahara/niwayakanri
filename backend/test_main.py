import pytest
import asyncio
from httpx import AsyncClient
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, patch

from main import app
from auth import auth_manager


# テスト用のテストクライアント
@pytest.fixture(scope="session")
def event_loop():
    """非同期テスト用のイベントループを作成"""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture
def client():
    """FastAPIテストクライアント"""
    return TestClient(app)


@pytest.fixture
async def async_client():
    """非同期HTTPクライアント"""
    async with AsyncClient(app=app, base_url="http://test") as ac:
        yield ac


@pytest.fixture
def test_user():
    """テスト用ユーザーデータ"""
    return {
        "id": "test-user-id",
        "email": "test@example.com",
        "name": "Test User",
        "role": "user",
        "department": "IT",
        "position": "Engineer",
        "employee_id": "EMP001",
        "is_active": True
    }


@pytest.fixture
def admin_user():
    """テスト用管理者ユーザーデータ"""
    return {
        "id": "admin-user-id",
        "email": "admin@example.com",
        "name": "Admin User",
        "role": "admin",
        "department": "HR",
        "position": "Manager",
        "employee_id": "ADM001",
        "is_active": True
    }


@pytest.fixture
def test_token(test_user):
    """テスト用JWTトークン"""
    return auth_manager.create_access_token(
        data={"sub": test_user["id"], "email": test_user["email"], "role": test_user["role"]}
    )


@pytest.fixture
def admin_token(admin_user):
    """テスト用管理者JWTトークン"""
    return auth_manager.create_access_token(
        data={"sub": admin_user["id"], "email": admin_user["email"], "role": admin_user["role"]}
    )


class TestHealthCheck:
    """ヘルスチェックエンドポイントのテスト"""

    def test_health_check(self, client):
        """ヘルスチェックエンドポイントのテスト"""
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert "status" in data
        assert data["status"] == "healthy"
        assert "timestamp" in data


class TestAuthentication:
    """認証関連のテスト"""

    @patch("database.db_manager.authenticate_user")
    def test_login_success(self, mock_authenticate, client, test_user):
        """ログイン成功のテスト"""
        mock_authenticate.return_value = test_user

        response = client.post("/api/v1/auth/login", json={
            "email": "test@example.com",
            "password": "password123"
        })

        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "user" in data
        assert data["user"]["email"] == test_user["email"]

    @patch("database.db_manager.authenticate_user")
    def test_login_failure(self, mock_authenticate, client):
        """ログイン失敗のテスト"""
        mock_authenticate.return_value = None

        response = client.post("/api/v1/auth/login", json={
            "email": "wrong@example.com",
            "password": "wrongpassword"
        })

        assert response.status_code == 401
        data = response.json()
        assert data["success"] is False
        assert "message" in data

    @patch("database.db_manager.get_user_by_id")
    def test_get_current_user_info(self, mock_get_user, client, test_user, test_token):
        """現在のユーザー情報取得のテスト"""
        mock_get_user.return_value = test_user

        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": f"Bearer {test_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["email"] == test_user["email"]
        assert data["name"] == test_user["name"]

    def test_unauthorized_access(self, client):
        """認証なしでのアクセステスト"""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 403  # FastAPIのHTTPBearerはデフォルトで403を返す

    def test_invalid_token(self, client):
        """無効なトークンでのアクセステスト"""
        response = client.get(
            "/api/v1/auth/me",
            headers={"Authorization": "Bearer invalid-token"}
        )
        assert response.status_code == 401


class TestUserManagement:
    """ユーザー管理のテスト"""

    @patch("database.db_manager.get_users")
    @patch("database.db_manager.get_user_by_id")
    def test_get_users_as_admin(self, mock_get_user, mock_get_users, client, admin_user, admin_token):
        """管理者によるユーザー一覧取得のテスト"""
        mock_get_user.return_value = admin_user
        mock_get_users.return_value = [admin_user]

        response = client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {admin_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)

    @patch("database.db_manager.get_user_by_id")
    def test_get_users_as_regular_user(self, mock_get_user, client, test_user, test_token):
        """一般ユーザーによるユーザー一覧取得のテスト（失敗する想定）"""
        mock_get_user.return_value = test_user

        response = client.get(
            "/api/v1/users/",
            headers={"Authorization": f"Bearer {test_token}"}
        )

        assert response.status_code == 403
        data = response.json()
        assert data["success"] is False


class TestRequestManagement:
    """申請管理のテスト"""

    @patch("database.db_manager.get_user_by_id")
    @patch("database.db_manager.get_requests")
    def test_get_requests(self, mock_get_requests, mock_get_user, client, test_user, test_token):
        """申請一覧取得のテスト"""
        mock_get_user.return_value = test_user
        mock_get_requests.return_value = []

        response = client.get(
            "/api/v1/requests/",
            headers={"Authorization": f"Bearer {test_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert "success" in data
        assert data["success"] is True
        assert "data" in data

    @patch("database.db_manager.get_user_by_id")
    @patch("database.db_manager.create_leave_request")
    def test_create_leave_request(self, mock_create_leave, mock_get_user, client, test_user, test_token):
        """休暇申請作成のテスト"""
        mock_get_user.return_value = test_user
        mock_create_leave.return_value = "test-request-id"

        leave_request_data = {
            "request": {
                "title": "夏季休暇",
                "description": "夏季休暇申請"
            },
            "leave_request": {
                "leave_type": "annual",
                "start_date": "2024-08-01",
                "end_date": "2024-08-05",
                "days": 5,
                "reason": "家族旅行"
            }
        }

        response = client.post(
            "/api/v1/requests/leave",
            json=leave_request_data,
            headers={"Authorization": f"Bearer {test_token}"}
        )

        assert response.status_code == 200
        data = response.json()
        assert data["success"] is True
        assert "data" in data
        assert "request_id" in data["data"]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])