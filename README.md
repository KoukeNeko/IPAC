# ICAP - 裝置資產管理系統

基於 Django 和 Django REST Framework 的裝置資產管理系統，支援管理 100+ 裝置，使用 PostgreSQL JSONB 儲存動態屬性。

## 功能特點

### 1. 動態屬性系統
- 用戶可自定義裝置類別（印表機、電腦等）
- 每個類別可定義專屬屬性（如墨水耗材）
- 支援多種屬性型態：文字、數字、日期、布林值、選項
- 自動驗證必填設定和型態檢查

### 2. 裝置管理
- 序號、名稱、類別、狀態管理
- 責任人分配
- 使用 JSONB 儲存動態屬性

### 3. IP 管理
- IP 位址和 MAC 位址管理
- 分配日期追蹤
- 完整的異動歷史記錄

### 4. 財產管理
- 購買日期和成本記錄
- 部門和位置追蹤
- 自動計算折舊
- 保固期限管理
- 供應商資訊
- 維護記錄
- 報廢管理

### 5. 查詢篩選
- 按類別、部門、位置、IP、狀態篩選
- 全文搜尋功能
- 排序功能
- 分頁支援

### 6. 權限管理
- 管理員：完整存取權限
- 一般使用者：只能編輯自己負責的裝置
- 基於角色的權限控制

### 7. 操作日誌
- 記錄所有建立、更新、刪除操作
- 追蹤變更內容
- 記錄操作者和 IP 位址
- 完整的審計追蹤

## 資料模型

### DeviceCategory（裝置類別）
- 定義裝置類型（印表機、電腦等）
- 包含描述和時間戳記

### PropertyDefinition（屬性定義）
- 定義類別的動態屬性
- 支援多種型態和驗證規則
- 可設定必填和預設值

### Device（裝置）
- 基本資訊：序號、名稱、類別、狀態、責任人
- 動態屬性：使用 JSONB 儲存
- 財產資訊：成本、折舊、保固等

### IPRecord（IP 記錄）
- IP 和 MAC 位址管理
- 分配歷史追蹤
- 啟用狀態管理

### AuditLog（操作日誌）
- 操作類型和時間
- 變更內容記錄
- 用戶和 IP 追蹤

## 安裝說明

### 1. 環境需求
- Python 3.8+
- PostgreSQL 12+ （開發環境可使用 SQLite）
- pip

### 2. 安裝依賴
```bash
pip install -r requirements.txt
```

### 3. 資料庫設定

#### 使用 PostgreSQL（生產環境）
```bash
# 建立資料庫和使用者
sudo -u postgres psql
CREATE DATABASE icap_db;
CREATE USER icap_user WITH PASSWORD 'icap_password';
ALTER ROLE icap_user SET client_encoding TO 'utf8';
ALTER ROLE icap_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE icap_user SET timezone TO 'Asia/Taipei';
GRANT ALL PRIVILEGES ON DATABASE icap_db TO icap_user;
\q
```

#### 使用 SQLite（開發/測試環境）
```bash
export USE_SQLITE=True
```

### 4. 執行遷移
```bash
python manage.py migrate
```

### 5. 建立超級使用者
```bash
python manage.py createsuperuser
```

### 6. 啟動開發伺服器
```bash
python manage.py runserver
```

## API 端點

### 裝置類別
- `GET /api/categories/` - 列出所有類別
- `POST /api/categories/` - 建立新類別（管理員）
- `GET /api/categories/{id}/` - 取得類別詳情
- `PUT /api/categories/{id}/` - 更新類別（管理員）
- `DELETE /api/categories/{id}/` - 刪除類別（管理員）

### 屬性定義
- `GET /api/properties/` - 列出所有屬性定義
- `POST /api/properties/` - 建立新屬性定義（管理員）
- `GET /api/properties/{id}/` - 取得屬性定義詳情
- `PUT /api/properties/{id}/` - 更新屬性定義（管理員）
- `DELETE /api/properties/{id}/` - 刪除屬性定義（管理員）

### 裝置
- `GET /api/devices/` - 列出裝置（根據權限過濾）
- `POST /api/devices/` - 建立新裝置
- `GET /api/devices/{id}/` - 取得裝置詳情
- `PUT /api/devices/{id}/` - 更新裝置
- `DELETE /api/devices/{id}/` - 刪除裝置
- `GET /api/devices/statistics/` - 取得統計資訊
- `GET /api/devices/{id}/history/` - 取得裝置操作歷史
- `GET /api/devices/search_by_ip/?ip={ip}` - 根據 IP 搜尋裝置

### IP 記錄
- `GET /api/ip-records/` - 列出 IP 記錄
- `POST /api/ip-records/` - 建立新 IP 記錄
- `GET /api/ip-records/{id}/` - 取得 IP 記錄詳情
- `PUT /api/ip-records/{id}/` - 更新 IP 記錄
- `DELETE /api/ip-records/{id}/` - 刪除 IP 記錄
- `GET /api/ip-records/check_ip_available/?ip={ip}` - 檢查 IP 是否可用

### 操作日誌
- `GET /api/audit-logs/` - 列出操作日誌（唯讀）
- `GET /api/audit-logs/{id}/` - 取得日誌詳情

## 使用範例

### 1. 建立裝置類別
```bash
curl -X POST http://localhost:8000/api/categories/ \
  -H "Content-Type: application/json" \
  -u admin:password \
  -d '{
    "name": "印表機",
    "description": "各種印表機設備"
  }'
```

### 2. 定義類別屬性
```bash
curl -X POST http://localhost:8000/api/properties/ \
  -H "Content-Type: application/json" \
  -u admin:password \
  -d '{
    "category": 1,
    "name": "墨水耗材",
    "field_type": "choice",
    "is_required": true,
    "choices": ["黑色", "彩色", "混合"],
    "order": 1
  }'
```

### 3. 建立裝置
```bash
curl -X POST http://localhost:8000/api/devices/ \
  -H "Content-Type: application/json" \
  -u admin:password \
  -d '{
    "serial_number": "PRN-001",
    "name": "辦公室印表機",
    "category": 1,
    "status": "active",
    "custom_properties": {
      "墨水耗材": "彩色"
    },
    "purchase_date": "2024-01-01",
    "cost": 15000,
    "department": "IT部門",
    "location": "3樓辦公室"
  }'
```

### 4. 建立 IP 記錄
```bash
curl -X POST http://localhost:8000/api/ip-records/ \
  -H "Content-Type: application/json" \
  -u admin:password \
  -d '{
    "device": 1,
    "ip_address": "192.168.1.100",
    "mac_address": "AA:BB:CC:DD:EE:FF",
    "is_active": true
  }'
```

### 5. 查詢統計資訊
```bash
curl -X GET http://localhost:8000/api/devices/statistics/ \
  -u admin:password
```

## Django Admin 介面

訪問 `http://localhost:8000/admin/` 使用超級使用者登入，可以：

- 管理所有裝置類別和屬性定義
- 瀏覽和編輯所有裝置
- 查看 IP 記錄和歷史
- 查看完整的操作日誌
- 使用內聯表單快速編輯相關記錄

## 測試

```bash
# 執行所有測試
python manage.py test

# 執行特定應用的測試
python manage.py test device_management
```

## 專案結構

```
ICAP/
├── icap_project/          # Django 專案設定
│   ├── settings.py        # 專案設定
│   ├── urls.py            # 主要 URL 配置
│   └── wsgi.py
├── device_management/     # 裝置管理應用
│   ├── models.py          # 資料模型
│   ├── serializers.py     # DRF 序列化器
│   ├── views.py           # API 視圖
│   ├── urls.py            # 應用 URL 配置
│   ├── forms.py           # Django 表單
│   ├── admin.py           # Django Admin 配置
│   ├── permissions.py     # 自訂權限類別
│   └── migrations/        # 資料庫遷移
├── requirements.txt       # Python 依賴
└── manage.py              # Django 管理腳本
```

## 技術棧

- **後端框架**: Django 4.2
- **REST API**: Django REST Framework 3.14
- **資料庫**: PostgreSQL 12+ (支援 JSONB)
- **過濾**: django-filter
- **認證**: Session + Basic Auth

## 安全性

- 使用 Django 內建的認證系統
- CSRF 保護
- 基於角色的存取控制
- SQL 注入防護
- XSS 防護
- 完整的審計日誌

## 授權

MIT License

## 貢獻

歡迎提交 Pull Request 或 Issue！
