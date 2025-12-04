const fs = require('fs');
const path = require('path');
const { Lunar, Solar } = require('lunar-javascript'); // 用于农历转换
const { sendWecomMessage } = require('./wecom-notifier.js');

// 工具函数：获取星座
function getZodiacSign(month, day) {
    const dates = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 22, 22];
    const signs = ["摩羯座", "水瓶座", "双鱼座", "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座"];
    return (day < dates[month - 1]) ? signs[month - 1] : signs[month];
}

// 工具函数：将中文农历日期字符串转换为数字
function chineseLunarToNumber(chineseStr) {
    // 定义映射关系
    const digitMap = {
        '正': 1, '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '十一': 11, '十二': 12,
        '廿': 20, '卅': 30
    };
    const dayMap = {
        '初一': 1, '初二': 2, '初三': 3, '初四': 4, '初五': 5,
        '初六': 6, '初七': 7, '初八': 8, '初九': 9, '初十': 10,
        '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
        '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
        '廿一': 21, '廿二': 22, '廿三': 23, '廿四': 24, '廿五': 25,
        '廿六': 26, '廿七': 27, '廿八': 28, '廿九': 29, '三十': 30
    };

    // 1. 首先检查是否为完整的、常见的日期表达（如“廿二”）
    if (dayMap[chineseStr] !== undefined) {
        return dayMap[chineseStr];
    }

    // 2. 如果不是完整日期，则按字符解析（主要用于解析月份，如“十”）
    let num = 0;
    // 处理“二十”这种特殊情况
    if (chineseStr === '二十') {
        return 20;
    }
    // 处理带“廿”的日期（如脚本可能拆出单独的“廿”）
    if (chineseStr.startsWith('廿')) {
        const secondChar = chineseStr.substring(1); // 取出“廿”后面的字
        num = 20 + (digitMap[secondChar] || 0);
        return num;
    }
    // 处理带“十”的组合（如“十一”、“十二”）
    if (chineseStr.includes('十')) {
        const parts = chineseStr.split('十');
        if (parts.length === 2) {
            const [ten, one] = parts;
            num = (digitMap[ten] || 0) * 10 + (digitMap[one] || 0);
            // 处理像“十”单独出现，或“十一”这种情况
            if (num === 0) {
                // 如果拆分后没解析出数字，尝试直接映射（如“十一”）
                num = digitMap[chineseStr] || 0;
            }
        }
    } else {
        // 单字映射
        num = digitMap[chineseStr] || 0;
    }

    // 3. 如果以上都无法解析，尝试直接转换为整数（用户可能直接输入了数字字符串）
    if (num === 0) {
        num = parseInt(chineseStr);
    }
    // 最终保底，解析失败默认返回1，避免程序崩溃但会记录错误
    return isNaN(num) ? 1 : num;
}

/**
 * 检查指定日期（今日或未来某天）是否为某人的生日
 * @param {Date} targetDate - 要检查的日期对象
 * @param {Array} peopleList - 人员配置列表
 * @returns {Array} 匹配的人员列表，包含额外信息
 */
function checkBirthdayOnDate(targetDate, peopleList) {
    const result = [];
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1; // JS月份0-11
    const targetDay = targetDate.getDate();

    peopleList.forEach(person => {
        let isBirthday = false;
        let actualSolarDate = null;
        let zodiac = '未知';

        try {
            const [birthMonth, birthDay] = person.birthday.split('-').map(n => n.trim());

            if (person.birthdayType === 'solar') {
                // 公历直接比较
                const solarMonth = parseInt(birthMonth);
                const solarDay = parseInt(birthDay);
                if (isNaN(solarMonth) || isNaN(solarDay)) {
                    console.error(`人员 ${person.name} 的公历生日格式错误: ${person.birthday}`);
                    return; // 跳过此人
                }
                isBirthday = (targetMonth === solarMonth && targetDay === solarDay);
                if (isBirthday) {
                    actualSolarDate = Solar.fromYmd(targetYear, solarMonth, solarDay);
                }
            } else if (person.birthdayType === 'lunar') {
                // 农历：需要转换为公历再比较
                let lunarMonth, lunarDay;

                // 解析月份：尝试数字或中文
                if (isNaN(birthMonth)) {
                    lunarMonth = chineseLunarToNumber(birthMonth);
                } else {
                    lunarMonth = parseInt(birthMonth);
                }

                // 解析日期：尝试数字或中文（如“初一”）
                if (isNaN(birthDay)) {
                    lunarDay = chineseLunarToNumber(birthDay);
                } else {
                    lunarDay = parseInt(birthDay);
                }

                // 获取农历对应的公历日期
                const lunarDate = Lunar.fromYmd(targetYear, lunarMonth, lunarDay);
                const solarDate = lunarDate.getSolar();
                isBirthday = (targetMonth === solarDate.getMonth() + 1 && targetDay === solarDate.getDate());

                if (isBirthday) {
                    actualSolarDate = solarDate;
                }
            }

            // 如果匹配，计算星座并添加到结果
            if (isBirthday && actualSolarDate) {
                zodiac = getZodiacSign(actualSolarDate.getMonth() + 1, actualSolarDate.getDate());
                result.push({
                    name: person.name,
                    type: person.birthdayType === 'solar' ? '公历' : '农历',
                    zodiac: zodiac,
                    solarDate: actualSolarDate // 保留公历日期对象用于格式化
                });
            }
        } catch (error) {
            console.error(`处理人员 ${person.name} 的生日时出错:`, error.message);
        }
    });
    return result;
}

/**
 * 主函数
 */
async function main() {
    console.log('🎂 开始执行生日检查...');
    const now = new Date();
    console.log('当前系统时间:', now.toLocaleString('zh-CN'));

    try {
        // 1. 加载配置文件
        const configPath = path.join(__dirname, '../config/birthdays.json');
        if (!fs.existsSync(configPath)) {
            throw new Error(`配置文件不存在: ${configPath}`);
        }
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const globalDefaultDays = configData.globalSettings?.defaultAdvanceNoticeDays || [0]; // 默认只当天提醒
        const peopleRawList = configData.people || [];

        if (peopleRawList.length === 0) {
            console.log('⚠️ 配置文件中未找到人员列表。');
            return;
        }

        // 2. 合并配置：个人设置优先，否则使用全局默认
        const peopleList = peopleRawList.map(person => ({
            ...person,
            finalAdvanceDays: person.advanceNoticeDays || globalDefaultDays
        }));

        // 3. 检查每个人的每个提醒日
        const allReminders = [];
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()); // 归一化到当天0点

        for (const person of peopleList) {
            for (const advanceDay of person.finalAdvanceDays) {
                // 计算目标检查日期
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + advanceDay);

                const matches = checkBirthdayOnDate(targetDate, [person]); // 只检查这个人

                matches.forEach(match => {
                    let advanceText;
                    if (advanceDay === 0) {
                        advanceText = '**今天**';
                    } else {
                        advanceText = `**还有 ${advanceDay} 天**`;
                    }

                    const dateStr = match.solarDate.toLocaleDateString('zh-CN');
                    allReminders.push({
                        name: match.name,
                        advanceText,
                        type: match.type,
                        zodiac: match.zodiac,
                        targetDate: new Date(targetDate), // 复制日期对象
                        dateStr
                    });
                });
            }
        }

        // 4. 发送通知
        if (allReminders.length > 0) {
            // 按日期排序
            allReminders.sort((a, b) => a.targetDate - b.targetDate);

            // 构建Markdown消息
            let message = '🎂 **生日提醒**\n\n';
            allReminders.forEach(rem => {
                message += `👉 **${rem.name}** ${rem.advanceText}（${rem.dateStr}）过${rem.type}生日\n`;
                message += `   星座：${rem.zodiac}\n\n`;
            });
            message += '记得送上祝福哦！';

            console.log('发现生日提醒，准备发送消息...');
            console.log('消息内容:', message);

            // 发送到企业微信
            const result = await sendWecomMessage(message);
            console.log('✅ 企业微信消息发送结果:', result);
        } else {
            console.log('今天没有需要发送的生日提醒。');
        }

    } catch (error) {
        console.error('❌ 执行过程中发生错误:', error);
        process.exit(1); // 非零退出码表示失败，便于Actions识别
    }
}

// 如果直接运行此脚本（而非被require），则执行main函数
if (require.main === module) {
    main();
}

// 导出函数，便于测试
module.exports = {
    getZodiacSign,
    chineseLunarToNumber,
    checkBirthdayOnDate
};
