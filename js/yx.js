const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

const API_BASE = 'https://www.yixi.tv/v3/api/h5';
const SITE = 'https://www.yixi.tv';

let appConfig = {
    ver: 1,
    title: '一席',
    site: SITE,
    tabs: [
        { name: '演讲', ext: { id: '0' } },
        { name: '万象', ext: { id: '1' } },
        { name: '枝桠', ext: { id: '2' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

// 获取分类列表
async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let { id, page = 1 } = ext;

    // 尝试列表接口，如果失败则用搜索
    let url = `${API_BASE}/video_list/?type=${id}&page=${page}&size=20`;
    try {
        const { data } = await $fetch.get(url, {
            headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
        });
        const json = argsify(data);
        const list = json?.data?.list || json?.data?.items || [];

        list.forEach(item => {
            cards.push({
                vod_id: item.id,
                vod_name: item.title,
                vod_pic: item.video_cover,
                vod_remarks: item.video_duration || '',
                ext: { id: item.id, type: item.video_type ?? 0 },
            });
        });
    } catch (e) {
        $print('列表接口失败，尝试搜索: ' + e.message);
    }

    // 如果列表接口没数据，用搜索接口（空关键词可能返回全部）
    if (cards.length === 0) {
        url = `${API_BASE}/search/?keyword=&page=${page}&size=20`;
        try {
            const { data } = await $fetch.get(url, {
                headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
            });
            const json = argsify(data);
            const list = json?.data?.list || json?.data?.items || [];
            list.forEach(item => {
                cards.push({
                    vod_id: item.id,
                    vod_name: item.title,
                    vod_pic: item.video_cover,
                    vod_remarks: item.video_duration || '',
                    ext: { id: item.id, type: item.video_type ?? 0 },
                });
            });
        } catch (e) {
            $print('搜索接口失败: ' + e.message);
        }
    }

    return jsonify({ list: cards });
}

// 获取剧集（一席每场演讲只有一个视频，但可能有多清晰度）
async function getTracks(ext) {
    ext = argsify(ext);
    let id = ext.id;
    let type = ext.type ?? 0;

    let groups = [];
    let tracks = [];

    try {
        const url = `${API_BASE}/play_detail/?video_type=${type}&video_id=${id}&album_id=0`;
        const { data } = await $fetch.get(url, {
            headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
        });
        const json = argsify(data);
        const base = json?.data?.base_items || {};
        const videoUrls = base.video_url || [];

        // 一席通常提供标清、高清、超清三种，直接作为不同线路
        videoUrls.forEach(v => {
            if (v.video_url) {
                tracks.push({
                    name: v.type_name || `清晰度${v.type}`,
                    pan: '',
                    ext: { url: v.video_url },
                });
            }
        });

        // 如果没有视频地址，尝试用音频（一般不会）
        if (tracks.length === 0 && base.audio_url) {
            tracks.push({
                name: '音频',
                pan: '',
                ext: { url: base.audio_url },
            });
        }
    } catch (e) {
        $print('获取详情失败: ' + e.message);
    }

    if (tracks.length > 0) {
        groups.push({ title: '默认分组', tracks: tracks });
    }

    return jsonify({ list: groups });
}

// 播放地址直接返回
async function getPlayinfo(ext) {
    ext = argsify(ext);
    const url = ext.url;
    if (!url) return jsonify({ urls: [] });

    $print('播放地址: ' + url);
    return jsonify({
        urls: [url],
        headers: {
            'User-Agent': UA,
            'Referer': SITE + '/',
            'Origin': SITE,
        }
    });
}

// 搜索
async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);
    let page = ext.page || 1;

    const url = `${API_BASE}/search/?keyword=${text}&page=${page}&size=20`;
    try {
        const { data } = await $fetch.get(url, {
            headers: { 'User-Agent': UA, 'Referer': SITE + '/' }
        });
        const json = argsify(data);
        const list = json?.data?.list || json?.data?.items || [];
        list.forEach(item => {
            cards.push({
                vod_id: item.id,
                vod_name: item.title,
                vod_pic: item.video_cover,
                vod_remarks: item.video_duration || '',
                ext: { id: item.id, type: item.video_type ?? 0 },
            });
        });
    } catch (e) {
        $print('搜索失败: ' + e.message);
    }

    return jsonify({ list: cards });
}
