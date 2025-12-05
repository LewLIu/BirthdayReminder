🎂 BirthdayReminder · 生日提醒小助手

中文 | English

---

中文

项目简介

BirthdayReminder 是一个聪明又贴心的“生日小秘书”。它住在 GitHub 上，利用 GitHub Actions 的自动化超能力，每天准时帮你检查是否有好友或家人过生日。一旦发现目标，它就会通过 企业微信机器人，悄咪咪地给你发来温馨提醒，确保你永远不会错过任何一个重要的祝福时刻！

它独特地支持公历与农历生日，理解“冬月”、“廿二”这样的传统表达，还能设置提前 N 天提醒，让你有充足的时间准备惊喜。再也不用担心忘记生日啦！

✨ 核心特性

· ⏰ 智能定时检查：依托 GitHub Actions，实现每日自动运行，无需自备服务器，稳定可靠。
· 📅 农历/公历双支持：完美适配中国传统农历生日，支持“正月-初一”、“冬月-廿二”等多种格式。
· 🔔 灵活提前提醒：可配置全局或个人专属的提前提醒天数（如提前 3 天、7 天），当天生日也绝不遗漏。
· 💬 多平台消息推送：通过企业微信机器人发送通知，消息可直接在微信中接收，简单方便。
· 🎯 信息清晰明了：提醒消息明确告知“今天”还是“N天后”，区分公历农历，公历生日还会附上星座信息。
· ⚙️ 配置简单直观：所有生日信息和提醒规则，只需在一个 JSON 配置文件中管理，一目了然。

🚀 快速开始

只需简单 4 步，即可拥有你的私人生日管家：

1. 获取项目代码

点击 GitHub 页面右上角的 Fork 按钮，将此仓库复制到你自己的账户下。

2. 配置企业微信机器人

1. 打开 手机版企业微信，创建一个只有你（或需要接收消息的成员）的群聊。
2. 点击群聊右上角 ··· -> 添加群机器人 -> 新建。
3. 为机器人取个名（例如：“生日管家”），创建成功后，完整复制弹出的 Webhook 地址并保存。
   地址格式类似： https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=一串密钥

3. 在 GitHub 中配置密钥

1. 进入你 Fork 后的仓库，点击 Settings -> Secrets and variables -> Actions。
2. 点击 New repository secret，创建一个新的密钥：
   · Name: WEWORK_WEBHOOK_URL
   · Value: 粘贴你刚才复制的 Webhook 地址。
3. 点击 Add secret 保存。

4. 配置你的生日列表

编辑仓库中的 config/birthdays.json 文件，按以下格式添加需要提醒的人员信息：

```json
{
  "globalSettings": {
    "defaultAdvanceNoticeDays": [0, 3, 7]
  },
  "people": [
    {
      "name": "张三",
      "birthdayType": "solar",
      "birthday": "12-25",
      "advanceNoticeDays": [0, 1, 3]
    },
    {
      "name": "李四",
      "birthdayType": "lunar",
      "birthday": "冬月-廿二"
    }
  ]
}
```

完成！ 工作流将在每天 UTC 时间 2:00（北京时间上午 10:00） 自动运行。你也可以立即前往仓库的 Actions 标签页，手动触发 Daily Birthday Check 工作流进行测试。

⚙️ 配置详解

birthdays.json 文件结构

```json
{
  “globalSettings”： { // 全局默认设置
    “defaultAdvanceNoticeDays”： [0， 3， 7] // 全局默认提前提醒日。0=当天，[0，3，7]表示当天、提前3天、提前7天各提醒一次。
  }，
  “people”： [ // 生日人员列表
    {
      “name”： “姓名”， // 必填
      “birthdayType”： “solar|lunar”， // 必填，`solar`代表公历，`lunar`代表农历
      “birthday”： “MM-DD|中文月-中文日”， // 必填，生日日期
      “advanceNoticeDays”： [] // 可选，个人提醒设置。若留空，则使用全局设置。
    }
  ]
}
```

生日 (birthday) 格式示例

类型 示例 说明
公历 “12-25” 12月25日。
农历1 “十月-十六” 十月十六。支持“月”、“日”等字符。
农历2 “冬-廿二” 冬月（十一月）廿二。支持“冬月”、“腊月”。
农历3 “1-15” 正月十五（使用数字）。

📨 消息示例

运行成功后，你的微信（需绑定企业微信）会收到如下格式的提醒：

🎊 生日提醒 🎊

🎁 今天过生日：
🎂 🌙 李四 （十月十六） 农历

📌 即将过生日：
⏰ 📅 张三 还有1天 （2025-12-24） 公历 | 摩羯座

💝 记得送上祝福哦！

❓ 常见问题

1. 收不到提醒消息？
   · 检查 GitHub Actions 工作流是否运行成功（绿色✅）。
   · 确认 WEWORK_WEBHOOK_URL 密钥配置正确，且 Webhook 未过期。
   · 在微信中，确保已开启企业微信插件的接收应用消息权限。
2. 农历生日提醒不准？
   · 请确认配置文件中的农历格式是否正确，月份支持“一”到“十二”、“冬”、“腊”。
   · 本项目使用 lunar-javascript 库进行精准的农历-公历转换。
3. 如何修改提醒时间？
   · 编辑 .github/workflows/daily-check.yml 文件中的 cron 表达式。‘0 2 * * *’ 代表每天 UTC 2:00（北京10:00）。
4. 这个服务收费吗？
   · 本项目完全免费，但请注意 GitHub 对免费账户的 Actions 运行时间有一定月度限制，对于个人使用完全足够。

---

English

Project Introduction

BirthdayReminder is your smart and thoughtful “Birthday Assistant”. It resides on GitHub, leverages the automation superpower of GitHub Actions to check for birthdays of your friends and family every day. Once it finds a match, it quietly sends you a warm reminder via a WeCom (WeChat Work) Bot, ensuring you never miss an important moment to send your wishes!

It uniquely supports both Gregorian (solar) and Lunar (Chinese) birthdays, understands traditional expressions like “冬月 (Winter Month)” and “廿二 (22nd)”, and allows you to set advance reminders (N days before) so you have ample time to prepare surprises. Never worry about forgetting a birthday again!

✨ Core Features

· ⏰ Smart Scheduled Checks: Relies on GitHub Actions for daily automatic runs. No personal server needed—stable and reliable.
· 📅 Dual Calendar Support: Perfectly adapts to traditional Chinese lunar birthdays. Supports formats like “正月-初一” and “冬月-廿二”.
· 🔔 Flexible Advance Reminders: Configurable global or personal advance notice days (e.g., 3 days, 7 days in advance). Same-day birthdays are always covered.
· 💬 Multi-Platform Notifications: Sends reminders via a WeCom Bot. Messages can be received directly in WeChat—simple and convenient.
· 🎯 Clear & Informative Messages: Reminders clearly state if it’s “Today” or “In N days”, specify the calendar type, and include the Zodiac sign for solar birthdays.
· ⚙️ Simple Configuration: All birthday information and reminder rules are managed in a single, easy-to-understand JSON configuration file.

🚀 Quick Start

Get your personal birthday管家 (butler) in just 4 simple steps:

1. Get the Code

Click the Fork button at the top-right of this GitHub page to copy the repository to your own account.

2. Set Up the WeCom Bot

1. Open the WeCom (WeChat Work) mobile app and create a group chat that includes only you (or the members who need to receive reminders).
2. Tap ··· in the top-right corner of the chat -> Add Group Bot -> Create.
3. Name your bot (e.g., “Birthday Butler”). After creation, carefully copy the entire Webhook URL that pops up.
   URL looks like: https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=your_key_here

3. Configure the Secret on GitHub

1. Go to your forked repository, click Settings -> Secrets and variables -> Actions.
2. Click New repository secret to create a new secret:
   · Name: WEWORK_WEBHOOK_URL
   · Value: Paste the Webhook URL you copied.
3. Click Add secret to save.

4. Configure Your Birthday List

Edit the config/birthdays.json file in your repository. Add people to remind following this format:

```json
{
  “globalSettings”： {
    “defaultAdvanceNoticeDays”： [0， 3， 7]
  }，
  “people”： [
    {
      “name”： “Zhang San”，
      “birthdayType”： “solar”，
      “birthday”： “12-25”，
      “advanceNoticeDays”： [0， 1， 3]
    }，
    {
      “name”： “Li Si”，
      “birthdayType”： “lunar”，
      “birthday”： “冬月-廿二”
    }
  ]
}
```

That‘s it! The workflow will run automatically every day at 02:00 UTC (10:00 Beijing Time). You can also go to the Actions tab in your repository and manually trigger the Daily Birthday Check workflow for an immediate test.

⚙️ Configuration Details

birthdays.json File Structure

```json
{
  “globalSettings”: { // Global default settings
    “defaultAdvanceNoticeDays”: [0, 3, 7] // Global default advance notice days. 0=on the day. [0,3,7] means reminding on the day, 3 days before, and 7 days before.
  },
  “people”: [ // List of people
    {
      “name”: “Name”, // Required
      “birthdayType”: “solar|lunar”, // Required. `solar` for Gregorian, `lunar` for Chinese Lunar.
      “birthday”: “MM-DD|ChineseMonth-ChineseDay”, // Required. The birth date.
      “advanceNoticeDays”: [] // Optional. Personal reminder settings. If empty, uses global settings.
    }
  ]
}
```

Birthday (birthday) Format Examples

Type Example Notes
Solar “12-25” December 25th.
Lunar1 “十月-十六” 16th day of the 10th lunar month. Supports characters like “月”.
Lunar2 “冬-廿二” 22nd day of the 冬月 (11th lunar month). Supports “冬月”， “腊月”.
Lunar3 “1-15” 15th day of the 1st lunar month (using numbers).

📨 Message Example

Upon successful run, you will receive a reminder in WeChat (bound to WeCom) like this:

🎊 Birthday Reminder 🎊

🎁 Birthdays Today：
🎂 🌙 Li Si （十月十六） Lunar

📌 Upcoming Birthdays：
⏰ 📅 Zhang San In 1 day （2025-12-24） Solar | Capricorn

💝 Remember to send your blessings!

❓ FAQ

1. Not receiving messages?
   · Check if the GitHub Actions workflow ran successfully (green ✅).
   · Verify the WEWORK_WEBHOOK_URL secret is configured correctly and the Webhook hasn‘t expired.
   · In WeChat, ensure you have enabled Receive App Messages for the WeCom plugin.
2. Lunar birthday reminders are inaccurate?
   · Please confirm the lunar format in the config file is correct. Months support “一” to “十二”, “冬”, “腊”.
   · This project uses the lunar-javascript library for precise lunar-to-solar conversion.
3. How to change the reminder time?
   · Edit the cron expression in the .github/workflows/daily-check.yml file. ‘0 2 * * *’ means daily at 02:00 UTC (10:00 Beijing Time).
4. Is this service free?
   · Yes, this project is completely free. However, please note that GitHub has monthly usage limits on Actions runtime for free accounts, which is more than sufficient for personal use.

Happy Reminding! 祝您使用愉快！ 🎉
