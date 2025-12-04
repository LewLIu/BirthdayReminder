const axios = require('axios');

class WeComNotifier {
    constructor(corpId, corpSecret, agentId) {
        this.corpId = corpId || process.env.WECOM_CORP_ID;
        this.corpSecret = corpSecret || process.env.WECOM_CORP_SECRET;
        this.agentId = agentId || process.env.WECOM_AGENT_ID;
        this.accessToken = null;
        this.tokenExpireTime = null;
    }

    // 获取 Access Token
    async getAccessToken() {
        const now = Date.now();
        if (this.accessToken && this.tokenExpireTime && now < this.tokenExpireTime) {
            return this.accessToken;
        }

        const url = `https://qyapi.weixin.qq.com/cgi-bin/gettoken?corpid=${this.corpId}&corpsecret=${this.corpSecret}`;
        try {
            const response = await axios.get(url);
            if (response.data.errcode === 0) {
                this.accessToken = response.data.access_token;
                this.tokenExpireTime = now + (response.data.expires_in - 60) * 1000; // 提前60秒过期
                return this.accessToken;
            } else {
                throw new Error(`获取Token失败: ${response.data.errmsg}`);
            }
        } catch (error) {
            throw new Error(`请求Token接口失败: ${error.message}`);
        }
    }

    // 发送文本消息
    async sendTextMessage(content, toUser = '@all') {
        const accessToken = await this.getAccessToken();
        const url = `https://qyapi.weixin.qq.com/cgi-bin/message/send?access_token=${accessToken}`;

        const data = {
            touser: toUser,
            msgtype: 'text',
            agentid: parseInt(this.agentId),
            text: {
                content: content
            },
            safe: 0
        };

        try {
            const response = await axios.post(url, data);
            if (response.data.errcode !== 0) {
                throw new Error(`消息发送失败: ${response.data.errmsg}`);
            }
            return { success: true, messageId: response.data.msgid };
        } catch (error) {
            throw new Error(`发送消息请求失败: ${error.message}`);
        }
    }
}

// 导出一个便捷函数
async function sendWecomMessage(content) {
    // 这些环境变量将在 GitHub Secrets 中配置
    const notifier = new WeComNotifier();
    return await notifier.sendTextMessage(content);
}

module.exports = { WeComNotifier, sendWecomMessage };
