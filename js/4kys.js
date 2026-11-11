// ============================================================
// 4K影视 · 修复版（直连站点真实播放接口）
//   · 直接调用站点 /video/play 接口，拿到真实 m3u8 / mp4 直链
//   · WASM 签名算法已完整还原为纯 JS（不依赖宿主 WebAssembly）
//   · 不用第三方解析，失败时才回退到解析接口
// ============================================================

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36 QQBrowser/22.3.7007.400';
const SITE = 'https://www.4kvm.top';
const TOKEN_KEY = 'nbmovie2024secretkey';   // 站点令牌异或密钥
const K1 = 0x36, K2 = 0x5c;                 // 两级签名块异或密钥

let appConfig = {
    ver: 20261114,
    title: '4K影视',
    site: SITE,
    tabs: [
        // hasMore:false —— 站点分类页无分页，避免宿主无限拉第 2 页
        { name: '电影', ext: { id: 'movie', hasMore: false }, hasMore: false },
        { name: '电视剧', ext: { id: 'tv', hasMore: false }, hasMore: false },
        { name: '动漫', ext: { id: 'anime', hasMore: false }, hasMore: false }
    ],
};

async function getConfig() { return JSON.stringify(appConfig); }

// ==================== 基础工具 ====================

// 安全日志：XPTV 用 $print，其他宿主用 console；两者都没有也不能抛错
function log(msg) {
    try { if (typeof $print === 'function') { $print(String(msg)); return; } } catch (e) { }
    try { if (typeof console !== 'undefined' && console.log) console.log(String(msg)); } catch (e) { }
}

// ext 兼容：宿主可能传 JSON 字符串，也可能直接传对象
function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'string') {
        try { return JSON.parse(ext) || {}; } catch (e) { return {}; }
    }
    return ext;
}

// 纯 JS UTF-8 编码（部分宿主没有 TextEncoder）
function u8(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80) out.push(c);
        else if (c < 0x800) out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        else if (c >= 0xd800 && c <= 0xdbff && i + 1 < str.length) {
            const c2 = str.charCodeAt(++i);
            const cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
            out.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        } else out.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f));
    }
    return out;
}

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
function b64(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i += 3) {
        const b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
        s += B64[b0 >> 2];
        s += B64[((b0 & 3) << 4) | ((b1 === undefined ? 0 : b1) >> 4)];
        s += b1 === undefined ? '=' : B64[((b1 & 15) << 2) | ((b2 === undefined ? 0 : b2) >> 6)];
        s += b2 === undefined ? '=' : B64[b2 & 63];
    }
    return s;
}

function hex(bytes) {
    let s = '';
    for (let i = 0; i < bytes.length; i++) s += (bytes[i] < 16 ? '0' : '') + bytes[i].toString(16);
    return s;
}

// 标准 SHA-256（返回 32 字节数组）
const SHA_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
];

function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

function sha256(bytes) {
    const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const len = bytes.length;
    const total = ((len + 8) >> 6) + 1;
    const msg = new Array(total * 64);
    for (let i = 0; i < msg.length; i++) msg[i] = 0;
    for (let i = 0; i < len; i++) msg[i] = bytes[i];
    msg[len] = 0x80;
    const bits = len * 8;
    msg[total * 64 - 4] = (bits >>> 24) & 0xff;
    msg[total * 64 - 3] = (bits >>> 16) & 0xff;
    msg[total * 64 - 2] = (bits >>> 8) & 0xff;
    msg[total * 64 - 1] = bits & 0xff;

    const w = new Array(64);
    for (let blk = 0; blk < total; blk++) {
        const off = blk * 64;
        for (let i = 0; i < 16; i++) {
            w[i] = ((msg[off + i * 4] << 24) | (msg[off + i * 4 + 1] << 16) | (msg[off + i * 4 + 2] << 8) | msg[off + i * 4 + 3]) >>> 0;
        }
        for (let i = 16; i < 64; i++) {
            const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
            const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
            w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
        }
        let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
        for (let i = 0; i < 64; i++) {
            const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
            const ch = (e & f) ^ (~e & g);
            const t1 = (h + S1 + ch + SHA_K[i] + w[i]) >>> 0;
            const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
            const maj = (a & b) ^ (a & c) ^ (b & c);
            const t2 = (S0 + maj) >>> 0;
            h = g; g = f; f = e; e = (d + t1) >>> 0;
            d = c; c = b; b = a; a = (t1 + t2) >>> 0;
        }
        H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
        H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    const out = [];
    for (let i = 0; i < 8; i++) {
        out.push((H[i] >>> 24) & 0xff, (H[i] >>> 16) & 0xff, (H[i] >>> 8) & 0xff, H[i] & 0xff);
    }
    return out;
}

// ==================== 站点签名 / 令牌 ====================

// 固定 64 字节混淆块：secret 每字节异或 key，剩余补 key
function obfBlock(secret, key) {
    const src = u8(secret || '');
    const buf = [];
    for (let i = 0; i < 64; i++) buf.push(key);
    const n = Math.min(64, src.length);
    for (let i = 0; i < n; i++) buf[i] = src[i] ^ key;
    return buf;
}

/**
 * 站点签名 s = sha256( obf(v,0x5C) || sha256( obf(v,0x36) || "p:t:v" ) ) 前 32 位十六进制
 * p=dataid（播放 id）  t=毫秒时间戳  v=播放页 slug
 */
function makeSign(p, t, v) {
    const d1 = sha256(obfBlock(v, K1).concat(u8(p + ':' + t + ':' + v)));
    const d2 = sha256(obfBlock(v, K2).concat(d1));
    return hex(d2).slice(0, 32);
}

// 访问令牌 k = base64( userlink 与固定密钥循环异或 )
function makeToken(userlink) {
    if (!userlink || userlink === '0') return '0';
    const src = u8(userlink);
    const out = [];
    for (let i = 0; i < src.length; i++) out.push(src[i] ^ TOKEN_KEY.charCodeAt(i % TOKEN_KEY.length));
    return b64(out);
}

// ==================== 网络 ====================

async function httpGet(url, referer) {
    const headers = { 'User-Agent': UA, 'Accept-Language': 'zh-CN,zh;q=0.9' };
    if (referer) headers['Referer'] = referer;
    const res = await $fetch.get(url, { headers: headers });
    if (typeof res === 'string') return res;
    if (res && typeof res.data === 'string') return res.data;
    if (res && res.content) return String(res.content);
    if (res && res.body) return String(res.body);
    return '';
}

// ==================== HTML 解析工具 ====================

function stripTags(s) {
    return (s || '').replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
}

// 图片地址清洗：百度图床代理 / 协议相对地址 / 占位图
function cleanPic(raw) {
    if (!raw) return '';
    if (raw.indexOf('placeholder') >= 0 || raw.indexOf('.svg') >= 0) return '';
    let url = raw.replace(/&amp;/g, '&');
    if (url.indexOf('baidu.com/gimg') >= 0 || url.indexOf('baidu.com/it/') >= 0) {
        const m = url.match(/[?&]src=([^&]+)/);
        if (m) {
            url = decodeURIComponent(m[1]);
            if (url.indexOf('//') === 0) url = 'https:' + url;
            else if (url.indexOf('http') !== 0) url = 'https://' + url;
        }
    }
    if (url.indexOf('//') === 0) url = 'https:' + url;
    return url;
}

// 从一段 HTML 中解析影视卡片（列表页 / 搜索页结构略有差异，统一按 a 标签抓）
function parseCards(html) {
    const cards = [];
    const seen = {};
    const re = /<a\b[^>]*href="\/play\/([^"]+)"[^>]*data-vod="([^"]+)"[^>]*>([\s\S]*?)<\/a>/gi;
    let m;
    while ((m = re.exec(html)) !== null) {
        const slug = m[1];
        const vodId = m[2];
        const block = m[3];
        if (seen[vodId]) continue;
        seen[vodId] = 1;

        let name = '';
        const h3 = block.match(/<h3[^>]*>([\s\S]*?)<\/h3>/i);
        if (h3) name = stripTags(h3[1]);
        if (!name) {
            const alt = block.match(/alt="([^"]*)"/i);
            if (alt) name = stripTags(alt[1]);
        }
        if (!name) name = '未知影片';

        let pic = '';
        const img = block.match(/data-src="([^"]+)"/i) || block.match(/<img[^>]+src="([^"]+)"/i);
        if (img) pic = cleanPic(img[1]);

        cards.push({
            vod_id: vodId,
            vod_name: name,
            vod_pic: pic,
            vod_remarks: '',
            ext: { slug: slug, vodId: vodId }
        });
    }
    return cards;
}

// ==================== 分类列表 ====================

async function getCards(ext) {
    ext = parseExt(ext);
    const id = ext.id || 'movie';
    const page = parseInt(ext.page || 1, 10);

    // 站点分类页只有一页（无分页参数），第二页起直接返回空，避免重复刷出同一批
    if (page > 1) return JSON.stringify({ list: [], page: page });

    const url = `${SITE}/${id}`;
    try {
        const html = await httpGet(url);
        const cards = parseCards(html);
        return JSON.stringify({ list: cards, page: page });
    } catch (e) {
        log('列表解析失败: ' + e.message);
        return JSON.stringify({ list: [] });
    }
}

// ==================== 详情 / 选集 ====================

async function getTracks(ext) {
    ext = parseExt(ext);
    const slug = ext.slug || ext.id || ext.vodId;
    if (!slug) return JSON.stringify({ list: [] });

    const pageUrl = `${SITE}/play/${slug}`;
    try {
        const html = await httpGet(pageUrl);

        // 线路名称：episodeManager(线路数, 当前线路, [{lineName, episodeCount}, ...])
        let lineNames = [];
        const mgr = html.match(/episodeManager\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\[[\s\S]*?\])/);
        if (mgr) {
            const arr = mgr[3].match(/lineName\s*:\s*'([^']*)'/g) || [];
            lineNames = arr.map(x => (x.match(/'([^']*)'/) || [])[1] || '');
        }

        // 选集：href + data-line + data-episode + dataid
        const list = [];
        const re = /<a\b[^>]*href="\/play\/([^"]+)"([\s\S]*?)>/gi;
        let m;
        while ((m = re.exec(html)) !== null) {
            const tag = m[2];
            if (tag.indexOf('data-episode=') < 0) continue;
            const ep = (tag.match(/data-episode="(\d+)"/) || [])[1];
            const line = (tag.match(/data-line="(\d+)"/) || [])[1] || '1';
            const dataid = (tag.match(/dataid="(\d+)"/) || [])[1];
            if (!ep || !dataid) continue;
            list.push({ slug: m[1], line: parseInt(line, 10), ep: parseInt(ep, 10), dataid: dataid });
        }

        // 去重（同一线路同一集）
        const seen = {};
        const uniq = [];
        for (const it of list) {
            const key = it.line + '-' + it.ep;
            if (seen[key]) continue;
            seen[key] = 1;
            uniq.push(it);
        }
        if (!uniq.length) throw new Error('未解析到选集');

        // 按线路分组
        const lines = {};
        for (const it of uniq) {
            if (!lines[it.line]) lines[it.line] = [];
            lines[it.line].push(it);
        }

        const result = [];
        const lineNos = Object.keys(lines).map(Number).sort((a, b) => a - b);
        for (const no of lineNos) {
            const arr = lines[no].sort((a, b) => a.ep - b.ep);
            let lineName = lineNames[no - 1] || '';
            if (!lineName || lineName === 'alists' || lineName === 'default') lineName = '线路' + no;

            result.push({
                title: lineName,
                tracks: arr.map(it => ({
                    name: arr.length === 1 ? '正片' : '第' + it.ep + '集',
                    ext: { slug: it.slug, dataid: it.dataid, ep: it.ep, line: it.line }
                }))
            });
        }
        return JSON.stringify({ list: result });
    } catch (e) {
        log('选集解析失败: ' + e.message);
        return JSON.stringify({ list: [{ title: '线路1', tracks: [{ name: '正片', ext: { slug: slug, dataid: '' } }] }] });
    }
}

// ==================== 播放解析 ====================

/**
 * 调用站点真实接口取流：
 *   1. 打开播放页拿 userlink（访问令牌）与 nb-st（服务器时间基准）
 *   2. t = 本机时间 + (服务器时间 - 本机时间)，避免设备时钟偏差
 *   3. s = makeSign(dataid, t, slug)，k = makeToken(userlink)
 *   4. GET /video/play 得到 quality_urls
 */
async function fetchPlayUrls(slug, dataid) {
    const pageUrl = `${SITE}/play/${slug}`;
    const t0 = Date.now();
    const html = await httpGet(pageUrl);
    const t1 = Date.now();

    const userlink = (html.match(/userlink\s*:\s*'([^']*)'/) || [])[1] || '';
    if (!userlink) throw new Error('未取到访问令牌');

    // 服务器时间校准
    let offset = 0;
    const st = (html.match(/id="nb-st"[^>]*content="(\d+)"/) || [])[1];
    if (st) offset = parseInt(st, 10) - Math.round((t0 + t1) / 2);

    // 有的 ext 没有 dataid（旧数据），从页面里补
    if (!dataid) {
        const m = html.match(/dataid="(\d+)"/);
        if (m) dataid = m[1];
    }
    if (!dataid) throw new Error('缺少播放 id');

    const t = Date.now() + offset;
    const s = makeSign(dataid, t, slug);
    const k = makeToken(userlink);

    let urls = [];
    let picked = [];
    // 先要 1080P，没有片源再试 4K（q=1）
    for (const quality of ['1080', '1']) {
        const api = `${SITE}/video/play?p=${dataid}&v=${slug}&q=${quality}&s=${s}&t=${t}&k=${encodeURIComponent(k)}`;
        const txt = await httpGet(api, pageUrl);
        let json = null;
        try { json = JSON.parse(txt); } catch (err) { throw new Error('接口返回非 JSON'); }
        if (!json || json.code !== 200 || !json.data) throw new Error((json && json.message) || '接口返回异常');

        const list = json.data.quality_urls || [];
        for (const q of list) {
            // 站点用 "1"/"0"/空串表示该清晰度无片源（其播放器里也是这么过滤的）
            if (!q.url || q.url === '1' || q.url === '0' || q.url.indexOf('http') !== 0) continue;
            if (picked.indexOf(q.url) >= 0) continue;
            picked.push(q.url);
            urls.push(q.url);
            if (q.isvip || q.locked) log('注意：该片源为 VIP 内容，能否播放取决于站点会员状态');
        }
        if (urls.length) break;
    }
    if (!urls.length) throw new Error('该集暂无可用片源');
    return urls;
}

/**
 * XPTV 规范：urls 必须是「字符串数组」，headers 是与之对应的「数组」。
 * 返回对象数组（{name,url}）会被宿主转成 "[object Object]"，表现就是黑屏转圈。
 */
async function getPlayinfo(ext) {
    ext = parseExt(ext);
    const slug = ext.slug || ext.vodId;
    const dataid = ext.dataid || '';
    // 只给 UA：抖音系 CDN 的签名地址一旦附带 Referer/Origin 直接 403
    const hdrs = { 'User-Agent': UA };

    try {
        const urls = await fetchPlayUrls(slug, dataid);
        return JSON.stringify({
            urls: urls,
            headers: urls.map(function () { return hdrs; })
        });
    } catch (e) {
        log('直连解析失败: ' + e.message + '，回退解析接口');
        // 兜底：交给第三方解析站（能播则播，不能播至少不会卡在空 URL）
        const pageUrl = `${SITE}/play/${slug}`;
        const urls = [
            'https://jx.xmflv.com/?url=' + encodeURIComponent(pageUrl),
            'https://jx.aidouer.net/?url=' + encodeURIComponent(pageUrl)
        ];
        return JSON.stringify({
            urls: urls,
            headers: urls.map(function () { return { 'User-Agent': UA }; })
        });
    }
}

// ==================== 搜索 ====================

async function search(ext) {
    ext = parseExt(ext);
    const text = ext.text || ext.wd || '';
    if (!text) return JSON.stringify({ list: [] });

    try {
        const html = await httpGet(`${SITE}/search?q=${encodeURIComponent(text)}`);
        return JSON.stringify({ list: parseCards(html) });
    } catch (e) {
        log('搜索失败: ' + e.message);
        return JSON.stringify({ list: [] });
    }
}
