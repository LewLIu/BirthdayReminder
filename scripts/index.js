const fs = require('fs');
const path = require('path');
const { Lunar, Solar } = require('lunar-javascript');
const { sendWecomMessage } = require('./wecom-notifier.js');

function getZodiacSign(month, day) {
    const dates = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 22, 22];
    const signs = ["摩羯座", "水瓶座", "双鱼座", "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座"];
    return (day < dates[month - 1]) ? signs[month - 1] : signs[month];
}

function chineseLunarToNumber(chineseStr) {
    if (!chineseStr) return 0;
    
    // 【修复点1】移除可能存在的单位字符（月、日、号），只保留数字相关的汉字
    // 这样 "十月" 会变成 "十"，"十六日" 会变成 "十六"
    const pureStr = chineseStr.replace(/[月日号]/g, '').trim();

    const digitMap = {
        '正': 1, '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '十一': 11, '十二': 12,
        '冬': 11,
        '腊': 12,
        '廿': 20, '卅': 30
    };
    
    // 常用日期直接映射（包含初一到三十）
    const dayMap = {
        '初一': 1, '初二': 2, '初三': 3, '初四': 4, '初五': 5,
        '初六': 6, '初七': 7, '初八': 8, '初九': 9, '初十': 10,
        '十一': 11, '十二': 12, '十三': 13, '十四': 14, '十五': 15,
        '十六': 16, '十七': 17, '十八': 18, '十九': 19, '二十': 20,
        '廿一': 21, '廿二': 22, '廿三': 23, '廿四': 24, '廿五': 25,
        '廿六': 26, '廿七': 27, '廿八': 28, '廿九': 29, '三十': 30
    };

    // 1. 尝试直接匹配常用日期表
    if (dayMap[pureStr] !== undefined) {
        return dayMap[pureStr];
    }

    // 2. 尝试直接匹配数字表（如 "十" -> 10, "腊" -> 12）
    if (digitMap[pureStr] !== undefined) {
        return digitMap[pureStr];
    }

    let num = 0;
    
    // 3. 处理特殊的 "二十" (虽然dayMap已包含，但作为防御)
    if (pureStr === '二十') {
        return 20;
    }

    // 4. 处理 "廿X" 格式
    if (pureStr.startsWith('廿')) {
        const secondChar = pureStr.substring(1);
        num = 20 + (digitMap[secondChar] || 0);
        return num;
    }

    // 5. 处理 "十X" 或 "X十X" 格式
    if (pureStr.includes('十')) {
        const parts = pureStr.split('十');
        if (parts.length === 2) {
            const [tenPart, onePart] = parts;
            
            // 计算十位: 如果 '十' 前面为空，则默认为 1 (即10)，否则查找映射
            let tenVal = 1;
            if (tenPart !== '') {
                tenVal = digitMap[tenPart] || 0;
            }

            // 计算个位
            let oneVal = 0;
            if (onePart !== '') {
                oneVal = digitMap[onePart] || 0;
            }

            num = tenVal * 10 + oneVal;
        }
    } else {
        // 最后的尝试
        num = digitMap[pureStr] || 0;
    }

    // 6. 如果汉字解析失败，尝试直接解析阿拉伯数字
    if (num === 0) {
        num = parseInt(pureStr);
    }

    return isNaN(num) ? 1 : num;
}

function checkBirthdayOnDate(targetDate, peopleList) {
    const result = [];
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1; // JavaScript月份0-11，转为1-12
    const targetDay = targetDate.getDate();

    peopleList.forEach(person => {
        let isBirthday = false;
        let actualSolarDate = null;
        let zodiac = null;

        try {
            const [birthMonthStr, birthDayStr] = person.birthday.split('-').map(n => n.trim());

            if (person.birthdayType === 'solar') {
                const solarMonth = parseInt(birthMonthStr);
                const solarDay = parseInt(birthDayStr);
                if (isNaN(solarMonth) || isNaN(solarDay)) {
                    console.error(`人员 ${person.name} 的公历生日格式错误: ${person.birthday}`);
                    return;
                }
                isBirthday = (targetMonth === solarMonth && targetDay === solarDay);
                if (isBirthday) {
                    actualSolarDate = Solar.fromYmd(targetYear, solarMonth, solarDay);
                    zodiac = getZodiacSign(actualSolarDate.getMonth(), actualSolarDate.getDay());
                }
            } else if (person.birthdayType === 'lunar') {
                let lunarMonth, lunarDay;

                // 统一使用增强后的转换函数，它现在能处理 "10", "十", "十月" 等多种情况
                lunarMonth = chineseLunarToNumber(birthMonthStr);
                lunarDay = chineseLunarToNumber(birthDayStr);

                // 核心修正：使用目标检查日期对应的年份，将农历生日转换为公历日期
                // 注意：这里默认不处理闰月（即如果今年农历有闰十月，默认只提醒第一个十月，除非使用更复杂的配置）
                const lunarDate = Lunar.fromYmd(targetYear, lunarMonth, lunarDay);
                const solarDate = lunarDate.getSolar();

                // 关键比较：将转换得到的公历日期，与目标检查日期进行比较
                isBirthday = (targetMonth === solarDate.getMonth() && targetDay === solarDate.getDay());

                if (isBirthday) {
                    actualSolarDate = solarDate;
                    // 可以在这里计算该公历对应的星座
                    zodiac = getZodiacSign(solarDate.getMonth(), solarDate.getDay());
                }
            }

            if (isBirthday && actualSolarDate) {
                result.push({
                    name: person.name,
                    type: person.birthdayType === 'solar' ? '公历' : '农历',
                    zodiac: zodiac,
                    solarDate: actualSolarDate
                });
            }
        } catch (error) {
            // 某些年份可能没有农历30日，Lunar.fromYmd可能会报错，捕获以防崩溃
            // console.error(`处理人员 ${person.name} 的生日时出错:`, error.message);
        }
    });
    return result;
}

async function main() {
    console.log('开始执行生日检查...');
    const now = new Date();
    console.log('当前系统时间:', now.toLocaleString('zh-CN'));

    try {
        const configPath = path.join(__dirname, '../config/birthdays.json');
        if (!fs.existsSync(configPath)) {
            throw new Error(`配置文件不存在: ${configPath}`);
        }
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const globalDefaultDays = configData.globalSettings?.defaultAdvanceNoticeDays || [0];
        const peopleRawList = configData.people || [];

        if (peopleRawList.length === 0) {
            console.log('配置文件中未找到人员列表。');
            return;
        }

        const peopleList = peopleRawList.map(person => ({
            ...person,
            finalAdvanceDays: person.advanceNoticeDays || globalDefaultDays
        }));

        // 分别存储当天提醒和提前提醒
        const todayReminders = [];
        const advanceReminders = [];

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        for (const person of peopleList) {
            // 使用 Set 去重，防止配置了重复的提前天数导致重复提醒
            const distinctAdvanceDays = [...new Set(person.finalAdvanceDays)];
            
            for (const advanceDay of distinctAdvanceDays) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + advanceDay);

                const matches = checkBirthdayOnDate(targetDate, [person]);

                matches.forEach(match => {
                    let advanceText;
                    let prefixEmoji = '🎉';
                    if (advanceDay === 0) {
                        advanceText = '今天';
                        prefixEmoji = '🎂';
                    } else {
                        advanceText = `还有${advanceDay}天`;
                        prefixEmoji = '⏰';
                    }

                    const solar = match.solarDate;
                    const dateStr = `${solar.getYear()}-${solar.getMonth().toString().padStart(2, '0')}-${solar.getDay().toString().padStart(2, '0')}`;
                    
                    const reminderItem = {
                        name: match.name,
                        advanceText: advanceText,
                        type: match.type,
                        zodiac: match.zodiac,
                        targetDate: new Date(targetDate), // 用于排序
                        dateStr: dateStr,
                        advanceDay: advanceDay,
                        prefixEmoji: prefixEmoji
                    };

                    if (advanceDay === 0) {
                        todayReminders.push(reminderItem);
                    } else {
                        advanceReminders.push(reminderItem);
                    }
                });
            }
        }

        const allReminders = [...todayReminders, ...advanceReminders];

        if (allReminders.length > 0) {
            let message = '🎊 生日提醒 🎊\n\n';
            
            if (todayReminders.length > 0) {
                message += '🎁 今天过生日：\n';
                todayReminders.forEach(rem => {
                    let typeEmoji = rem.type === '公历' ? '📅' : '🌙';
                    let zodiacInfo = rem.zodiac ? ` | ${rem.zodiac}` : '';
                    message += `${rem.prefixEmoji} ${typeEmoji} ${rem.name} (${rem.dateStr}) ${rem.type}${zodiacInfo}\n`;
                });
                message += '\n';
            }

            if (advanceReminders.length > 0) {
                message += '📌 即将过生日：\n';
                // 提前提醒按日期排序
                advanceReminders.sort((a, b) => a.targetDate - b.targetDate);
                advanceReminders.forEach(rem => {
                    let typeEmoji = rem.type === '公历' ? '📅' : '🌙';
                    let zodiacInfo = rem.zodiac ? ` | ${rem.zodiac}` : '';
                    message += `${rem.prefixEmoji} ${typeEmoji} ${rem.name} ${rem.advanceText} (${rem.dateStr}) ${rem.type}${zodiacInfo}\n`;
                });
                message += '\n';
            }

            message += '💝 记得送上祝福哦！';

            console.log('发现生日提醒，准备发送消息...');
            const result = await sendWecomMessage(message);
            console.log('企业微信消息发送结果:', result);
        } else {
            console.log('今天没有需要发送的生日提醒。');
        }

    } catch (error) {
        console.error('执行过程中发生错误:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}

module.exports = {
    getZodiacSign,
    chineseLunarToNumber,
    checkBirthdayOnDate
};
