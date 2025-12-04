const fs = require('fs');
const path = require('path');
const { Lunar, Solar } = require('lunar-javascript');
const { sendWecomMessage } = require('./wecom-notifier.js');

function loadBirthdayConfig() {
    const configPath = path.join(__dirname, '../config/birthdays.json');
    const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
    return configData.people;
}

// 获取星座函数
function getZodiacSign(month, day) {
    const dates = [20, 19, 21, 20, 21, 22, 23, 23, 23, 24, 22, 22];
    const signs = ["摩羯座", "水瓶座", "双鱼座", "白羊座", "金牛座", "双子座", "巨蟹座", "狮子座", "处女座", "天秤座", "天蝎座", "射手座", "摩羯座"];
    return (day < dates[month-1]) ? signs[month-1] : signs[month];
}

// 检查指定日期（今日或未来某天）是否为某人的生日
function checkBirthdayOnDate(targetDate, peopleList) {
    const result = [];
    const targetYear = targetDate.getFullYear();
    const targetMonth = targetDate.getMonth() + 1;
    const targetDay = targetDate.getDate();

    peopleList.forEach(person => {
        const [birthMonth, birthDay] = person.birthday.split('-').map(n => isNaN(n) ? n : Number(n));
        let isBirthday = false;
        let actualSolarDate = null;

        if (person.birthdayType === 'solar') {
            isBirthday = (targetMonth === birthMonth && targetDay === birthDay);
            if(isBirthday) {
                actualSolarDate = Solar.fromYmd(targetYear, birthMonth, birthDay);
            }
        } else if (person.birthdayType === 'lunar') {
            // 农历处理：将配置的农历日期转换为当年的公历日期
            const lunarMonthStr = birthMonth;
            const lunarDayStr = birthDay;
            const lunarMonth = isNaN(lunarMonthStr) ? 
                ['正','二','三','四','五','六','七','八','九','十','十一','十二'].indexOf(lunarMonthStr) + 1 
                : Number(lunarMonthStr);
            const lunarDay = isNaN(lunarDayStr) ? 
                (lunarDayStr.startsWith('十') ? 10 + (['初十','十一','十二','十三','十四','十五','十六','十七','十八','十九'].indexOf(lunarDayStr)) : 
                 ['初一','初二','初三','初四','初五','初六','初七','初八','初九'].indexOf(lunarDayStr) + 1) 
                : Number(lunarDayStr);
            
            const lunarDate = Lunar.fromYmd(targetYear, lunarMonth, lunarDay);
            const solarDate = lunarDate.getSolar();
            isBirthday = (targetMonth === solarDate.getMonth() + 1 && targetDay === solarDate.getDate());
            if(isBirthday) {
                actualSolarDate = solarDate;
            }
        }

        if (isBirthday) {
            const zodiacSign = actualSolarDate ? getZodiacSign(actualSolarDate.getMonth() + 1, actualSolarDate.getDate()) : '未知';
            result.push({
                name: person.name,
                type: person.birthdayType,
                zodiac: zodiacSign
            });
        }
    });
    return result;
}

async function main() {
    console.log('开始执行生日检查...');
    const today = new Date();
    console.log('当前系统时间:', today.toLocaleString('zh-CN'));

    try {
        // === 新增：加载并合并配置逻辑 ===
        const configPath = path.join(__dirname, '../config/birthdays.json');
        const configData = JSON.parse(fs.readFileSync(configPath, 'utf8'));
        const globalDefaultDays = configData.globalSettings?.defaultAdvanceNoticeDays || [0];
        const peopleRawList = configData.people;

        // 为每个人确定最终使用的提前提醒天数
        const peopleList = peopleRawList.map(person => {
            return {
                ...person,
                // 如果个人有设置则用个人的，否则用全局默认的
                finalAdvanceDays: person.advanceNoticeDays || globalDefaultDays
            };
        });
        // === 配置加载结束 ===

        const allReminders = [];

        // 遍历逻辑更新：使用 finalAdvanceDays
        peopleList.forEach(person => {
            person.finalAdvanceDays.forEach(advanceDay => {
                const targetDate = new Date(today);
                targetDate.setDate(today.getDate() + advanceDay);
                const birthdayPeopleOnThatDay = checkBirthdayOnDate(targetDate, [person]);

                birthdayPeopleOnThatDay.forEach(birthdayPerson => {
                    // ... (生成提醒信息的逻辑保持不变)
                    allReminders.push({ /* ... */ });
                });
            });
        });

        // ... (后续发送消息的逻辑保持不变)

    } catch (error) {
        console.error('执行过程中发生错误:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    main();
}
module.exports = { loadBirthdayConfig, checkBirthdayOnDate, getZodiacSign };
