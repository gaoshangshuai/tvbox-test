const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const SITE = 'https://www.yixi.tv';
const API_SITE = 'https://www.yixi.tv/v3/api/site';
const API_H5 = 'https://www.yixi.tv/v3/api/h5';

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/speech/detail',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
    'Accept-Encoding': 'gzip, deflate, br',
    'Connection': 'keep-alive',
    'X-Requested-With': 'XMLHttpRequest',
    'sec-ch-ua': '"Chromium";v="131", "Not_A Brand";v="24"',
    'sec-ch-ua-mobile': '?0',
    'sec-ch-ua-platform': '"Windows"',
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
};

let appConfig = {
    ver: 1,
    title: '一席',
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

    const url = `${API_SITE}/${id}/?page=${page}&page_size=24`;

    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const json = argsify(data);
        let list = json?.data?.items || [];

        list.forEach(item => {
            let speakerName = '';
            if (item.speak && item.speak.name) speakerName = item.speak.name.trim();

            cards.push({
                vod_id: item.id,
                vod_name: item.title,
                vod_pic: item.cover,
                vod_remarks: speakerName + (item.time ? ' · ' + item.time : ''),
                ext: { id: item.id, type: 0 },
            });
        });
    } catch (e) {}

    return jsonify({ list: cards });
}

async function getTracks(ext) {
    ext = argsify(ext);
    let id = ext.id;
    let type = ext.type ?? 0;
    let groups = [];
    let tracks = [];

    try {
        const url = `${API_H5}/play_detail/?video_type=${type}&video_id=${id}&album_id=0`;
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const json = argsify(data);
        const base = json?.data?.base_items || {};
        const videoUrls = base.video_url || [];

        videoUrls.forEach(v => {
            if (v.video_url) {
                let playUrl = v.video_url.replace('http:', 'https:');
                tracks.push({
                    name: v.type_name || `清晰度${v.type}`,
                    pan: '',
                    ext: { url: playUrl },
                });
            }
        });

        if (tracks.length === 0 && base.audio_url) {
            tracks.push({ name: '音频', pan: '', ext: { url: base.audio_url } });
        }
    } catch (e) {}

    if (tracks.length > 0) {
        groups.push({ title: '默认分组', tracks: tracks });
    }

    return jsonify({ list: groups });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    const url = ext.url;
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
