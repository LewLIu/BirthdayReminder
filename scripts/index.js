const fs = require('fs');
const path = require('path');
const { Lunar, Solar } = require('lunar-javascript');
const { sendWecomMessage } = require('./wecom-notifier.js');

// 获取星座
function getZodiacSign(month, day) {
    const dates = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 22, 22];
    const signs = ["摩羯座", "水瓶座", "双鱼座", "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座"];
    return (day < dates[month - 1]) ? signs[month - 1] : signs[month];
}

// 农历汉字转数字（增强版，支持“十月”、“十六日”等带单位格式）
function chineseLunarToNumber(chineseStr) {
    if (!chineseStr) return 0;
    
    // 移除可能存在的单位字符（月、日、号），只保留数字相关的汉字
    const pureStr = chineseStr.replace(/[月日号]/g, '').trim();

    const digitMap = {
        '正': 1, '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '十一': 11, '十二': 12,
        '冬': 11,
        '腊': 12,
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

    if (dayMap[pureStr] !== undefined) {
        return dayMap[pureStr];
    }
    if (digitMap[pureStr] !== undefined) {
        return digitMap[pureStr];
    }

    let num = 0;
    if (pureStr === '二十') {
        return 20;
    }
    if (pureStr.startsWith('廿')) {
        const secondChar = pureStr.substring(1);
        num = 20 + (digitMap[secondChar] || 0);
        return num;
    }
    if (pureStr.includes('十')) {
        const parts = pureStr.split('十');
        if (parts.length === 2) {
            const [tenPart, onePart] = parts;
            let tenVal = 1;
            if (tenPart !== '') tenVal = digitMap[tenPart] || 0;
            let oneVal = 0;
            if (onePart !== '') oneVal = digitMap[onePart] || 0;
            num = tenVal * 10 + oneVal;
        }
    } else {
        num = digitMap[pureStr] || 0;
    }

    if (num === 0) {
        num = parseInt(pureStr);
    }
    return isNaN(num) ? 1 : num;
}

function checkBirthdayOnDate(targetDate, peopleList) {
    const result = [];
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1; 
    const targetDay = targetDate.getDate();

    peopleList.forEach(person => {
        let isBirthday = false;
        let actualSolarDate = null;
        let zodiac = null;
        let displayDateStr = ''; // 新增：用于存储最终展示的日期字符串

        try {
            const [birthMonthStr, birthDayStr] = person.birthday.split('-').map(n => n.trim());

            if (person.birthdayType === 'solar') {
                // --- 公历处理逻辑 ---
                const solarMonth = parseInt(birthMonthStr);
                const solarDay = parseInt(birthDayStr);
                
                if (isNaN(solarMonth) || isNaN(solarDay)) return;
                
                isBirthday = (targetMonth === solarMonth && targetDay === solarDay);
                
                if (isBirthday) {
                    actualSolarDate = Solar.fromYmd(targetYear, solarMonth, solarDay);
                    // 公历计算星座
                    zodiac = getZodiacSign(actualSolarDate.getMonth(), actualSolarDate.getDay());
                    // 公历显示格式：YYYY-MM-DD
                    displayDateStr = actualSolarDate.toYmd();
                }

            } else if (person.birthdayType === 'lunar') {
                // --- 农历处理逻辑 ---
                const lunarMonth = chineseLunarToNumber(birthMonthStr);
                const lunarDay = chineseLunarToNumber(birthDayStr);

                // 使用目标年份，构建农历对象并转公历
                const lunarDate = Lunar.fromYmd(targetYear, lunarMonth, lunarDay);
                const solarDate = lunarDate.getSolar();

                isBirthday = (targetMonth === solarDate.getMonth() && targetDay === solarDate.getDay());

                if (isBirthday) {
                    actualSolarDate = solarDate; // 保留公历对象用于排序
                    
                    // 【修正1】农历生日不计算星座
                    zodiac = null; 
                    
                    // 【修正2】农历显示格式：中文农历（如：十月十六）
                    displayDateStr = lunarDate.getMonthInChinese() + "月" + lunarDate.getDayInChinese();
                }
            }

            if (isBirthday && actualSolarDate) {
                result.push({
                    name: person.name,
                    type: person.birthdayType === 'solar' ? '公历' : '农历',
                    zodiac: zodiac,
                    solarDate: actualSolarDate,
                    displayDate: displayDateStr // 将格式化好的日期传出去
                });
            }
        } catch (error) {
            // 忽略农历闰月/无效日期导致的转换错误
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

        const todayReminders = [];
        const advanceReminders = [];

        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        for (const person of peopleList) {
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

                    // 使用 checkBirthdayOnDate 中生成的格式化日期
                    const dateStr = match.displayDate;
                    
                    const reminderItem = {
                        name: match.name,
                        advanceText: advanceText,
                        type: match.type,
                        zodiac: match.zodiac,
                        targetDate: new Date(targetDate),
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
                    // 如果有星座才显示
                    let zodiacInfo = rem.zodiac ? ` | ${rem.zodiac}` : '';
                    message += `${rem.prefixEmoji} ${typeEmoji} ${rem.name} (${rem.dateStr}) ${rem.type}${zodiacInfo}\n`;
                });
                message += '\n';
            }

            if (advanceReminders.length > 0) {
                message += '📌 即将过生日：\n';
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
