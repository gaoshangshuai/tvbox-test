# XPTV 配置仓库说明

这是本人的 XPTV（及兼容 TVBox）配置文件仓库。这里记录了一些踩坑经验和备用链接，方便日后查阅。

## 📌 核心注意事项

1. **格式选择**：XPTV 支持 VOD 格式，**千万不要用 XML 格式**，XPTV 无法识别 XML。所有源统一使用 JSON 格式（即 `type: 1`）。
2. **加速前缀备用**：如果在拉取 GitHub 的 Raw 链接或 JS 脚本时遇到网络问题，请在原本的 `raw.githubusercontent.com` 链接前面拼上这个加速前缀：
   `https://ghp.xptvhelper.link/`
3. **JSON 语法**：所有的配置文件（`.json`）绝对不能写注释（不能用 `#` 或 `//`），必须在配置里面保持干净。备注只能写在 README 或者 JSON 的自定义 `_note` 字段里。

## 🛠️ 常用配置示例

为了保证格式绝对规范，配置只保留必要字段，不随意乱加备注。

```json
{
  "sites": [
    {
      "key": "dyttzy",
      "name": "电影天堂",
      "type": 1,
      "api": "http://caiji.dyttzyapi.com/api.php/provide/vod/",
      "searchable": 1,
      "quickSearch": 1,
      "filterable": 1
    }
  ]
}
