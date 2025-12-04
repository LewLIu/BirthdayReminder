# 生日检查提醒系统

基于 GitHub Actions 的自动化生日检查与提醒系统，支持公历和农历生日，并通过企业微信推送消息。

## 功能特性
- ⏰ **每日自动检查**：每天上午 10:00（北京时间）自动运行
- 📅 **农历/公历支持**：可配置两种生日类型
- 💬 **企业微信推送**：通过企业微信插件发送提醒消息
- ⚙️ **配置化管理**：所有生日信息集中配置，易于维护

## 快速开始

### 1. 克隆或创建项目
将本项目文件复制到你的 GitHub 仓库。

### 2. 配置生日信息
编辑 `config/birthdays.json` 文件，添加需要提醒的人员信息。

### 3. 配置企业微信参数
在 GitHub 仓库中设置以下 Secrets：
- `WECOM_CORP_ID`：企业 ID（在“我的企业”页面获取）[citation:7]
- `WECOM_CORP_SECRET`：应用 Secret（在“应用管理”中获取）[citation:7]
- `WECOM_AGENT_ID`：应用 AgentId[citation:7]

### 4. 手动测试
```bash
# 安装依赖
npm install

# 设置环境变量并运行（本地测试时需要）
export WECOM_CORP_ID="你的企业ID"
export WECOM_CORP_SECRET="你的应用Secret"
export WECOM_AGENT_ID="你的AgentId"
node scripts/index.js
