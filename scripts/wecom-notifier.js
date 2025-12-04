const axios = require('axios');

async function sendWecomMessage(content) {
    const webhookUrl = process.env.WEWORK_WEBHOOK_URL;
    if (!webhookUrl) {
        throw new Error('未配置企业微信机器人Webhook地址 (WEWORK_WEBHOOK_URL)');
    }

    const data = {
        msgtype: 'markdown',
        markdown: {
            content: content
        }
    };

    try {
        const response = await axios.post(webhookUrl, data);
        if (response.data.errcode !== 0) {
            throw new Error(`消息发送失败: ${response.data.errmsg}`);
        }
        return { success: true, messageId: response.data.msgid };
    } catch (error) {
        throw new Error(`发送消息请求失败: ${error.message}`);
    }
}

module.exports = { sendWecomMessage };
