const cheerio = createCheerio();

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36';

// ================= 栏目配置 =================
const COLUMNS = {
    jrsf:    { name: '今日说法',     site: 'https://tv.cctv.com/lm/jrsf/',                    columnId: 'TOPC1451464665008914' },
    tianwang:{ name: '天网',         site: 'https://tv.cctv.com/lm/tianwang/',                columnId: '' },
    yixian:  { name: '一线',         site: 'https://tv.cctv.com/lm/yixian/',                  columnId: '' },
    dhc:     { name: '动画城',       site: 'http://tv.cctv.com/lm/dhc/index.shtml',           columnId: '' },
    dydhly:  { name: '第一动画乐园', site: 'https://tv.cctv.com/lm/dydhly/',                  columnId: '' },
    dhdfy:   { name: '动画大放映',   site: 'https://tv.cctv.com/lm/dhdfy/',                   columnId: '' },
};

// ================= 生成 tabs（去掉年份） =================
function buildTabs() {
    const tabs = [];
    for (const key in COLUMNS) {
        tabs.push({
            name: COLUMNS[key].name,
            ext: { id: key },
        });
    }
    return tabs;
}

let appConfig = {
    ver: 1,
    title: '央视栏目合集',
    site: 'https://tv.cctv.com/',
    tabs: buildTabs(),
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

// ================= 工具函数 =================
function stripJsonp(text) {
    const t = String(text).trim();
    if (t.startsWith('{') || t.startsWith('[')) return t;
    const s = t.indexOf('(');
    const e = t.lastIndexOf(')');
    if (s !== -1 && e > s) return t.substring(s + 1, e);
    return t;
}

function itemDate(item) {
    let t = item.time || item.fdate || item.focus_date || '';
    t = String(t).trim();
    let m = t.match(/(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    if (m) return m[1] + '-' + (m[2].length < 2 ? '0' + m[2] : m[2]) + '-' + (m[3].length < 2 ? '0' + m[3] : m[3]);
    m = t.match(/(\d{4})(\d{2})(\d{2})/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    return '';
}

function buildCard(item) {
    const title = item.title || '';
    if (title.indexOf('预告') !== -1) return null;

    let guid = '';
    const urlStr = item.url || '';
    const m = urlStr.match(/VIDE[A-Za-z0-9]+/);
    if (m) guid = m[0];

    return {
        vod_id: guid || urlStr,
        vod_name: title,
        vod_pic: item.image || item.thumbImage || '',
        vod_remarks: item.time || item.fdate || '',
        ext: { url: urlStr, guid: guid },
    };
}

// ================= Column ID 探测（带缓存） =================
const columnIdCache = {};

async function getColumnId(key) {
    const info = COLUMNS[key];
    if (!info) return '';

    if (info.columnId) return info.columnId;
    if (columnIdCache[key]) return columnIdCache[key];

    const headers = { 'User-Agent': UA, 'Referer': info.site };

    try {
        const { data } = await $fetch.get(info.site, { headers });
        const html = String(data);

        let m = html.match(/columnId\s*[:=]\s*["']([A-Za-z0-9]+)["']/i);
        if (!m) m = html.match(/(TOPC\d+)/);
        if (m && m[1]) {
            columnIdCache[key] = m[1];
            return m[1];
        }
    } catch (e) {}

    return '';
}

// ================= 分页请求（按栏目 + 页缓存） =================
const pageCache = new Map();

async function fetchListPage(key, page) {
    const ck = key + '_' + page;
    if (pageCache.has(ck)) return pageCache.get(ck);

    const cid = await getColumnId(key);
    if (!cid) return { list: [], total: 0 };

    const url = `https://api.cntv.cn/NewVideo/getVideoListByColumn?id=${cid}&n=20&sort=desc&p=${page}&mode=0&serviceId=tvcctv&cb=Callback`;
    const headers = { 'User-Agent': UA, 'Referer': COLUMNS[key].site };

    try {
        const { data } = await $fetch.get(url, { headers });
        const json = JSON.parse(stripJsonp(String(data)));
        const d = (json && json.data) || {};
        if (pageCache.size < 600) pageCache.set(ck, d);
        return d;
    } catch (e) {
        return { list: [], total: 0 };
    }
}

// ================= 列表 =================
async function getCards(ext) {
    ext = JSON.parse(ext);
    const key = ext.id || 'jrsf';
    const page = ext.page || 1;

    if (!COLUMNS[key]) {
        return JSON.stringify({ list: [], page: page, pagecount: 1 });
    }

    try {
        const data = await fetchListPage(key, page);
        const list = data.list || [];
        const cards = list.map(buildCard).filter(Boolean);

        const total = parseInt(data.total) || 0;
        const pagecount = total > 0 ? Math.max(1, Math.ceil(total / 20)) : 1;

        return JSON.stringify({ list: cards, page: page, pagecount: pagecount });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

// ================= 找 m3u8 =================
function findM3u8(obj) {
    if (!obj) return '';
    if (typeof obj === 'string') {
        if (obj.indexOf('.m3u8') !== -1) return obj;
        return '';
    }
    if (typeof obj !== 'object') return '';

    if (obj.hls_url) return obj.hls_url;
    if (obj.hlsUrl) return obj.hlsUrl;
    if (obj.m3u8) return obj.m3u8;

    for (const k in obj) {
        const v = findM3u8(obj[k]);
        if (v) return v;
    }
    return '';
}

// ================= 获取播放地址 =================
async function getTracks(ext) {
    ext = JSON.parse(ext);
    let tracks = [];
    let guid = ext.guid;
    let urlStr = ext.url;

    const HEADERS = {
        'User-Agent': UA,
        'Referer': 'https://tv.cctv.com/',
    };

    if (!guid && !urlStr) {
        tracks.push({ name: '缺少视频ID', ext: { url: '' } });
        return JSON.stringify({ list: [{ title: '默认分组', tracks: tracks }] });
    }

    let playUrl = '';
    let pureGuid = guid;
    if (guid && guid.indexOf('VIDE') === 0) pureGuid = guid.substring(4);

    if (!playUrl && guid) {
        const apiUrls = [
            `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${guid}`,
            `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${pureGuid}`,
            `https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${guid}&client=flash`,
        ];
        for (const apiUrl of apiUrls) {
            try {
                const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
                const json = JSON.parse(stripJsonp(String(data)));
                const found = findM3u8(json);
                if (found) { playUrl = found; break; }
            } catch (e) {}
        }
    }

    if (!playUrl && guid) {
        try {
            const { data } = await $fetch.get(`https://api.cntv.cn/video/getVideoInfo?guid=${guid}&client=flash`, { headers: HEADERS });
            const json = JSON.parse(stripJsonp(String(data)));
            const found = findM3u8(json);
            if (found) playUrl = found;
        } catch (e) {}
    }

    if (!playUrl && guid) {
        try {
            const { data } = await $fetch.get(`https://api.cntv.cn/NewVideo/getVideoUrl?videoId=${guid}&serviceId=tvcctv`, { headers: HEADERS });
            const json = JSON.parse(stripJsonp(String(data)));
            const found = findM3u8(json);
            if (found) playUrl = found;
        } catch (e) {}
    }

    if (!playUrl && urlStr) {
        try {
            const { data } = await $fetch.get(urlStr, { headers: HEADERS });
            const html = String(data);

            let m = html.match(/https?:\/\/[^\s"'<>\\]+\.m3u8[^\s"'<>\\]*/i);
            if (m) {
                playUrl = m[0];
            } else {
                const g = html.match(/guid\s*[:=]\s*["']([A-Za-z0-9]+)["']/);
                const p = html.match(/videoCenterId\s*[:=]\s*["']([A-Za-z0-9]+)["']/);
                const pid = (g && g[1]) || (p && p[1]);
                if (pid) {
                    try {
                        const r = await $fetch.get(`https://vdn.apps.cntv.cn/api/getHttpVideoInfo.do?pid=${pid}`, { headers: HEADERS });
                        const jj = JSON.parse(stripJsonp(String(r.data)));
                        const found = findM3u8(jj);
                        if (found) playUrl = found;
                    } catch (e) {}
                }
            }
        } catch (e) {}
    }

    if (playUrl) {
        playUrl = playUrl.replace(/^http:/, 'https:');
        tracks.push({ name: '播放', ext: { url: playUrl } });
    } else {
        tracks.push({ name: '嗅探播放', ext: { url: urlStr || '' } });
    }

    return JSON.stringify({ list: [{ title: '默认分组', tracks: tracks }] });
}

// ================= 播放 =================
async function getPlayinfo(ext) {
    ext = JSON.parse(ext);
    let url = ext.url;
    if (!url) return JSON.stringify({ urls: [] });

    if (url.indexOf('//') === 0) url = 'https:' + url;

    if (url.indexOf('.m3u8') === -1 && url.indexOf('.mp4') === -1) {
        return JSON.stringify({
            urls: [url],
            headers: {
                'User-Agent': UA,
                'Referer': 'https://tv.cctv.com/',
            },
            extra: { sniff: true },
        });
    }

    return JSON.stringify({
        urls: [url],
        headers: {
            'User-Agent': UA,
            'Referer': 'https://tv.cctv.com/',
        },
    });
}

// ================= 搜索 =================
async function search(ext) {
    ext = JSON.parse(ext);
    let cards = [];
    const text = ext.text;
    if (!text) return JSON.stringify({ list: [] });

    try {
        const searchUrl = `https://search.cctv.com/search.php?qtext=${encodeURIComponent(text)}&type=video&sort=relevance&page=1&pageSize=20`;
        const { data } = await $fetch.get(searchUrl, {
            headers: { 'User-Agent': UA, 'Referer': 'https://tv.cctv.com/' },
        });
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
