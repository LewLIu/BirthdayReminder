const axios = require('axios');
async function sendWecomMessage(content) {
    const webhookUrl = process.env.WEWORK_WEBHOOK_URL;
    if (!webhookUrl) throw new Error('未配置WEWORK_WEBHOOK_URL');
    
    // 关键修改：将 msgtype 从 ‘markdown’ 改为 ‘text’
    const data = {
        msgtype: 'text',
        text: {
            content: content // 注意：text消息内容不支持Markdown语法
        }
    };
    
    const response = await axios.post(webhookUrl, data);
    if (response.data.errcode !== 0) throw new Error(`发送失败: ${response.data.errmsg}`);
    return { success: true, messageId: response.data.msgid };
}
module.exports = { sendWecomMessage };
