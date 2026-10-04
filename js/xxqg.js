const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

const SITE = 'https://www.xuexi.cn';

// ★★★ 各频道的列表数据地址 ★★★
const CHANNEL_LIST = {
    first: 'https://www.xuexi.cn/lgdata/3m1erqf28h0r.json',
    movie: 'https://www.xuexi.cn/lgdata/18rkaul9h7l.json',
    people: 'https://www.xuexi.cn/lgdata/139qnt854nl.json',
    theory: 'https://www.xuexi.cn/lgdata/1oajo2vt47l.json',
    law: 'https://www.xuexi.cn/lgdata/14s4462g9nl.json',
    nature: 'https://www.xuexi.cn/lgdata/41gt3rsjd6l8.json',
    art: 'https://www.xuexi.cn/lgdata/1bfcj7u3pnl.json',
};

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
};

let appConfig = {
    ver: 1,
    title: '学习强国',
    site: SITE,
    tabs: [
        { name: '第一频道', ext: { id: 'first' } },
        { name: '影视频道', ext: { id: 'movie' } },
        { name: '人物频道', ext: { id: 'people' } },
        { name: '理论频道', ext: { id: 'theory' } },
        { name: '法治频道', ext: { id: 'law' } },
        { name: '自然频道', ext: { id: 'nature' } },
        { name: '文艺频道', ext: { id: 'art' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

// 获取列表（根据频道 ID 请求不同的 lgdata 地址）
async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let id = ext.id || 'first';

    // 根据频道 ID 取对应的列表地址
    const listUrl = CHANNEL_LIST[id];
    if (!listUrl) {
        $print('频道 ' + id + ' 的列表地址未配置');
        return jsonify({ list: [] });
    }

    try {
        const { data } = await $fetch.get(listUrl, { headers: HEADERS });
        const list = argsify(data);

        list.forEach(item => {
            let cover = item.thumbImage || '';
            if (cover && cover.indexOf('//') === 0) cover = 'https:' + cover;

            cards.push({
                vod_id: item.itemId || '',
                vod_name: item.title || '',
                vod_pic: cover,
                vod_remarks: item.showSource || item.publishTime || '',
                ext: { url: item.url, itemId: item.itemId },
            });
        });
    } catch (e) {
        $print('获取列表失败: ' + e.message);
    }

    return jsonify({ list: cards });
}

// 获取剧集：从详情页数据接口动态获取播放地址
async function getTracks(ext) {
    ext = argsify(ext);
    let itemId = ext.itemId;
    let tracks = [];

    if (!itemId) {
        tracks.push({ name: '缺少itemId', pan: '', ext: { url: '' } });
        return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
    }

    try {
        // 请求详情数据接口
        const apiUrl = `https://article.xuexi.cn/data/app/${itemId}.js`;
        const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
        const text = String(data);

        // 去掉 JSONP 外壳：callback({...})
        let jsonStr = text;
        const start = text.indexOf('(');
        const end = text.lastIndexOf(')');
        if (start !== -1 && end !== -1) {
            jsonStr = text.substring(start + 1, end);
        }

        const detail = argsify(jsonStr);

        // 从 video_storage_info 里找 m3u8 或 mp4 地址，优先选清晰度高的
        let bestUrl = '';
        let bestResolution = -1;

        if (detail && detail.videos && detail.videos.length > 0) {
            const videoInfo = detail.videos[0].video_storage_info || [];
            videoInfo.forEach(src => {
                if (src.normal && (src.normal.indexOf('.m3u8') > -1 || src.normal.indexOf('.mp4') > -1)) {
                    const res = parseInt(src.resolution) || 0;
                    if (res > bestResolution) {
                        bestResolution = res;
                        bestUrl = src.normal;
                    }
                }
            });
        }

        if (bestUrl) {
            tracks.push({ name: '播放', pan: '', ext: { url: bestUrl } });
        } else {
            tracks.push({ name: '未找到播放地址', pan: '', ext: { url: '' } });
        }

    } catch (e) {
        $print('获取播放地址失败: ' + e.message);
        tracks.push({ name: '获取失败', pan: '', ext: { url: '' } });
    }

    return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
}

// 播放
async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;
    if (!url) return jsonify({ urls: [] });

    return jsonify({
        urls: [url],
        headers: {
            'User-Agent': UA,
            'Referer': SITE + '/',
            'Origin': SITE,
        }
    });
}

async function search(ext) {
    return jsonify({ list: [] });
}
