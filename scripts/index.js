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

    if (dayMap[chineseStr] !== undefined) {
        return dayMap[chineseStr];
    }

    let num = 0;
    if (chineseStr === '二十') {
        return 20;
    }
    if (chineseStr.startsWith('廿')) {
        const secondChar = chineseStr.substring(1);
        num = 20 + (digitMap[secondChar] || 0);
        return num;
    }
    if (chineseStr.includes('十')) {
        const parts = chineseStr.split('十');
        if (parts.length === 2) {
            const [ten, one] = parts;
            num = (digitMap[ten] || 0) * 10 + (digitMap[one] || 0);
            if (num === 0) {
                num = digitMap[chineseStr] || 0;
            }
        }
    } else {
        num = digitMap[chineseStr] || 0;
    }

    if (num === 0) {
        num = parseInt(chineseStr);
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
        let zodiac = null; // 修改：默认不提供星座信息

        try {
            const [birthMonth, birthDay] = person.birthday.split('-').map(n => n.trim());

            if (person.birthdayType === 'solar') {
                // 公历生日：直接比较并提供星座
                const solarMonth = parseInt(birthMonth);
                const solarDay = parseInt(birthDay);
                if (isNaN(solarMonth) || isNaN(solarDay)) {
                    console.error(`人员 ${person.name} 的公历生日格式错误: ${person.birthday}`);
                    return;
                }
                isBirthday = (targetMonth === solarMonth && targetDay === solarDay);
                if (isBirthday) {
                    actualSolarDate = Solar.fromYmd(targetYear, solarMonth, solarDay);
                    // 公历生日明确，计算星座
                    zodiac = getZodiacSign(actualSolarDate.getMonth(), actualSolarDate.getDay());
                }
            } else if (person.birthdayType === 'lunar') {
                // 农历生日：转换为公历后再比较
                let lunarMonth, lunarDay;
                let lunarYear = targetYear; // 默认使用目标年份查找

                // 检查是否在配置中指定了农历年份（如“癸卯-十-廿二”）
                // 注意：当前配置文件格式仅支持“月-日”，此部分为预留逻辑。
                // 若需支持带年份的农历，需调整birthday字段格式或添加新字段。
                // 当前逻辑按无年份处理。

                if (isNaN(birthMonth)) {
                    lunarMonth = chineseLunarToNumber(birthMonth);
                } else {
                    lunarMonth = parseInt(birthMonth);
                }

                if (isNaN(birthDay)) {
                    lunarDay = chineseLunarToNumber(birthDay);
                } else {
                    lunarDay = parseInt(birthDay);
                }

                const lunarDate = Lunar.fromYmd(lunarYear, lunarMonth, lunarDay);
                const solarDate = lunarDate.getSolar();
                isBirthday = (targetMonth === solarDate.getMonth() + 1 && targetDay === solarDate.getDate());

                if (isBirthday) {
                    actualSolarDate = solarDate;
                    // 农历生日默认不提供星座。
                    // 如果未来配置支持指定农历年份（确定公历日期），则可在此计算zodiac。
                    // zodiac = getZodiacSign(actualSolarDate.getMonth(), actualSolarDate.getDay());
                }
            }

            if (isBirthday && actualSolarDate) {
                result.push({
                    name: person.name,
                    type: person.birthdayType === 'solar' ? '公历' : '农历',
                    zodiac: zodiac, // 公历生日有值，农历生日为null
                    solarDate: actualSolarDate
                });
            }
        } catch (error) {
            console.error(`处理人员 ${person.name} 的生日时出错:`, error.message);
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

        const allReminders = [];
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        for (const person of peopleList) {
            for (const advanceDay of person.finalAdvanceDays) {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + advanceDay);

                const matches = checkBirthdayOnDate(targetDate, [person]);

                matches.forEach(match => {
                    let advanceText;
                    if (advanceDay === 0) {
                        advanceText = '**今天**';
                    } else {
                        advanceText = `**还有 ${advanceDay} 天**`;
                    }

                    const solar = match.solarDate;
                    const dateStr = `${solar.getYear()}-${solar.getMonth().toString().padStart(2, '0')}-${solar.getDay().toString().padStart(2, '0')}`;
                    
                    allReminders.push({
                        name: match.name,
                        advanceText,
                        type: match.type,
                        zodiac: match.zodiac, // 可能为null
                        targetDate: new Date(targetDate),
                        dateStr
                    });
                });
            }
        }

        if (allReminders.length > 0) {
            allReminders.sort((a, b) => a.targetDate - b.targetDate);

            let message = '**生日提醒**\n\n';
            allReminders.forEach(rem => {
                // 公历生日显示星座，农历生日不显示
                let zodiacInfo = (rem.zodiac) ? `星座：${rem.zodiac}` : '';
                message += `**${rem.name}** ${rem.advanceText}（${rem.dateStr}）过${rem.type}生日\n`;
                if (zodiacInfo) {
                    message += `${zodiacInfo}\n`;
                }
                message += '\n'; // 统一空行
            });
            message += '记得送上祝福哦！';

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
