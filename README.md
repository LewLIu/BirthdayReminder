# 🎂 智能生日提醒系统

基于 GitHub Actions 的自动化生日检查与提醒系统，支持公历和农历生日，并通过**企业微信机器人**推送精美的 Markdown 格式消息。

## ✨ 核心特性

-   **智能提醒**：支持设置全局默认及个人独立的**提前多天提醒**（如提前3天、7天），确保不会错过任何重要生日。
-   **双历支持**：完美兼容**公历**与**农历**生日，农历支持“数字-数字”或“中文-中文”两种格式。
-   **信息丰富**：提醒消息明确告知是“今天”还是“还有X天”生日，并包含**生日类型**和**星座**信息。
-   **稳定可靠**：利用 GitHub Actions 的免费计划进行每日定时检查，无需自备服务器。
-   **配置灵活**：所有人员信息和提醒规则集中在一个 JSON 配置文件中，管理一目了然。

## 🚀 快速部署指南

### 1. 获取项目代码
Fork 或 Clone 此仓库到你的 GitHub 账号下。

### 2. 配置企业微信机器人
1.  在**手机企业微信**中，创建一个只有你（或需要接收提醒的人）的群聊。
2.  点击群聊右上角`···` -> **`添加群机器人`** -> **`新建`**。
3.  为机器人命名（如“生日管家”），创建成功后，**仔细复制并保存生成的 Webhook 地址**。
    > **格式类似**：`https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`

### 3. 在 GitHub 上配置密钥
1.  进入你仓库的 **Settings > Secrets and variables > Actions**。
2.  点击 **New repository secret**。
3.  创建一个名为 `WEWORK_WEBHOOK_URL` 的密钥，将上一步复制的 Webhook 地址粘贴为值。

### 4. 配置生日列表
编辑项目中的 [`config/birthdays.json`](./config/birthdays.json) 文件：
-   在 `globalSettings` 中设置全员的默认提前提醒天数。
-   在 `people` 数组中，按格式添加需要提醒的人员信息。
-   如果某个人需要特殊的提醒节奏，可以单独为其设置 `advanceNoticeDays`，它将覆盖全局默认值。

### 5. 立即测试
1.  进入仓库的 **Actions** 标签页。
2.  在左侧选择 **Daily Birthday Check** 工作流。
3.  点击 **Run workflow** 手动触发一次运行，查看日志是否成功，并检查微信是否收到测试提醒。

配置完成后，工作流将在每天 **UTC 时间 2:00（北京时间上午 10:00）** 自动运行。

## ⚙️ 配置文件详解

### 结构说明
```json
{
  "globalSettings": {
    "defaultAdvanceNoticeDays": [0, 3, 7]
  },
  "people": [
    {
      "name": "姓名",
      "birthdayType": "solar | lunar",
      "birthday": "MM-DD | 中文月-中文日",
      "advanceNoticeDays": [] // 可选，不设置则使用全局默认
    }
  ]
}
