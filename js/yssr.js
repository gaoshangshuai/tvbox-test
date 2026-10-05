const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

const SITE = 'https://vod.cctv.cn';
// ★ 列表接口的模块 ID（央视动画片库）
const LIST_MODULE_ID = 'Page1547549227742425';
// ★ 接口基础 URL（两个接口共用）
const API_BASE = 'https://api.cctv.cn/childmobileinf/rest/cctv/cardgroups/share';

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
};

let appConfig = {
    ver: 1,
    title: '央视动画',
    site: SITE,
    tabs: [
        { name: '动画片库', ext: { id: 'cctv_anim' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

// ★ 通用请求函数：请求央视 cardgroups 接口，自动去 JSONP 外壳
async function fetchCardGroups(cardgroupId, pageSize) {
    const jsonParam = JSON.stringify({
        cardgroups: cardgroupId,
        paging: {
            page_size: pageSize || 10000,
            page_no: 1,
            last_id: ''
        }
    });
    const url = API_BASE + '?cb=fun&json=' + encodeURIComponent(jsonParam) + '&callback=__jp0';
    const { data } = await $fetch.get(url, { headers: HEADERS });
    let text = String(data);
    // 去掉 JSONP 外壳，例如 fun({...}) 或 __jp0({...})
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    if (start !== -1 && end !== -1) {
        text = text.substring(start + 1, end);
    }
    return argsify(text);
}

// ★★★ 获取动画列表 ★★★
async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];

    try {
        const json = await fetchCardGroups(LIST_MODULE_ID, 10000);

        // 遍历所有 cardgroups，收集所有动画
        let allItems = [];
        if (json.cardgroups) {
            json.cardgroups.forEach(group => {
                if (group.cards) {
                    allItems = allItems.concat(group.cards);
                }
            });
        }

        // 去重（按 id）
        const added = new Set();
        allItems.forEach(item => {
            let id = item.id || '';
            if (!id) return;
            if (added.has(id)) return;
            added.add(id);

            // 封面：photo.thumb，可能是 http 开头，也可能是 // 开头
            let cover = '';
            if (item.photo && item.photo.thumb) {
                cover = item.photo.thumb;
                if (cover.indexOf('//') === 0) cover = 'https:' + cover;
                else if (cover.indexOf('http') !== 0) cover = 'https://' + cover;
            }

            cards.push({
                vod_id: id,
                vod_name: item.title || '',
                vod_pic: cover,
                vod_remarks: item.tag || item.date || '',
                ext: { id: id },
            });
        });
    } catch (e) {
        $print('获取动画列表失败: ' + e.message);
    }

    return jsonify({ list: cards });
}

// ★★★ 获取剧集列表（含播放地址）★★★
async function getTracks(ext) {
    ext = argsify(ext);
    let id = ext.id;
    let tracks = [];

    if (!id) {
        tracks.push({ name: '缺少专辑ID', pan: '', ext: { url: '' } });
        return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
    }

    try {
        const json = await fetchCardGroups(id, 100000);

        // 剧集列表在第二个 cardgroup 里
        if (json.cardgroups && json.cardgroups.length > 1) {
            const episodeGroup = json.cardgroups[1];
            if (episodeGroup.cards) {
                episodeGroup.cards.forEach(item => {
                    let epName = item.title || '';
                    let playUrl = '';
                    if (item.video) {
                        // 优先高清 url_hd，其次标清 url
                        playUrl = item.video.url_hd || item.video.url || '';
                    }
                    if (playUrl) {
                        // HTTP 转 HTTPS，避免部分客户端混合内容拦截
                        playUrl = playUrl.replace(/^http:/, 'https:');
                        tracks.push({ name: epName, pan: '', ext: { url: playUrl } });
                    }
                });
            }
        }

        if (tracks.length === 0) {
            tracks.push({ name: '未找到剧集', pan: '', ext: { url: '' } });
        }
    } catch (e) {
        $print('获取剧集失败: ' + e.message);
        tracks.push({ name: '获取失败', pan: '', ext: { url: '' } });
    }

    return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
}

// ★★★ 播放 ★★★
async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;
    if (!url) return jsonify({ urls: [] });
    return jsonify({
        urls: [url],
        headers: {
            'User-Agent': UA,
            'Referer': SITE + '/',
        }
    });
}

async function search(ext) {
    return jsonify({ list: [] });
}
