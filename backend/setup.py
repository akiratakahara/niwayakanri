"""
初回セットアップスクリプト
データベース初期化と管理者ユーザー作成
"""
import os
import sys
from getpass import getpass

from app.core.database import SessionLocal, init_db
from app.models.database import User
from app.core.security import get_password_hash, validate_password_strength

def setup_database():
    """データベース初期化"""
    print("=" * 60)
    print("勤怠・社内申請システム - 初回セットアップ")
    print("=" * 60)
    print()

    # データベースファイル確認
    db_file = "niwayakanri.db"
    if os.path.exists(db_file):
        response = input(f"\n既存のデータベース '{db_file}' が見つかりました。\n削除して新規作成しますか？ (yes/no): ")
        if response.lower() != "yes":
            print("セットアップを中止しました。")
            return False
        os.remove(db_file)
        print(f"✓ {db_file} を削除しました")

    # テーブル作成
    print("\n📊 データベーステーブルを作成中...")
    init_db()
    print("✓ データベーステーブル作成完了")

    return True

def create_admin_user():
    """管理者ユーザー作成"""
    print("\n" + "=" * 60)
    print("管理者ユーザー作成")
    print("=" * 60)

    db = SessionLocal()

    try:
        # メールアドレス入力
        email = input("\n管理者メールアドレス: ").strip()
        if not email:
            print("❌ メールアドレスは必須です")
            return False

        # 既存チェック
        existing = db.query(User).filter(User.email == email).first()
        if existing:
            print(f"❌ メールアドレス '{email}' は既に登録されています")
            return False

        # パスワード入力
        while True:
            password = getpass("パスワード（8文字以上、英字+数字）: ")
            is_valid, message = validate_password_strength(password)
            if is_valid:
                password_confirm = getpass("パスワード（確認）: ")
                if password == password_confirm:
                    break
                else:
                    print("❌ パスワードが一致しません")
            else:
                print(f"❌ {message}")

        # 名前入力
        name = input("管理者名: ").strip()
        if not name:
            print("❌ 名前は必須です")
            return False

        # 部署・役職入力
        department = input("部署（オプション）: ").strip() or None
        position = input("役職（オプション）: ").strip() or None

        # ユーザー作成
        admin_user = User(
            email=email,
            hashed_password=get_password_hash(password),
            name=name,
            department=department,
            position=position,
            role="admin",
            is_active=True
        )

        db.add(admin_user)
        db.commit()
        db.refresh(admin_user)

        print("\n" + "=" * 60)
        print("✅ 管理者ユーザー作成完了!")
        print("=" * 60)
        print(f"\nメール: {admin_user.email}")
        print(f"名前: {admin_user.name}")
        print(f"役割: {admin_user.role}")
        if admin_user.department:
            print(f"部署: {admin_user.department}")
        if admin_user.position:
            print(f"役職: {admin_user.position}")

        return True

    except Exception as e:
        print(f"\n❌ エラーが発生しました: {e}")
        db.rollback()
        return False
    finally:
        db.close()

def main():
    """メイン処理"""
    print("\n")

    # データベースセットアップ
    if not setup_database():
        sys.exit(1)

    # 管理者ユーザー作成
    if not create_admin_user():
        sys.exit(1)

    print("\n" + "=" * 60)
    print("🎉 セットアップ完了!")
    print("=" * 60)
    print("\n次のコマンドでサーバーを起動してください:")
    print("  python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000")
    print("\nフロントエンド起動:")
    print("  cd ../frontend && npm run dev")
    print()

if __name__ == "__main__":
    main()
