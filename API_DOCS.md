# API 文檔

## 認證

所有 API 端點都需要認證。支援以下認證方式：

1. **Session Authentication** - 適用於網頁瀏覽器
2. **Basic Authentication** - 適用於 API 客戶端

### Basic Auth 範例
```bash
curl -u username:password http://localhost:8000/api/devices/
```

## 通用參數

### 分頁
所有列表端點都支援分頁：
- `page`: 頁碼（預設：1）
- `page_size`: 每頁結果數（預設：50，最大：100）

範例：
```bash
curl -u admin:admin123 "http://localhost:8000/api/devices/?page=2&page_size=20"
```

### 搜尋
支援全文搜尋的端點：
- `search`: 搜尋關鍵字

範例：
```bash
curl -u admin:admin123 "http://localhost:8000/api/devices/?search=印表機"
```

### 過濾
支援欄位過濾：

範例：
```bash
# 按類別過濾
curl -u admin:admin123 "http://localhost:8000/api/devices/?category=1"

# 按狀態過濾
curl -u admin:admin123 "http://localhost:8000/api/devices/?status=active"

# 按部門過濾
curl -u admin:admin123 "http://localhost:8000/api/devices/?department=IT部門"
```

### 排序
- `ordering`: 排序欄位（加 `-` 表示降序）

範例：
```bash
# 按建立時間降序
curl -u admin:admin123 "http://localhost:8000/api/devices/?ordering=-created_at"

# 按成本升序
curl -u admin:admin123 "http://localhost:8000/api/devices/?ordering=cost"
```

## 裝置類別 API

### 列出所有類別
```
GET /api/categories/
```

回應範例：
```json
{
  "count": 3,
  "next": null,
  "previous": null,
  "results": [
    {
      "id": 1,
      "name": "印表機",
      "description": "各種印表機設備",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z",
      "property_definitions": [
        {
          "id": 1,
          "name": "墨水耗材",
          "field_type": "choice",
          "is_required": true,
          "choices": ["黑色", "彩色", "混合"]
        }
      ],
      "device_count": 5
    }
  ]
}
```

### 建立類別
```
POST /api/categories/
```

請求範例：
```json
{
  "name": "伺服器",
  "description": "各種伺服器設備"
}
```

### 取得類別詳情
```
GET /api/categories/{id}/
```

### 更新類別
```
PUT /api/categories/{id}/
```

### 刪除類別
```
DELETE /api/categories/{id}/
```

## 屬性定義 API

### 列出所有屬性定義
```
GET /api/properties/
```

支援過濾：
- `category`: 類別 ID
- `field_type`: 欄位類型
- `is_required`: 是否必填

### 建立屬性定義
```
POST /api/properties/
```

請求範例：
```json
{
  "category": 1,
  "name": "墨水耗材",
  "field_type": "choice",
  "is_required": true,
  "choices": ["黑色", "彩色", "混合"],
  "help_text": "選擇墨水耗材類型",
  "order": 1
}
```

欄位類型：
- `text`: 文字
- `number`: 數字
- `date`: 日期
- `boolean`: 布林值
- `choice`: 選項

## 裝置 API

### 列出裝置
```
GET /api/devices/
```

支援過濾：
- `category`: 類別 ID
- `status`: 狀態（active, inactive, maintenance, retired）
- `department`: 部門
- `location`: 位置
- `responsible_person`: 責任人 ID

回應範例：
```json
{
  "count": 10,
  "next": "http://localhost:8000/api/devices/?page=2",
  "previous": null,
  "results": [
    {
      "id": 1,
      "serial_number": "PRN-001",
      "name": "辦公室印表機",
      "category_name": "印表機",
      "status": "active",
      "responsible_person_name": "user1",
      "department": "IT部門",
      "location": "3樓辦公室",
      "created_at": "2024-01-01T00:00:00Z",
      "updated_at": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 建立裝置
```
POST /api/devices/
```

請求範例：
```json
{
  "serial_number": "PRN-002",
  "name": "新印表機",
  "category": 1,
  "status": "active",
  "responsible_person": 2,
  "custom_properties": {
    "墨水耗材": "彩色",
    "列印速度": 30
  },
  "purchase_date": "2024-01-01",
  "cost": "15000.00",
  "department": "IT部門",
  "location": "3樓辦公室",
  "depreciation_rate": "20.00"
}
```

### 取得裝置詳情
```
GET /api/devices/{id}/
```

回應包含完整資訊，包括 IP 記錄和當前價值。

### 更新裝置
```
PUT /api/devices/{id}/
PATCH /api/devices/{id}/
```

### 刪除裝置
```
DELETE /api/devices/{id}/
```

### 取得統計資訊
```
GET /api/devices/statistics/
```

回應範例：
```json
{
  "total_devices": 100,
  "active_devices": 80,
  "inactive_devices": 15,
  "maintenance_devices": 3,
  "retired_devices": 2,
  "devices_by_category": {
    "印表機": 30,
    "電腦": 50,
    "網路設備": 20
  },
  "devices_by_department": {
    "IT部門": 40,
    "會計部": 30,
    "人事部": 30
  },
  "total_cost": "2500000.00",
  "total_current_value": "1750000.00"
}
```

### 取得裝置操作歷史
```
GET /api/devices/{id}/history/
```

### 根據 IP 搜尋裝置
```
GET /api/devices/search_by_ip/?ip=192.168.1.100
```

## IP 記錄 API

### 列出 IP 記錄
```
GET /api/ip-records/
```

支援過濾：
- `device`: 裝置 ID
- `is_active`: 是否啟用

### 建立 IP 記錄
```
POST /api/ip-records/
```

請求範例：
```json
{
  "device": 1,
  "ip_address": "192.168.1.100",
  "mac_address": "AA:BB:CC:DD:EE:FF",
  "is_active": true,
  "notes": "辦公室印表機 IP"
}
```

MAC 位址格式：`XX:XX:XX:XX:XX:XX`

### 更新 IP 記錄
```
PUT /api/ip-records/{id}/
```

更新時會自動記錄到歷史。

### 檢查 IP 是否可用
```
GET /api/ip-records/check_ip_available/?ip=192.168.1.200
```

回應範例：
```json
{
  "ip_address": "192.168.1.200",
  "is_available": true
}
```

## 操作日誌 API

### 列出操作日誌
```
GET /api/audit-logs/
```

支援過濾：
- `user`: 用戶 ID
- `action`: 操作類型（create, update, delete, view）
- `model_name`: 模型名稱

回應範例：
```json
{
  "count": 50,
  "results": [
    {
      "id": 1,
      "user_name": "admin",
      "action": "create",
      "model_name": "Device",
      "object_id": "1",
      "object_repr": "辦公室印表機 (PRN-001)",
      "changes": null,
      "ip_address": "127.0.0.1",
      "timestamp": "2024-01-01T00:00:00Z"
    }
  ]
}
```

### 取得日誌詳情
```
GET /api/audit-logs/{id}/
```

## 錯誤處理

所有錯誤回應遵循統一格式：

### 400 Bad Request
```json
{
  "field_name": [
    "錯誤訊息"
  ]
}
```

### 401 Unauthorized
```json
{
  "detail": "Authentication credentials were not provided."
}
```

### 403 Forbidden
```json
{
  "detail": "You do not have permission to perform this action."
}
```

### 404 Not Found
```json
{
  "detail": "Not found."
}
```

## 最佳實踐

1. **使用分頁** - 避免一次取得太多資料
2. **使用過濾和搜尋** - 精確找到需要的資料
3. **快取回應** - 減少重複請求
4. **處理錯誤** - 妥善處理各種錯誤情況
5. **記錄 API 呼叫** - 便於除錯和監控

## 範例程式碼

### Python
```python
import requests

url = 'http://localhost:8000/api/devices/'
auth = ('admin', 'admin123')
response = requests.get(url, auth=auth)
devices = response.json()
```

### JavaScript
```javascript
fetch('http://localhost:8000/api/devices/', {
  headers: {
    'Authorization': 'Basic ' + btoa('admin:admin123')
  }
})
.then(response => response.json())
.then(data => console.log(data));
```

### cURL
```bash
curl -u admin:admin123 http://localhost:8000/api/devices/
```
