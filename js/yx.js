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

let appConfig = {
    ver: 1,
    title: '一席调试',
    site: SITE,
    tabs: [
        { name: '演讲', ext: { id: 'speech' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let page = ext.page || 1;
    let id = ext.id || 'speech';

    const url = `${API_SITE}/${id}/?page=${page}&page_size=50&category_id=&order_by=0`;

    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const json = argsify(data);
        const list = json && json.data && json.data.items ? json.data.items : [];

        for (let i = 0; i < list.length; i++) {
            try {
                const item = list[i];
                if (!item) continue;
                const vid = item.id ? String(item.id) : '';
                const title = item.title ? String(item.title) : '';
                let cover = item.cover ? String(item.cover) : '';
                if (cover && cover.indexOf('//') === 0) cover = 'https:' + cover;
                let speaker = '';
                if (item.speak && typeof item.speak === 'object' && item.speak.name) speaker = String(item.speak.name);
                const time = item.time ? String(item.time) : '';
                cards.push({
                    vod_id: vid,
                    vod_name: title,
                    vod_pic: cover,
                    vod_remarks: speaker + (time ? ' · ' + time : ''),
                    ext: { id: vid, type: 0 },
                });
            } catch (e) {}
        }
    } catch (e) {}

    return jsonify({ list: cards });
}

// ★★★ 这个版本会把原始 JSON 直接显示在详情页的标题里 ★★★
async function getTracks(ext) {
    ext = argsify(ext);
    let id = ext.id;
    let type = ext.type || 0;

    try {
        const url = `${API_H5}/play_detail/?video_type=${type}&video_id=${id}&album_id=0`;
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const json = argsify(data);
        const base = (json && json.data && json.data.base_items) ? json.data.base_items : {};
        const videoUrls = base.video_url || [];

        // 把原始 JSON 转成字符串，放在 title 里
        const rawJson = JSON.stringify(videoUrls);

        // 从原始 JSON 里抓出所有 mp4/m3u8 链接
        let tracks = [];
        for (let i = 0; i < videoUrls.length; i++) {
            const v = videoUrls[i];
            if (v && v.video_url) {
                tracks.push({
                    name: v.type_name ? String(v.type_name) : ('清晰度' + v.type),
                    pan: '',
                    ext: { url: String(v.video_url) },
                });
            }
        }

        return jsonify({
            list: [{
                title: rawJson.substring(0, 200),  // 只显示前200字符
                tracks: tracks,
            }],
        });
    } catch (e) {
        return jsonify({
            list: [{
                title: '请求失败: ' + String(e.message),
                tracks: [],
            }],
        });
    }
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    const url = ext.url;
    if (!url) return jsonify({ urls: [] });

    return jsonify({
        urls: [String(url)],
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': SITE + '/',
            'Origin': SITE,
        }
    });
}

async function search(ext) {
    return jsonify({ list: [] });
}
