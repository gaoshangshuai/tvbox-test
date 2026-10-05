const cheerio = createCheerio();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

const COLUMN_ID = 'TOPC1451464665008914';

const API_LIST = `https://api.cntv.cn/NewVideo/getVideoListByColumn?id=${COLUMN_ID}&n=20&sort=desc&p={page}&mode=0&serviceId=tvcctv`;

const HEADERS = {
    'User-Agent': UA,
    'Referer': 'https://tv.cctv.com/lm/jrsf/',
};

let appConfig = {
    ver: 1,
    title: '今日说法',
    site: 'https://tv.cctv.com/lm/jrsf/',
    tabs: [
        { name: '全部视频', ext: { id: 'all' } },
    ],
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

// ★★★ 列表 ★★★
async function getCards(ext) {
    ext = JSON.parse(ext);
    let cards = [];
    let page = ext.page || 1;

    const url = API_LIST.replace('{page}', page) + '&cb=Callback';

    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        let text = String(data);

        const start = text.indexOf('(');
        const end = text.lastIndexOf(')');
        if (start !== -1 && end !== -1) {
            text = text.substring(start + 1, end);
        }

        const json = JSON.parse(text);

        let list = [];
        if (json && json.data && json.data.list) {
            list = json.data.list;
        }

        list.forEach((item) => {
            const title = item.title || '';
            if (title.indexOf('预告') !== -1) return;

            let guid = '';
            const urlStr = item.url || '';
            const m = urlStr.match(/VIDE[A-Za-z0-9]+/);
            if (m) guid = m[0];

            cards.push({
                vod_id: guid || urlStr,
                vod_name: title,
                vod_pic: item.image || item.thumbImage || '',
                vod_remarks: item.time || item.fdate || '',
                ext: { url: urlStr, guid: guid },
            });
        });

        let total = 0;
        if (json && json.data && json.data.total) total = parseInt(json.data.total);
        const pagecount = Math.max(1, Math.ceil(total / 20));

        return JSON.stringify({ list: cards, page: page, pagecount: pagecount });

    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

// ★★★ 工具：去掉 JSONP 外壳 ★★★
function stripJsonp(text) {
    const s = text.indexOf('(');
    const e = text.lastIndexOf(')');
    if (s !== -1 && e !== -1) return text.substring(s + 1, e);
    return text;
}

// ★★★ 工具：从 JSON 对象里递归找 m3u8 ★★★
function findM3u8(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') {
        if (obj.indexOf('.m3u8') !== -1) return obj;
        return '';
    }
    if (typeof obj !== 'object') return '';

    // 直接字段
    if (obj.hls_url) return obj.hls_url;
    if (obj.hlsUrl) return obj.hlsUrl;
    if (obj.m3u8) return obj.m3u8;

    for (const k in obj) {
        const v = findM3u8(obj[k]);
        if (v) return v;
    }
    return '';
}

// ★★★ 获取播放地址（多接口尝试）★★★
async function getTracks(ext) {
    ext = JSON.parse(ext);
    let tracks = [];
    let guid = ext.guid;
    let urlStr = ext.url;

    if (!guid && !urlStr) {
        tracks.push({ name: '缺少视频ID', ext: { url: '' } });
        return JSON.stringify({ list: [{ title: '默认分组', tracks: tracks }] });
    }

    let playUrl = '';

    // 去掉 VIDE 前缀，央视某些接口用纯 GUID
    let pureGuid = guid;
    if (guid && guid.indexOf('VIDE') === 0) pureGuid = guid.substring(4);

    // ★ 接口1：getHttpVideoInfo.do（最常用）
    if (!playUrl && guid) {
        const apiUrls = [
            `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${guid}`,
            `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${pureGuid}`,
            `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${guid}&client=flash`,
        ];
        for (const apiUrl of apiUrls) {
            try {
                const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
                const text = String(data);
                const json = JSON.parse(stripJsonp(text));
                const found = findM3u8(json);
                if (found) { playUrl = found; break; }
            } catch (e) {}
        }
    }

    // ★ 接口2：api.cntv.cn/video/getVideoInfo
    if (!playUrl && guid) {
        const apiUrl = `https://api.cntv.cn/video/getVideoInfo?guid=${guid}&client=flash`;
        try {
            const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
            const json = JSON.parse(stripJsonp(String(data)));
            const found = findM3u8(json);
            if (found) playUrl = found;
        } catch (e) {}
    }

    // ★ 接口3：api.cntv.cn/NewVideo/getVideoUrl
    if (!playUrl && guid) {
        const apiUrl = `https://api.cntv.cn/NewVideo/getVideoUrl?videoId=${guid}&serviceId=tvcctv`;
        try {
            const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
            const json = JSON.parse(stripJsonp(String(data)));
            const found = findM3u8(json);
            if (found) playUrl = found;
        } catch (e) {}
    }

    // ★ 接口4：请求详情页，从 HTML 里提取
    if (!playUrl && urlStr) {
        try {
            const { data } = await $fetch.get(urlStr, { headers: HEADERS });
            const html = String(data);

            // 优先找 m3u8 完整 URL
            let m = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
            if (m) {
                playUrl = m[0];
            } else {
                // 找页面里出现的 guid/pid
                const g = html.match(/guid\s*[:=]\s*["']([A-Za-z0-9]+)["']/);
                const p = html.match(/videoCenterId\s*[:=]\s*["']([A-Za-z0-9]+)["']/);
                const pid = (g && g[1]) || (p && p[1]);
                if (pid) {
                    try {
                        const apiUrl = `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${pid}`;
                        const r = await $fetch.get(apiUrl, { headers: HEADERS });
                        const jj = JSON.parse(stripJsonp(String(r.data)));
                        const found = findM3u8(jj);
                        if (found) playUrl = found;
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }

    // ★ 输出结果
    if (playUrl) {
        playUrl = playUrl.replace(/^http:/, 'https:');
        tracks.push({ name: '播放', ext: { url: playUrl } });
    } else {
        // 兜底：把原始页面返回给播放器嗅探
        tracks.push({ name: '嗅探播放', ext: { url: urlStr || '' } });
    }

    return JSON.stringify({ list: [{ title: '默认分组', tracks: tracks }] });
}

// ★★★ 播放 ★★★
async function getPlayinfo(ext) {
    ext = JSON.parse(ext);
    let url = ext.url;
    if (!url) return JSON.stringify({ urls: [] });

    if (url.indexOf('//') === 0) url = 'https:' + url;

    // 如果是新闻详情页，返回嗅探
    if (url.indexOf('.m3u8') === -1 && url.indexOf('.mp4') === -1) {
        return JSON.stringify({
            urls: [url],
            headers: {
                'User-Agent': UA,
                'Referer': 'https://tv.cctv.com/',
            },
            extra: { sniff: true }
        });
    }

    return JSON.stringify({
        urls: [url],
        headers: {
            'User-Agent': UA,
            'Referer': 'https://tv.cctv.com/',
        }
    });
}

// ★★★ 搜索 ★★★
async function search(ext) {
    ext = JSON.parse(ext);
    let cards = [];
    const text = ext.text;
    if (!text) return JSON.stringify({ list: [] });

    try {
        const searchUrl = `https://search.cctv.com/search.php?qtext=${encodeURIComponent(text)}&type=video&sort=relevance&page=1&pageSize=20`;
        const { data } = await $fetch.get(searchUrl, { headers: HEADERS });
        const $ = cheerio.load(data);

        $('div.outer a').each((_, el) => {
            const href = $(el).attr('href');
            const title = $(el).text().trim();
            if (href && title && href.indexOf('cctv.com') !== -1) {
                const m = href.match(/VIDE[A-Za-z0-9]+/);
                if (m) {
                    cards.push({
                        vod_id: m[0],
                        vod_name: title,
                        vod_pic: '',
                        vod_remarks: '',
                        ext: { url: href, guid: m[0] },
                    });
                }
            }
        });
    } catch (e) {}

    return JSON.stringify({ list: cards });
}
