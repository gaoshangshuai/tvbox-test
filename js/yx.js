const cheerio = createCheerio();

const SITE = 'https://www.yixi.tv';
const API_SITE = 'https://www.yixi.tv/v3/api/site';
const API_H5 = 'https://www.yixi.tv/v3/api/h5';

const HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPad; CPU OS 13_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/87.0.4280.77 Mobile/15E148 Safari/604.1',
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Authcode': '$yf&cpup8d%@s2h%',
    'Cookie': 'Hm_lvt_889adc48ccf05684181736d6e2e31ed4=1790986893; Hm_lpvt_889adc48ccf05684181736d6e2e31ed4=1790986893; HMACCOUNT=9F8659EE0B2375FA',
};

const VIDEO_TYPES = [0, 1, 2, 3, 7, 10, 17];

let appConfig = {
    ver: 1,
    title: '一席',
    site: SITE,
    tabs: [
        { name: '演讲', ext: { id: 'speech' } },
        { name: '记录', ext: { id: 'record' } },
        { name: '枝桠', ext: { id: 'zhiya' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

// ★ 安全解析 ext
function safeArgsify(ext) {
    if (ext == null) return {};
    if (typeof ext === 'object') return ext;
    try {
        return argsify(ext);
    } catch (e) {
        return {};
    }
}

// 列表（兼容多种分页参数名）
async function getCards(ext) {
    ext = safeArgsify(ext);
    let cards = [];
    let id = ext.id || 'speech';

    // ★ 兼容多种分页参数名
    let page = parseInt(ext.page || ext.pg || ext.pageNum || 1);
    if (isNaN(page) || page < 1) page = 1;

    const url = `${API_SITE}/${id}/?page=${page}&page_size=20&category_id=&order_by=0`;
    const seenTitles = new Set();

    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const json = argsify(data);
        const list = json && json.data && json.data.items ? json.data.items : [];

        for (let i = 0; i < list.length; i++) {
            try {
                const item = list[i];
                if (!item) continue;

                const title = item.title ? String(item.title).replace(/\s+/g, '').trim() : '';
                if (!title || seenTitles.has(title)) continue;

                const vid = item.id ? String(item.id) : '';
                if (!vid) continue;

                let cover = item.cover ? String(item.cover) : '';
                if (cover && cover.indexOf('//') === 0) cover = 'https:' + cover;

                let speaker = '';
                if (item.speak && typeof item.speak === 'object' && item.speak.name) {
                    speaker = String(item.speak.name);
                }

                const time = item.time ? String(item.time) : '';

                cards.push({
                    vod_id: vid,
                    vod_name: title,
                    vod_pic: cover,
                    vod_remarks: speaker + (time ? ' · ' + time : ''),
                    ext: { id: vid, type: -1 },
                });

                seenTitles.add(title);
            } catch (e) {}
        }

        $print('一席 ' + id + ' 第 ' + page + ' 页加载条数: ' + cards.length);

    } catch (e) {
        $print('一席列表失败: ' + e.message);
    }

    return jsonify({ list: cards });
}

// 尝试用某个 video_type 去拿视频
async function tryPlayDetail(vid, type) {
    try {
        const url = `${API_H5}/play_detail/?video_type=${type}&video_id=${vid}&album_id=0`;
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const json = argsify(data);
        const base = (json && json.data && json.data.base_items) ? json.data.base_items : {};
        const videoUrls = base.video_url || [];

        const validVideos = videoUrls
            .filter(v => v && v.video_url)
            .sort((a, b) => (b.type || 0) - (a.type || 0));

        if (validVideos.length > 0) {
            const best = validVideos[0];
            let playUrl = String(best.video_url).replace('http:', 'https:');
            let name = best.type_name ? String(best.type_name) : ('清晰度' + best.type);
            return { name: name, url: playUrl };
        }
    } catch (e) {}
    return null;
}

// 剧集：自动探测 video_type，找到第一个有视频地址的就用
async function getTracks(ext) {
    ext = safeArgsify(ext);
    let id = ext.id;
    let groups = [];
    let tracks = [];

    if (!id) {
        tracks.push({ name: '缺少视频ID', pan: '', ext: { url: '' } });
        return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
    }

    for (let i = 0; i < VIDEO_TYPES.length; i++) {
        const result = await tryPlayDetail(id, VIDEO_TYPES[i]);
        if (result) {
            tracks.push({ name: result.name, pan: '', ext: { url: result.url } });
            break;
        }
    }

    if (tracks.length > 0) {
        groups.push({ title: '默认分组', tracks: tracks });
    } else {
        tracks.push({ name: '未找到播放地址', pan: '', ext: { url: '' } });
        groups.push({ title: '默认分组', tracks: tracks });
    }

    return jsonify({ list: groups });
}

// 播放
async function getPlayinfo(ext) {
    ext = safeArgsify(ext);
    const url = ext.url;
    if (!url) return jsonify({ urls: [] });

    return jsonify({
        urls: [url],
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': SITE + '/',
            'Origin': SITE,
        }
    });
}

// 搜索（本地搜索：拉取三个分类的前 5 页数据进行过滤）
async function search(ext) {
    let extObj = safeArgsify(ext);

    // ★ 兼容多种关键词参数名
    let wd = '';
    if (typeof ext === 'string' && ext.indexOf('{') !== 0) {
        wd = ext.trim();
    } else if (extObj) {
        wd = (extObj.wd || extObj.key || extObj.text || extObj.keyword || extObj.WD || '').toString().trim();
    }
    try {
        const decoded = decodeURIComponent(wd);
        if (decoded && decoded !== wd) wd = decoded;
    } catch (e) {}

    $print('一席搜索关键词: [' + wd + ']');

    if (!wd) return jsonify({ list: [] });

    const categories = ['speech', 'record', 'zhiya'];
    const allCards = [];

    for (let ci = 0; ci < categories.length; ci++) {
        const catId = categories[ci];
        try {
            for (let page = 1; page <= 5; page++) {
                const url = `${API_SITE}/${catId}/?page=${page}&page_size=20&category_id=&order_by=0`;
                const { data } = await $fetch.get(url, { headers: HEADERS });
                const json = argsify(data);
                const list = json && json.data && json.data.items ? json.data.items : [];
                if (list.length === 0) break;

                list.forEach(item => {
                    if (!item) return;
                    const title = item.title ? String(item.title).replace(/\s+/g, '').trim() : '';
                    if (!title || title.indexOf(wd) === -1) return;

                    const vid = item.id ? String(item.id) : '';
                    if (!vid) return;

                    let cover = item.cover ? String(item.cover) : '';
                    if (cover && cover.indexOf('//') === 0) cover = 'https:' + cover;

                    let speaker = '';
                    if (item.speak && typeof item.speak === 'object' && item.speak.name) {
                        speaker = String(item.speak.name);
                    }

                    allCards.push({
                        vod_id: vid,
                        vod_name: title,
                        vod_pic: cover,
                        vod_remarks: speaker,
                        ext: { id: vid, type: -1 },
                    });
                });
            }
        } catch (e) {}
    }

    $print('一席搜索命中: ' + allCards.length);
    return jsonify({ list: allCards });
}
