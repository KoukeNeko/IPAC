# 快速開始指南

本指南將幫助你在 5 分鐘內啟動並運行 ICAP 裝置資產管理系統。

## 步驟 1: 克隆專案

```bash
git clone https://github.com/KoukeNeko/ICAP.git
cd ICAP
```

## 步驟 2: 安裝依賴

```bash
pip install -r requirements.txt
```

## 步驟 3: 設定資料庫

### 選項 A: 使用 SQLite（快速開始，推薦用於測試）

```bash
export USE_SQLITE=True
python manage.py migrate
```

### 選項 B: 使用 PostgreSQL（生產環境）

1. 建立資料庫和使用者：

```bash
sudo -u postgres psql
CREATE DATABASE icap_db;
CREATE USER icap_user WITH PASSWORD 'icap_password';
ALTER ROLE icap_user SET client_encoding TO 'utf8';
ALTER ROLE icap_user SET default_transaction_isolation TO 'read committed';
ALTER ROLE icap_user SET timezone TO 'Asia/Taipei';
GRANT ALL PRIVILEGES ON DATABASE icap_db TO icap_user;
\q
```

2. 執行遷移：

```bash
python manage.py migrate
```

## 步驟 4: 建立範例資料

```bash
python manage.py create_sample_data
```

這將建立：
- 管理員帳號：`admin` / `admin123`
- 使用者帳號：`user1` / `user123`
- 3 個裝置類別（印表機、電腦、網路設備）
- 每個類別的屬性定義
- 3 個範例裝置
- 3 筆 IP 記錄

## 步驟 5: 啟動開發伺服器

```bash
# 使用 SQLite
export USE_SQLITE=True
python manage.py runserver

# 或使用 PostgreSQL（不需要設定環境變數）
python manage.py runserver
```

## 步驟 6: 開始使用

### Django Admin 介面

訪問 http://localhost:8000/admin/

使用 `admin` / `admin123` 登入。

你可以：
- 管理裝置類別和屬性定義
- 新增/編輯/刪除裝置
- 管理 IP 記錄
- 查看操作日誌

### REST API

API 根路徑：http://localhost:8000/api/

使用 Basic Auth 認證（用戶名：`admin`，密碼：`admin123`）

#### 範例請求

1. **列出所有裝置類別**
```bash
curl -u admin:admin123 http://localhost:8000/api/categories/
```

2. **列出所有裝置**
```bash
curl -u admin:admin123 http://localhost:8000/api/devices/
```

3. **取得裝置統計資訊**
```bash
curl -u admin:admin123 http://localhost:8000/api/devices/statistics/
```

4. **建立新裝置**
```bash
curl -X POST http://localhost:8000/api/devices/ \
  -H "Content-Type: application/json" \
  -u admin:admin123 \
  -d '{
    "serial_number": "NEW-001",
    "name": "新裝置",
    "category": 1,
    "status": "active",
    "department": "測試部門",
    "location": "測試位置"
  }'
```

5. **根據 IP 搜尋裝置**
```bash
curl -u admin:admin123 "http://localhost:8000/api/devices/search_by_ip/?ip=192.168.1.100"
```

6. **檢查 IP 是否可用**
```bash
curl -u admin:admin123 "http://localhost:8000/api/ip-records/check_ip_available/?ip=192.168.1.200"
```

## API 端點總覽

| 端點 | 方法 | 說明 |
|------|------|------|
| `/api/categories/` | GET, POST | 裝置類別列表/建立 |
| `/api/categories/{id}/` | GET, PUT, DELETE | 類別詳情/更新/刪除 |
| `/api/properties/` | GET, POST | 屬性定義列表/建立 |
| `/api/properties/{id}/` | GET, PUT, DELETE | 屬性詳情/更新/刪除 |
| `/api/devices/` | GET, POST | 裝置列表/建立 |
| `/api/devices/{id}/` | GET, PUT, DELETE | 裝置詳情/更新/刪除 |
| `/api/devices/statistics/` | GET | 統計資訊 |
| `/api/devices/{id}/history/` | GET | 裝置操作歷史 |
| `/api/devices/search_by_ip/` | GET | 根據 IP 搜尋 |
| `/api/ip-records/` | GET, POST | IP 記錄列表/建立 |
| `/api/ip-records/{id}/` | GET, PUT, DELETE | IP 記錄詳情/更新/刪除 |
| `/api/ip-records/check_ip_available/` | GET | 檢查 IP 可用性 |
| `/api/audit-logs/` | GET | 操作日誌列表 |
| `/api/audit-logs/{id}/` | GET | 日誌詳情 |

## 權限說明

### 管理員（is_staff=True 或 is_superuser=True）
- 可以查看所有裝置
- 可以建立/更新/刪除所有裝置
- 可以管理類別和屬性定義
- 可以查看所有操作日誌

### 一般使用者
- 只能查看自己負責的裝置
- 只能編輯自己負責的裝置
- 可以查看所有類別和屬性定義（唯讀）
- 只能查看自己的操作日誌

## 進階功能

### 動態屬性

每個裝置類別可以定義自己的屬性。例如：

印表機類別可能有：
- 墨水耗材（選項類型）
- 列印速度（數字類型）

電腦類別可能有：
- CPU（文字類型）
- 記憶體（數字類型）
- 作業系統（選項類型）

這些屬性儲存在裝置的 `custom_properties` JSONB 欄位中。

### 折舊計算

系統會根據購買日期、成本和折舊率自動計算裝置的當前價值：

```
當前價值 = 成本 - (成本 × 折舊率 × 經過年數)
```

### IP 歷史追蹤

每次更新 IP 記錄時，系統會自動將變更記錄到 `history` 欄位中，包括：
- 時間戳記
- 操作類型
- 舊的 IP/MAC
- 新的 IP/MAC
- 操作用戶

### 操作日誌

系統會自動記錄所有重要操作，包括：
- 建立/更新/刪除裝置
- 建立/更新/刪除 IP 記錄
- 建立/更新/刪除類別和屬性定義
- 操作用戶和 IP 位址
- 變更內容（JSON 格式）

## 疑難排解

### 問題：連接 PostgreSQL 失敗

解決方案：使用 SQLite 進行測試
```bash
export USE_SQLITE=True
python manage.py runserver
```

### 問題：沒有權限查看裝置

解決方案：確保用戶是管理員，或者將裝置的 `responsible_person` 設為該用戶。

### 問題：API 返回 403 Forbidden

解決方案：確保已經登入並有適當的權限。一般用戶只能編輯自己負責的裝置。

## 下一步

- 閱讀完整的 [README.md](README.md) 了解更多功能
- 探索 Django Admin 介面
- 使用 API 整合到你的應用程式
- 根據需求自訂裝置類別和屬性定義

## 需要幫助？

如果遇到問題，請：
1. 查看 [README.md](README.md) 的詳細文檔
2. 檢查 Django 日誌輸出
3. 在 GitHub 上提交 Issue

祝你使用愉快！🎉
