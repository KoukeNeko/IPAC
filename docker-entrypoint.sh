#!/bin/sh
set -e

echo "等待資料庫準備就緒..."
python << END
import sys
import time
import psycopg2
from psycopg2 import OperationalError

max_retries = 30
retry_interval = 1

for i in range(max_retries):
    try:
        conn = psycopg2.connect(
            dbname="${POSTGRES_DB}",
            user="${POSTGRES_USER}",
            password="${POSTGRES_PASSWORD}",
            host="${POSTGRES_HOST}",
            port="${POSTGRES_PORT}"
        )
        conn.close()
        print("資料庫連線成功!")
        sys.exit(0)
    except OperationalError:
        if i < max_retries - 1:
            print(f"資料庫尚未就緒,等待 {retry_interval} 秒... ({i+1}/{max_retries})")
            time.sleep(retry_interval)
        else:
            print("無法連接到資料庫")
            sys.exit(1)
END

echo "執行資料庫遷移..."
python manage.py migrate --noinput

echo "檢查是否存在使用者帳號..."
set +e
python << 'END'
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'icap_project.settings')
django.setup()

from django.contrib.auth.models import User

user_count = User.objects.count()
if user_count == 0:
    print("沒有找到任何使用者帳號,將建立範例資料...")
    exit(0)
else:
    print(f"已存在 {user_count} 個使用者帳號,跳過範例資料建立")
    exit(1)
END

user_check_exit=$?
set -e

if [ "$user_check_exit" -eq 0 ]; then
    echo "建立範例資料..."
    python manage.py create_sample_data
    echo "範例資料建立完成!"
    echo "預設管理員帳號: admin / admin123"
    echo "預設使用者帳號: user1 / user123"
fi

echo "啟動 Django 開發伺服器..."
exec python manage.py runserver 0.0.0.0:8000
