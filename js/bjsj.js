// 北京时间（btime.com）TVBox源 - 多栏目完整版（自动翻页，2018年起）
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const HOST = 'https://m.btime.com';
const API_HOST = 'https://app.api.btime.com';

// 栏目配置：name 显示名称，cid 频道ID，startYear 抓取起始年份（可选）
const CHANNELS = [
    { name: '笑动剧场',    cid: '505942298cb92ec1e2526b3427a8a229' },
    { name: '档案',        cid: 'b0dbe496b5671f33b955ca684f407c39', startYear: 2018 },
    { name: '电影时间',    cid: 'f1d1bbbfd7761c27037895204dff0e47', startYear: 2018 },
    { name: '警法目录',    cid: '37fcd1a658cfbdc1352cbc8ff09873aa', startYear: 2018 },
    { name: '红绿灯',      cid: 'f85876edb3ef92c6dff2503b732e0f4f', startYear: 2018 },
    { name: '我要当医生',  cid: '772ef58f0fa02da4b21bce85373b48be', startYear: 2018 },
    { name: '好戏连台',    cid: '7882118c41e6c783959d0149ccda135e', startYear: 2018 },
    { name: '现场说法',    cid: '91fc703fc802b3d9cbff6d1aecb9b3ed', startYear: 2018 },
    { name: '法治中国',    cid: 'eea441072736ea5126fe241584ddaf8e', startYear: 2018 },
    { name: '记忆',        cid: 'a828ebd3f2f9576b184ba56b51a0e7e7', startYear: 2018 },
    { name: '法治进行时',  cid: 'c3a9e0f80bc7de951583f00b81f363dc', startYear: 2018 },
    { name: '博物馆之城',  cid: '7c75a2f1f8de9514fcc68d68ee644704', startYear: 2018 },
    { name: '大戏看北京',  cid: 'bdf2bee25a9071a72ab29a28a7d4b77a', startYear: 2018 },
    { name: '味道掌门',    cid: 'e71fd140ff1fffc4666fedba9d32bd1b', startYear: 2018 }
];

// 默认抓取月份数（当未指定 startYear 时生效）
const DEFAULT_MONTHS = 12;
// 最大月份数保护，防止死循环
const MAX_MONTHS = 200;

let appConfig = {
    ver: 1,
    title: '北京时间',
    site: 'btime.com',
    tabs: CHANNELS.map(ch => ({
        name: ch.name,
        ext: { id: ch.cid, apiType: 'list', startYear: ch.startYear }
    }))
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

// 获取列表（自动翻页，抓取多个月份）
async function getCards(ext) {
    ext = JSON.parse(ext);
    // 所有数据在第一页请求时已经全部拉取完毕
    if (ext.page && ext.page > 1) {
        return JSON.stringify({ list: [], filter: [] });
    }

    const cid = ext.id;
    const startYear = ext.startYear;
    const headers = {
        'User-Agent': UA,
        'Referer': 'https://www.btime.com/',
        'Origin': 'https://www.btime.com',
        'Accept': '*/*'
    };

    // 生成月份列表
    const now = new Date();
    let year = now.getFullYear();
    let month = now.getMonth() + 1;
    const monthList = [];
    let count = 0;
    while (count < MAX_MONTHS) {
        if (startYear && year < startYear) break;
        monthList.push({ year: year, month: month < 10 ? '0' + month : '' + month });
        count++;
        if (!startYear && count >= DEFAULT_MONTHS) break;
        month--;
        if (month === 0) {
            month = 12;
            year--;
        }
    }

    let allItems = [];

    // 遍历每个月份
    for (const { year, month } of monthList) {
        const listId = `btv_${cid}_s0_${year}_${month}`;
        let lastId = '';
        let pageCount = 0;
        const MAX_PAGES_PER_MONTH = 10;

        while (pageCount < MAX_PAGES_PER_MONTH) {
            const url = `https://pc.api.btime.com/btimeweb/infoFlow?callback=jQuery&list_id=${listId}&refresh=${lastId ? '0' : '1'}&count=20&expands=pageinfo&last_id=${lastId}&_=${Date.now()}`;
            try {
                const { data } = await $fetch.get(url, { headers });
                // 去掉 JSONP 包裹
                let jsonStr = data;
                const jsonpMatch = data.match(/^[^\(]*\(([\s\S]*)\)[^\)]*$/);
                if (jsonpMatch) jsonStr = jsonpMatch[1];
                const json = JSON.parse(jsonStr);

                if (!json.data || !json.data.list || json.data.list.length === 0) break;

                const items = json.data.list;
                allItems = allItems.concat(items);

                // 更新游标
                const lastItem = items[items.length - 1];
                if (lastItem && lastItem.last) {
                    lastId = lastItem.last;
                } else {
                    break;
                }

                pageCount++;

                // 如果已经到达最后一页，退出
                if (json.data.page_curret >= json.data.page_total) break;

            } catch (e) {
                console.error(`获取 ${year}年${month}月 数据失败:`, e);
                break;
            }
        }
    }

    // 只保留 type === 3 的视频，并按 gid 去重
    const seen = {};
    const uniqueItems = [];
    allItems.forEach(item => {
        if (item.type !== 3) return;
        const gid = item.gid;
        if (!gid || seen[gid]) return;
        seen[gid] = true;
        uniqueItems.push(item);
    });

    // 按发布时间倒序排列（最新的在最前面）
    uniqueItems.sort((a, b) => {
        const dateA = a.data && a.data.pdate ? parseInt(a.data.pdate) : 0;
        const dateB = b.data && b.data.pdate ? parseInt(b.data.pdate) : 0;
        return dateB - dateA;
    });

    // 转换为 TVBox 卡片格式
    const list = uniqueItems.map(item => {
        const info = item.data || {};
        let vod_pic = '';
        if (info.covers_extends) {
            try {
                const extendObj = typeof info.covers_extends === 'string'
                    ? JSON.parse(info.covers_extends)
                    : info.covers_extends;
                vod_pic = extendObj['16:9'] || '';
            } catch (e) {}
        }
        if (!vod_pic && info.covers && info.covers.length > 0) vod_pic = info.covers[0];

        return {
            vod_id: item.gid || item.dupid || '',
            vod_name: info.title || '',
            vod_pic: vod_pic,
            vod_remarks: info.duration || info.pdate_str || '视频',
            vod_content: info.summary || '',
            ext: { id: item.gid, url: '' }
        };
    });

    console.log(`[${cid}] 共获取 ${list.length} 条节目`);
    return JSON.stringify({ list, filter: [] });
}

// 获取播放列表
async function getTracks(ext) {
    ext = JSON.parse(ext);
    return JSON.stringify({
        list: [{ title: '默认线路', tracks: [{ name: '播放', ext: { id: ext.id, url: ext.url } }] }]
    });
}

// 获取播放地址
async function getPlayinfo(ext) {
    ext = JSON.parse(ext);
    if (!ext.id) return JSON.stringify({ urls: [] });

    const headers = {
        'User-Agent': UA,
        'Referer': 'https://m.btime.com/',
        'Accept': '*/*'
    };

    let playUrl = '';
    try {
        const playApi = `${API_HOST}/video/play?os_type=h5&id=${ext.id}&_=${Date.now()}&callback=jsonp4`;
        const { data } = await $fetch.get(playApi, { headers });

        let jsonStr = data;
        const jsonpMatch = data.match(/^[^\(]*\(([\s\S]*)\)[^\)]*$/);
        if (jsonpMatch) jsonStr = jsonpMatch[1];
        const json = JSON.parse(jsonStr);

        if (json.data && json.data.video_stream && json.data.video_stream.length > 0) {
            playUrl = json.data.video_stream[0].stream_url;
        } else if (json.data && json.data.video_streams && json.data.video_streams.length > 0) {
            playUrl = json.data.video_streams[0][0].stream_url;
        }

        if (playUrl && playUrl.startsWith('http://')) {
            playUrl = playUrl.replace('http://', 'https://');
        }

    } catch (e) {
        console.error('获取播放地址失败:', e);
    }

    if (!playUrl) return JSON.stringify({ urls: [] });

    return JSON.stringify({
        urls: [playUrl],
        headers: [
            { 'User-Agent': UA },
            { 'Referer': 'https://m.btime.com/' }
        ]
    });
}

// 搜索（暂不实现）
async function search(ext) {
    return JSON.stringify({ list: [] });
}
