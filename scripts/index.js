const fs = require('fs');
const path = require('path');
const { Lunar, Solar } = require('lunar-javascript'); // 用于农历转换
const { sendWecomMessage } = require('./wecom-notifier.js');

// 读取生日配置
function loadBirthdayConfig() {
    const configPath = path.join(__dirname, '../config/birthdays.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return configData.people;
}

// 检查今天是否有生日
function checkBirthdaysToday(peopleList) {
    const today = new Date();
    const currentYear = today.getFullYear();
    const currentMonth = today.getMonth() + 1; // 月份从0开始，需+1
    const currentDay = today.getDate();

    const celebrants = [];

    peopleList.forEach(person => {
        let isBirthday = false;
        const [birthMonth, birthDay] = person.birthday.split('-').map(Number);

        if (person.birthdayType === 'solar') {
            // 公历生日直接比较月和日
            isBirthday = (currentMonth === birthMonth && currentDay === birthDay);
        } else if (person.birthdayType === 'lunar') {
            // 农历生日：先转换为当年的公历日期再比较
            const lunarDate = Lunar.fromYmd(currentYear, birthMonth, birthDay);
            const solarDate = lunarDate.getSolar();
            isBirthday = (currentMonth === solarDate.getMonth() + 1 && currentDay === solarDate.getDate());
        }

        if (isBirthday) {
            celebrants.push(person.name);
        }
    });

    return celebrants;
}

// 主执行函数
async function main() {
    console.log('开始执行生日检查...');
    console.log('当前时间 (UTC):', new Date().toISOString());

    try {
        const peopleList = loadBirthdayConfig();
        const celebrants = checkBirthdaysToday(peopleList);

        if (celebrants.length > 0) {
            console.log(`🎉 今天是 ${celebrants.join(', ')} 的生日！`);
            // 发送企业微信通知
            const message = `【生日提醒】\n今天是 ${celebrants.join('、')} 的生日，别忘了送上祝福哦！🎂`;
            const result = await sendWecomMessage(message);
            console.log('企业微信消息发送结果:', result);
        } else {
            console.log('今天没有人生日。');
            // 可选：发送一条无生日的静默通知或日志
        }
    } catch (error) {
        console.error('执行过程中发生错误:', error);
        process.exit(1); // 非零退出码表示失败
    }
}

// 如果直接运行此脚本
if (require.main === module) {
    main();
}

module.exports = { loadBirthdayConfig, checkBirthdaysToday };
