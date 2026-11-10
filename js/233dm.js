const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

let appConfig = {
    ver: 3,
    title: '233动漫',
    // 默认主域名（失效会自动切备用域名）
    site: 'https://www.233dm.com',
    tabs: [
        { name: '日漫', ext: { id: '1' } },
        { name: '国漫', ext: { id: '2' } },
        { name: '动画', ext: { id: '5' } },
        { name: '剧场', ext: { id: '24' } },
        { name: '特摄', ext: { id: '4' } },
        { name: '美漫', ext: { id: '3' } },
    ],
};

// 备用域名列表（来自网站底部的防走丢列表）
const backupSites = [
    'https://www.166dm.com',
    'https://www.661dm.com',
    'https://www.acg2day.com',
    'https://www.788dm.com',
    'https://www.jiandandm.com',
    'https://bgm1.cc'
];

// 取任意 URL 的站点根（不依赖全局 appConfig.site，避免运行时模块重置导致拼出死链）
function siteOf(u) {
    const m = String(u || '').match(/^https?:\/\/[^\/]+/i);
    return m ? m[0] : appConfig.site;
}
function pathOf(u) {
    const m = String(u || '').match(/^https?:\/\/[^\/]+(\/.*)$/i);
    return m ? m[1] : String(u || '');
}
// 原站点优先，其后依次为备用域名
function siteCandidates(u) {
    const first = siteOf(u);
    const list = [first];
    for (const s of backupSites) if (s !== first) list.push(s);
    return list;
}
// 只编码非 ASCII 字符（避免 encodeURI 二次编码已有的 %XX）
function encodeNonAscii(u) {
    return String(u || '').replace(/[^\x00-\x7F]/g, c => encodeURIComponent(c));
}

// ==================== 纯 JS AES-128-CBC 解密（无依赖） ====================
// 精品线路：v2player 播放器把真实直链 AES 加密内嵌在页面里
function _b64ToBytes(s) {
    const T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
    s = String(s).replace(/[^A-Za-z0-9+/]/g, '');
    const out = [];
    let bits = 0, acc = 0;
    for (let i = 0; i < s.length; i++) {
        acc = (acc << 6) | T.indexOf(s[i]);
        bits += 6;
        if (bits >= 8) { bits -= 8; out.push((acc >> bits) & 0xff); }
    }
    return out;
}
function _hexToBytes(h) {
    const out = [];
    for (let i = 0; i < h.length; i += 2) out.push(parseInt(h.substr(i, 2), 16));
    return out;
}
const _SBOX = [
0x63,0x7c,0x77,0x7b,0xf2,0x6b,0x6f,0xc5,0x30,0x01,0x67,0x2b,0xfe,0xd7,0xab,0x76,
0xca,0x82,0xc9,0x7d,0xfa,0x59,0x47,0xf0,0xad,0xd4,0xa2,0xaf,0x9c,0xa4,0x72,0xc0,
0xb7,0xfd,0x93,0x26,0x36,0x3f,0xf7,0xcc,0x34,0xa5,0xe5,0xf1,0x71,0xd8,0x31,0x15,
0x04,0xc7,0x23,0xc3,0x18,0x96,0x05,0x9a,0x07,0x12,0x80,0xe2,0xeb,0x27,0xb2,0x75,
0x09,0x83,0x2c,0x1a,0x1b,0x6e,0x5a,0xa0,0x52,0x3b,0xd6,0xb3,0x29,0xe3,0x2f,0x84,
0x53,0xd1,0x00,0xed,0x20,0xfc,0xb1,0x5b,0x6a,0xcb,0xbe,0x39,0x4a,0x4c,0x58,0xcf,
0xd0,0xef,0xaa,0xfb,0x43,0x4d,0x33,0x85,0x45,0xf9,0x02,0x7f,0x50,0x3c,0x9f,0xa8,
0x51,0xa3,0x40,0x8f,0x92,0x9d,0x38,0xf5,0xbc,0xb6,0xda,0x21,0x10,0xff,0xf3,0xd2,
0xcd,0x0c,0x13,0xec,0x5f,0x97,0x44,0x17,0xc4,0xa7,0x7e,0x3d,0x64,0x5d,0x19,0x73,
0x60,0x81,0x4f,0xdc,0x22,0x2a,0x90,0x88,0x46,0xee,0xb8,0x14,0xde,0x5e,0x0b,0xdb,
0xe0,0x32,0x3a,0x0a,0x49,0x06,0x24,0x5c,0xc2,0xd3,0xac,0x62,0x91,0x95,0xe4,0x79,
0xe7,0xc8,0x37,0x6d,0x8d,0xd5,0x4e,0xa9,0x6c,0x56,0xf4,0xea,0x65,0x7a,0xae,0x08,
0xba,0x78,0x25,0x2e,0x1c,0xa6,0xb4,0xc6,0xe8,0xdd,0x74,0x1f,0x4b,0xbd,0x8b,0x8a,
0x70,0x3e,0xb5,0x66,0x48,0x03,0xf6,0x0e,0x61,0x35,0x57,0xb9,0x86,0xc1,0x1d,0x9e,
0xe1,0xf8,0x98,0x11,0x69,0xd9,0x8e,0x94,0x9b,0x1e,0x87,0xe9,0xce,0x55,0x28,0xdf,
0x8c,0xa1,0x89,0x0d,0xbf,0xe6,0x42,0x68,0x41,0x99,0x2d,0x0f,0xb0,0x54,0xbb,0x16];
const _SBOX_INV = new Array(256);
for (let _i = 0; _i < 256; _i++) _SBOX_INV[_SBOX[_i]] = _i;
const _RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function _xtime(a) { return ((a << 1) ^ ((a & 0x80) ? 0x1b : 0)) & 0xff; }
function _mul(a, b) {
    let r = 0;
    while (b) { if (b & 1) r ^= a; a = _xtime(a); b >>= 1; }
    return r & 0xff;
}
function _keyExpansion128(key) {
    const w = [];
    for (let i = 0; i < 4; i++) w.push([key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]]);
    for (let i = 4; i < 44; i++) {
        let t = w[i - 1].slice();
        if (i % 4 === 0) {
            t = [_SBOX[t[1]] ^ _RCON[i / 4 - 1], _SBOX[t[2]], _SBOX[t[3]], _SBOX[t[0]]];
        }
        w.push([w[i - 4][0] ^ t[0], w[i - 4][1] ^ t[1], w[i - 4][2] ^ t[2], w[i - 4][3] ^ t[3]]);
    }
    return w;
}
function _decryptBlock(block, w) {
    const s = block.slice();
    const addRoundKey = (round) => {
        for (let c = 0; c < 4; c++)
            for (let r = 0; r < 4; r++)
                s[c * 4 + r] ^= w[round * 4 + c][r];
    };
    addRoundKey(10);
    for (let round = 9; round >= 1; round--) {
        for (let r = 1; r < 4; r++) {
            const row = [];
            for (let c = 0; c < 4; c++) row.push(s[c * 4 + r]);
            for (let c = 0; c < 4; c++) s[c * 4 + r] = row[(c - r + 4) % 4];
        }
        for (let i = 0; i < 16; i++) s[i] = _SBOX_INV[s[i]];
        addRoundKey(round);
        for (let c = 0; c < 4; c++) {
            const a = [s[c * 4], s[c * 4 + 1], s[c * 4 + 2], s[c * 4 + 3]];
            s[c * 4]     = _mul(a[0], 14) ^ _mul(a[1], 11) ^ _mul(a[2], 13) ^ _mul(a[3], 9);
            s[c * 4 + 1] = _mul(a[0], 9)  ^ _mul(a[1], 14) ^ _mul(a[2], 11) ^ _mul(a[3], 13);
            s[c * 4 + 2] = _mul(a[0], 13) ^ _mul(a[1], 9)  ^ _mul(a[2], 14) ^ _mul(a[3], 11);
            s[c * 4 + 3] = _mul(a[0], 11) ^ _mul(a[1], 13) ^ _mul(a[2], 9)  ^ _mul(a[3], 14);
        }
    }
    for (let r = 1; r < 4; r++) {
        const row = [];
        for (let c = 0; c < 4; c++) row.push(s[c * 4 + r]);
        for (let c = 0; c < 4; c++) s[c * 4 + r] = row[(c - r + 4) % 4];
    }
    for (let i = 0; i < 16; i++) s[i] = _SBOX_INV[s[i]];
    addRoundKey(0);
    return s;
}
// 手工 UTF-8 解码（部分 JS 引擎没有 escape）
function _utf8Decode(bytes) {
    let str = '', i = 0;
    while (i < bytes.length) {
        const b = bytes[i++];
        if (b < 0x80) str += String.fromCharCode(b);
        else if (b >= 0xc0 && b < 0xe0) str += String.fromCharCode(((b & 0x1f) << 6) | (bytes[i++] & 0x3f));
        else if (b >= 0xe0 && b < 0xf0) str += String.fromCharCode(((b & 0x0f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f));
        else if (b >= 0xf0) {
            let cp = ((b & 0x07) << 18) | ((bytes[i++] & 0x3f) << 12) | ((bytes[i++] & 0x3f) << 6) | (bytes[i++] & 0x3f);
            cp -= 0x10000;
            str += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        } else str += String.fromCharCode(b);
    }
    return str;
}
function aesCbcDecrypt(b64Data, keyStr, ivHex) {
    const data = _b64ToBytes(b64Data);
    const key = [];
    for (let i = 0; i < 16; i++) key.push(keyStr.charCodeAt(i) & 0xff);
    const iv = _hexToBytes(ivHex);
    const w = _keyExpansion128(key);
    const out = [];
    let prev = iv.slice();
    for (let off = 0; off + 16 <= data.length; off += 16) {
        const blk = data.slice(off, off + 16);
        const dec = _decryptBlock(blk, w);
        for (let i = 0; i < 16; i++) out.push(dec[i] ^ prev[i]);
        prev = blk;
    }
    if (out.length) {
        const pad = out[out.length - 1];
        if (pad >= 1 && pad <= 16) out.length = out.length - pad;
    }
    return _utf8Decode(out);
}

// 精品线路解密：v2player 播放器页 → playData(密文, hex iv) → 真实直链
// 密钥固定 ABABEF777999CCCD（AES-128-CBC），iv 为页面内 32 位 hex 随机串
function decryptV2Player(html) {
    const m = String(html).match(/url:\s*playData\('([^']+)'\s*,\s*'([^']+)'\)/);
    if (!m) return '';
    try { return aesCbcDecrypt(m[1], 'ABABEF777999CCCD', m[2]); }
    catch (e) { return ''; }
}

// 解析播放页 player_aaaa（兼容非严格 JSON）
function parsePlayerAaaa(html) {
    const m = String(html).match(/player_aaaa\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/);
    if (!m) return null;
    const raw = m[1];
    try { return JSON.parse(raw); } catch (e) {}
    try { return JSON.parse(raw.replace(/([{,]\s*)([A-Za-z_]\w*)\s*:/g, '$1"$2":')); } catch (e) {}
    const pick = (k) => {
        const r = raw.match(new RegExp('"' + k + '"\\s*:\\s*"([^"]*)"'));
        return r ? r[1] : '';
    };
    const u = pick('url');
    if (!u) return null;
    return { url: u, from: pick('from'), sid: pick('sid'), nid: pick('nid'), vod_data: { vod_name: '' } };
}

// 解码播放地址（兼容 %uXXXX 非标准转义）
function decodePlayUrl(vid) {
    let u = String(vid || '');
    if (u.indexOf('%') < 0) return u;
    u = u.replace(/%u([0-9a-fA-F]{4})/g, (mm, h) => String.fromCharCode(parseInt(h, 16)));
    try { u = decodeURIComponent(u); } catch (e) {
        u = u.replace(/%(?![0-9a-fA-F]{2})/g, '%25');
        try { u = decodeURIComponent(u); } catch (e2) {}
    }
    return u;
}

async function getConfig() {
    return jsonify(appConfig);
}

// 处理图片：补全协议、去双斜杠
function formatCover(url) {
    if (!url) return '';
    let cover = url.trim();
    if (cover.startsWith('//')) cover = 'https:' + cover;
    if (!/^https?:\/\//i.test(cover)) {
        cover = appConfig.site + (cover.startsWith('/') ? '' : '/') + cover;
    }
    return cover.replace(/([^:])\/{2,}/g, '$1/');
}

function parseCards($, cards) {
    $('a[href*="/anime/"]').each((_, element) => {
        const $a = $(element);
        const href = $a.attr('href');
        const title = $a.attr('title') || $a.find('h4 a').attr('title') || $a.text().trim();
        if (!href || !title) return;

        let rawCover = $a.attr('data-original') || $a.attr('data-src');
        if (!rawCover) {
            const style = $a.attr('style');
            if (style) {
                const match = style.match(/url\(['"]?(.*?)['"]?\)/);
                if (match) rawCover = match[1];
            }
        }
        if (!rawCover) {
            const $img = $a.find('img');
            if ($img.length) rawCover = $img.attr('data-original') || $img.attr('data-src') || $img.attr('src');
        }

        const cover = formatCover(rawCover);
        let remark = $a.find('span:last-child b').text().trim();

        let card = cards.find(c => c.vod_id === href);
        if (!card) {
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                ext: { url: `${appConfig.site}${href}` }
            });
        } else {
            if (!card.vod_pic && cover) card.vod_pic = cover;
            if (!card.vod_remarks && remark) card.vod_remarks = remark;
        }
    });
    return cards;
}

async function getCards(ext) {
    ext = argsify(ext);
    let { id, page = 1 } = ext;
    let cards = [];

    const testSites = [appConfig.site, ...backupSites];
    let success = false;

    for (let i = 0; i < testSites.length; i++) {
        let site = testSites[i];
        let url = page === 1 ? `${site}/type/${id}.html` : `${site}/type/${id}-${page}.html`;

        try {
            let res = await $fetch.get(url, {
                headers: { 'User-Agent': UA, 'Referer': site + '/' },
                timeout: 5000
            });
            let data = typeof res === 'string' ? res : (res.data || '');

            if (data.length > 5000 && data.includes('/anime/')) {
                const $ = cheerio.load(data);
                // 先锁定可用域名，保证卡片 ext.url 指向能访问的站点
                appConfig.site = site;
                let testCards = parseCards($, []);
                if (testCards.length > 0) {
                    cards = testCards;
                    success = true;
                    break;
                }
            }
        } catch (e) {
            continue;
        }
    }

    if (!success) {
        return jsonify({ list: [{
            vod_id: "err",
            vod_name: "所有域名均被拦截或失效",
            vod_pic: "",
            vod_remarks: "运营商网络问题",
            ext: { url: "" }
        }] });
    }

    return jsonify({ list: cards });
}

// 打开详情页（带镜像容错）
async function fetchDetail(extUrl) {
    for (const site of siteCandidates(extUrl)) {
        const u = site + pathOf(extUrl);
        try {
            const res = await $fetch.get(u, { headers: { 'User-Agent': UA, 'Referer': site + '/' }, timeout: 8000 });
            const data = typeof res === 'string' ? res : (res.data || '');
            if (data.length > 3000 && data.indexOf('/play/') >= 0) return { site: site, html: data };
        } catch (e) {}
    }
    return null;
}

async function getTracks(ext) {
    ext = argsify(ext);
    let url = ext.url;

    const detail = await fetchDetail(url);
    if (!detail) return jsonify({ list: [] });

    const base = detail.site;   // 关键：用实际能访问的站点拼播放链接
    appConfig.site = base;
    const $ = cheerio.load(detail.html);

    let lines = [];
    $('.channel-tab li a').each((_, el) => {
        const rawText = $(el).text().replace(/\d+$/, '').trim();
        const href = $(el).attr('href') || '';
        const match = href.match(/#playlist(\d+)/);
        const lineId = match ? match[1] : '';
        if (rawText && lineId) lines.push({ name: rawText, lineId: lineId });
    });

    let groups = [];
    for (const line of lines) {
        let tracks = [];
        const container = $(`#playlist${line.lineId}`);
        container.find('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !tracks.some(t => t.ext.url.endsWith(href))) {
                tracks.push({ name: text, pan: '', ext: { url: href.startsWith('http') ? href : `${base}${href}` } });
            }
        });
        if (tracks.length > 0) groups.push({ title: line.name, tracks: tracks });
    }

    if (groups.length === 0) {
        let tracks = [];
        $('a[href*="/play/"]').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !tracks.some(t => t.ext.url.endsWith(href))) {
                tracks.push({ name: text, pan: '', ext: { url: href.startsWith('http') ? href : `${base}${href}` } });
            }
        });
        if (tracks.length > 0) groups.push({ title: '默认分组', tracks: tracks });
    }

    return jsonify({ list: groups });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    const url = ext.url;
    let playUrl = '';
    let isSniffing = false;
    let pageHtml = '';
    let site = siteOf(url);

    // 播放页（带镜像容错）
    for (const s of siteCandidates(url)) {
        const u = s + pathOf(url);
        try {
            const res = await $fetch.get(u, { headers: { 'User-Agent': UA, 'Referer': s + '/' }, timeout: 8000 });
            const data = typeof res === 'string' ? res : (res.data || '');
            if (data.length > 3000) { pageHtml = data; site = s; break; }
        } catch (e) {}
    }
    appConfig.site = site;

    if (pageHtml) {
        // 1) 页面直接暴露的 m3u8/mp4
        const directMatch = pageHtml.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/i);
        if (directMatch && directMatch[0].indexOf('tiktokcdn') < 0) {
            playUrl = directMatch[0];
        }

        // 2) player_aaaa 配置
        if (!playUrl) {
            const pa = parsePlayerAaaa(pageHtml);
            if (pa && pa.url) {
                const vid = decodePlayUrl(pa.url);
                const vodName = (pa.vod_data && pa.vod_data.vod_name) || 'play';

                if (/^https?:\/\//i.test(vid)) {
                    // 暴风/量子/优质等：直接是 m3u8/mp4
                    playUrl = vid;
                } else if (vid) {
                    // 精品线路（from=mp4）：url 是 hash，真实直链加密在 v2player 播放器页
                    // 最小参数：url + dmid + sid + nid + name（缺 name 服务端只回 16 字节空壳）
                    const dmid = (pageHtml.match(/"dmid":"(\d+)"/) || [])[1] || '1';
                    const playerHosts = ['https://art.v2player.top:8989', 'https://low.v2player.top:8989'];
                    const q = `player/?url=${encodeURIComponent(vid)}&dmid=${dmid}` +
                        `&sid=${pa.sid || 1}&nid=${pa.nid || 1}&name=${encodeURIComponent(vodName)}`;
                    let sniffUrl = '';
                    for (const host of playerHosts) {
                        try {
                            const pr = await $fetch.get(host + '/' + q, { headers: { 'User-Agent': UA, 'Referer': site + '/' }, timeout: 10000 });
                            const pHtml = typeof pr === 'string' ? pr : (pr.data || '');
                            const real = decryptV2Player(pHtml);
                            if (real && /^https?:\/\//i.test(real)) { playUrl = real; break; }
                            if (!sniffUrl) sniffUrl = host + '/' + q;
                        } catch (e2) { if (!sniffUrl) sniffUrl = host + '/' + q; }
                    }
                    if (!playUrl && sniffUrl) { playUrl = sniffUrl; isSniffing = true; }
                }
            }
        }
    }

    if (!playUrl) {
        playUrl = url;
        isSniffing = true;
    } else {
        playUrl = encodeNonAscii(playUrl);
    }

    return jsonify({
        urls: [playUrl],
        headers: { 'User-Agent': UA, 'Referer': site + '/' },
        extra: { sniff: isSniffing, ua: UA }
    });
}

async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);

    const testSites = [appConfig.site, ...backupSites];

    for (let site of testSites) {
        const url = `${site}/search/-------------.html?wd=${text}`;
        try {
            const res = await $fetch.get(url, { headers: { 'User-Agent': UA }, timeout: 5000 });
            const data = typeof res === 'string' ? res : (res.data || '');
            if (data.length > 5000 && data.indexOf('/anime/') >= 0) {
                const $ = cheerio.load(data);
                appConfig.site = site;
                let testCards = parseCards($, []);
                if (testCards.length > 0) {
                    cards = testCards;
                    break;
                }
            }
        } catch (e) {
            continue;
        }
    }

    return jsonify({ list: cards });
}
