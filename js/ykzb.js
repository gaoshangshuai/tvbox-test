// 优酷直播 —— XPTV 插件
//
// 逆向结论（2026-11-24）：
//   ① 直播间页 vku.youku.com/live/ilproom?id=<liveId> 只是壳，数据全走 MTOP 网关
//   ② 直播信息 = mtop.youku.live.com.livefullinfo v4.0（data={liveId}）→ 标题/封面/liveStatus/streamName
//   ③ 取流 = mtop.youku.live.com.liveplaycontrol v4.0，必须带 ckey（浏览器指纹令牌）
//      返回 qualities[]，非会员只有 720P 的 h264PlayUrl（m3u8，带 vkey/ykLiveSign，约 6 小时有效）
//   ④ MTOP 要 _m_h5_tk 令牌：先发一次空签名请求，从 Set-Cookie 拿令牌，
//      再用 md5(token & t & appKey & data) 作为 sign 重发
//   ⑤ ckey 与 UA 无关、可跨房间复用，插件内置 3 份轮换
//   ⑥ 频道清单：live.youku.com 会 302 到 www.youku.com/ku/weblive，SSR 的 HTML 里内嵌全部直播间
//      （href="…ilproom?id=xxx" + aria-label="标题" + data-src="封面"），正则即可解析
//
// 使用：把想常看的直播间加进下面 ROOMS（链接里 id= 后面那串数字），
//      也可以在插件搜索框直接粘贴直播间链接或纯数字 ID，即搜即播。

// ═══════════════════ ★★★ 用户配置区（只改这里）★★★ ═══════════════════

// 一、我的频道（已停用，tab 已移除）：每行 [直播间 ID, 显示名称]
//    直播间 ID = 链接 https://vku.youku.com/live/ilproom?id=【8175820】 里那串数字
const ROOMS = [
    ['8175820', '卫视热播·放映厅']
];

// 二、（可选）优酷登录 Cookie：留空即可正常看 720P；
//     填入会员账号的 Cookie 后，部分直播间可能解锁 1080P（不保证）。
const COOKIE = '';

// ═══════════════════════════════════════════════════════════════════════
// 以下为引擎代码（无需修改）
// ═══════════════════════════════════════════════════════════════════════

const APPKEY = '24679788';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
const HOME_URL = 'https://www.youku.com/ku/weblive';
const PAGE_URL = 'https://live.youku.com';
// ckey 续期服务（选填）：ckey 有时效（实测约一天内失效）。
// 若部署了配套的续期服务，把地址填到这里；插件遇 3201 会自动拉新 key 重试。
const CKEY_API = '';

// 取流中转服务（选填，兜底）：填到 /yk/<SK> 为止（不含 /play）。
// 设备端 mtop 签名被 XPTV 网络层干扰（ILLEGAL_ACCESS）时，中转在服务端完成令牌+签名+ckey，
// 设备只发一个普通 GET。例：'https://xxx.example.com/yk/abcdef123456'
// 公网中转（2026-11-25 发布）：RELAY + '/play/<id>' + RELAY_QS 即完整取流地址
const RELAY = 'https://youku-ckey-service.app.workbuddy.host/yk/a3f7c29e51b8d640';
const RELAY_QS = '?sharecode=TTQUPYMAC5';   // 必须拼在 URL 末尾

// ckey：浏览器 uac.js 生成的指纹令牌（内置 3 份，按顺序轮换）
const CKEYS = [
    "140#mtOxT6srzzZ00zo23zau4pN8s9DtMz5PDYGWZ2BK/+/Zq0BpigB0sD2RQfIzGs5kPVb223hqzzcWHLxZ+orzzZVr9jWqlbrz2DD3V3gqzbaR2F+Jlp1xzoObV2EqlVrcfTDI1wba7X53xYYCTdkWsdWCFOPVQLmJpd6Kb0pCu8W1zMbv7EmzZh0z3f/EGPkFHoM3loZQEurkEk/Ry+7VNAFA3kyzjZFU5EBsg1bpjDxOeZ+eOJ7qtcs3aAWysdWTDF6uH/awUOZlJNBSPxdob/dNPN9cGST4Ik59zUAXNHkStaTHD2OamJ35+f51T+A9wMjKdpSnQvf6GUX+RXKYouKL5ecHdgicgvltQN8cHDNTueL6WcLUE7WcQVGPqc/svhqp75zog65Fo3QUwdiHyUBekmKvLf1RlT9oz32GPb6+N1zrv6A17BHZ48tcRaUMhE+O5PV+HWqzstPYZTvKimB+JMdA3PQ5kZTFLvy/IB+MJBKOrb6q/UTqF/YbbIPVV2KHXTnCqlsxr4YAVSiRYxBAXnVYSU4GkfrVAV3OK/PbTf+cPAPNQHA8WFkm+F==",
    "140#LJfoxts2zzWjhQo23zau4pN8s9DtMz5PDYGWZ2BK/+/Zq0BpigB0sD2RQfIzGs5kPVO2+3hqzzcWHLxZ+orzzXIcIY4qlQzx2DD3VthqzFFa0XQDTUzszPziVP//lbzx2oFnlT8I1wba7X53xYYCTdkWsdWE5CTH83TmqZ5i6ePaeMrfG7v3zv0bJW4zZh0z3f/EGPkFHoM3UzQ1UZVUUckqHKi+hCkUb3cN+Di/XVQGEbA1Fs30tXV5ATxhmq4ycSuARiTLQjuwd0SF3D4RlIoE1nSt2BJ1e6hfgMdt3sP+byOe6tQLeKZlGqyUqwAX0CR0zIfgYDVe2uioYxdE0+U/rGtdXRBcg1RB+XzQBFT4dDNQBs7jdtLOOP9aV0SuA9Z0v2wQTOimIWZJeeT4qlPoPqzMrpr8ULOp/dPQ73sCi0oi0oM+xh8zSuItypaRy0xqNnYC2J28rclvwaGycLcCsO5Mma926WmPg2kWEyB/NopPNpZxU+3Tuo0q67J5Iwqn67lfI+Luhu4vtSZfriDfpB30uCQPESNr3yq4Vh/w6r0EMX1oA8PjMZX+HusyLtPOe5CSjpVbEsarpcbw//OHeQnZGU7uyhhsGF1xlkubvGVj7ToDazKrKzDbouR9l2aHVi4mg/DFYXBZGWOGhdcdRtc8MVnS5ioQ3bK8CaG0qxqT7poDXS4lqPf2tBUoWF==",
    "140#2gfoo6sZzzWm2zo23zau4pN8s9DtMz5PDYGWZ2BK/+/Zq0BpigB0sD2RQfIzGs5kPIr2K6hqzzcWHLxZ+orzzZF2VHWqlQzx2DD3VthqzFfa0XQDTUzsvnQiVXE/tFzx2Dc33z//EHmijDapVrMn79/QCGKQA44d/Q72lQpGncnlAH7CFZW0NubDw2q6+TxnNXzeZg4ymGzO4FlXooVRc4BXBG1OYrEp/hjzMj1QHd6I4ovKxCiDQUReI4dCQnsp1kfjZ5A0nQvx95XwjZzM26vq244bqZMiNgVClpWgFAMU528DwVCelzvt00GSm+1Bh2m60fq70G52HK1Y8KL55LBWP5hrdvjWlLrYisIIeQrUK8YeGzWRcPLIP/GspVpLoei6pM+BP822MGOEC2/oAkPDXQZsn7hSlK9HVdEbtQ+TpwObRV8s9wMIdVROQfK8vn8NheT5Oo9iCOSqngKLtW32vO0Ou7tZnX2MWbSFrdf6mapr4fVhuZQ7Zdiqqp6f70/xwRNI9gpEvugyNERiSiw2y0I/uWYv/+fXMazyqyBng7+xKBoCW6cPtS+3tUHSWw56ALy86Wrf843BSVtmfqG2Q064jnpjEa2X14pu5IYTJJ8vWpd/pZ9U+4zz4CO7Y426eULu+BzGJBe6q1phrquSwlh4TjqDsh1nunEHXN3MdoDMnIFgxQ9yqSqMvZkwzMjv/Z2q"
];

// 经典直播频道（用户指定保留 6 个，均为 2026-11-25 实测可播）
// [ID, 名称, 封面]
const CLASSIC = [
    ["8175820", "卫视热播·放映厅", "https://live.ykimg.com/image/57995ABD8B8047E180A010265864B41B"],
    ["8175819", "中国通史·央视全集", "https://live.ykimg.com/image/A214870AA03B47BA8B5F077B2E1D7D14"],
    ["8184633", "百家讲坛·名师荟萃", "https://live.ykimg.com/image/441FED95C3B94BC2B56BD2871B761AD3"],
    ["8184638", "典籍中国·央视精品", "https://live.ykimg.com/image/673F126930F340ACA1E76B3FF2DA63A2"],
    ["8184635", "戏曲大全·国粹精华", "https://live.ykimg.com/image/1EB9CBE988024CCA8FC0A049A0BFB90D"],
    ["8176119", "语言启蒙娃娃抓起", "https://live.ykimg.com/image/40E88E2F605E4331B16CDACB2BBC5F90"]
];

const VER = 202611270;

const appConfig = {
    ver: VER,
    title: '优酷直播',
    site: 'https://live.youku.com',
    tabs: [
        { name: '经典直播', ext: { src: 'home' }, hasMore: false },
        { name: '诊断', ext: { src: 'diag' }, hasMore: false }
    ]
};

async function getConfig() { return JSON.stringify(appConfig); }

// ==================== 基础工具 ====================

// 后台安全版：入口函数返回后 XPTV 回收 setTimeout（后台调它抛 Can't find variable）。
// 无 setTimeout 环境下降级：lSleep 直接过、withTimeout 只等 promise 本身（$fetch 有内部超时兜底）。
function lSleep(ms) {
    return new Promise(function (r) {
        if (typeof setTimeout === 'function') setTimeout(r, ms); else r();
    });
}

function withTimeout(p, ms, fallback) {
    if (typeof setTimeout !== 'function') {
        return Promise.resolve(p).then(function (v) { return v; }).catch(function () { return fallback; });
    }
    return new Promise(function (resolve) {
        let done = false;
        const tm = setTimeout(function () { if (!done) { done = true; resolve(fallback); } }, ms);
        Promise.resolve(p).then(function (v) {
            if (!done) { done = true; clearTimeout(tm); resolve(v); }
        }).catch(function () {
            if (!done) { done = true; clearTimeout(tm); resolve(fallback); }
        });
    });
}

function parseExt(e) {
    if (!e) return {};
    if (typeof e === 'object') return e;
    try {
        if (typeof argsify === 'function') { const v = argsify(e); return v || {}; }
    } catch (x) { }
    try { return JSON.parse(String(e)); } catch (x) { return {}; }
}

function bodyOf(res) {
    if (res === null || res === undefined) return '';
    if (typeof res === 'string') return res;
    if (typeof res === 'object') {
        const cands = [res.data, res.body, res.text, res.response, res.raw];
        for (let i = 0; i < cands.length; i++) {
            const c = cands[i];
            if (c === undefined || c === null) continue;
            if (typeof c === 'string' && c.length === 0) continue;
            return c;
        }
        if (res.data !== undefined) return res.data;
    }
    return res;
}

function textOf(res) {
    let b = bodyOf(res);
    if (typeof b === 'string') return b;
    try { return JSON.stringify(b); } catch (e) { return ''; }
}

// ---- 纯 JS MD5（XPTV 无 crypto，必须有）----
const MD5_K = [
    0xd76aa478, 0xe8c7b756, 0x242070db, 0xc1bdceee, 0xf57c0faf, 0x4787c62a, 0xa8304613, 0xfd469501,
    0x698098d8, 0x8b44f7af, 0xffff5bb1, 0x895cd7be, 0x6b901122, 0xfd987193, 0xa679438e, 0x49b40821,
    0xf61e2562, 0xc040b340, 0x265e5a51, 0xe9b6c7aa, 0xd62f105d, 0x02441453, 0xd8a1e681, 0xe7d3fbc8,
    0x21e1cde6, 0xc33707d6, 0xf4d50d87, 0x455a14ed, 0xa9e3e905, 0xfcefa3f8, 0x676f02d9, 0x8d2a4c8a,
    0xfffa3942, 0x8771f681, 0x6d9d6122, 0xfde5380c, 0xa4beea44, 0x4bdecfa9, 0xf6bb4b60, 0xbebfbc70,
    0x289b7ec6, 0xeaa127fa, 0xd4ef3085, 0x04881d05, 0xd9d4d039, 0xe6db99e5, 0x1fa27cf8, 0xc4ac5665,
    0xf4292244, 0x432aff97, 0xab9423a7, 0xfc93a039, 0x655b59c3, 0x8f0ccc92, 0xffeff47d, 0x85845dd1,
    0x6fa87e4f, 0xfe2ce6e0, 0xa3014314, 0x4e0811a1, 0xf7537e82, 0xbd3af235, 0x2ad7d2bb, 0xeb86d391
];
const MD5_S = [
    7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22, 7, 12, 17, 22,
    5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20, 5, 9, 14, 20,
    4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23, 4, 11, 16, 23,
    6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21, 6, 10, 15, 21
];

function utf8Bytes(s) {
    s = String(s);
    const r = encodeURIComponent(s), a = [];
    for (let i = 0; i < r.length; i++) {
        const c = r.charAt(i);
        if (c === '%') { a.push(parseInt(r.charAt(i + 1) + r.charAt(i + 2), 16)); i += 2; }
        else a.push(c.charCodeAt(0));
    }
    return a;
}

function md5(inputBytes) {
    const msg = inputBytes.slice();
    const bitLen = msg.length * 8;
    msg.push(0x80);
    while (msg.length % 64 !== 56) msg.push(0);
    msg.push(bitLen & 255, (bitLen >>> 8) & 255, (bitLen >>> 16) & 255, (bitLen >>> 24) & 255, 0, 0, 0, 0);
    let a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    for (let off = 0; off < msg.length; off += 64) {
        const M = [];
        for (let i = 0; i < 16; i++) {
            const o = off + i * 4;
            M[i] = msg[o] | (msg[o + 1] << 8) | (msg[o + 2] << 16) | (msg[o + 3] << 24);
        }
        let A = a0, B = b0, C = c0, D = d0;
        for (let i = 0; i < 64; i++) {
            let F, g;
            if (i < 16) { F = (B & C) | (~B & D); g = i; }
            else if (i < 32) { F = (D & B) | (~D & C); g = (5 * i + 1) % 16; }
            else if (i < 48) { F = B ^ C ^ D; g = (3 * i + 5) % 16; }
            else { F = C ^ (B | ~D); g = (7 * i) % 16; }
            F = (F + A + MD5_K[i] + M[g]) | 0;
            A = D; D = C; C = B;
            B = (B + ((F << MD5_S[i]) | (F >>> (32 - MD5_S[i])))) | 0;
        }
        a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    const out = [], words = [a0, b0, c0, d0];
    for (let w = 0; w < 4; w++) {
        out.push(words[w] & 255, (words[w] >>> 8) & 255, (words[w] >>> 16) & 255, (words[w] >>> 24) & 255);
    }
    return out;
}

function md5Hex(s) {
    const b = md5(utf8Bytes(s));
    let out = '';
    for (let i = 0; i < b.length; i++) out += (b[i] < 16 ? '0' : '') + b[i].toString(16);
    return out;
}

function rndHex(n) {
    let s = '';
    const cs = '0123456789abcdef';
    for (let i = 0; i < n; i++) s += cs.charAt(Math.floor(Math.random() * 16));
    return s;
}

// ==================== Cookie 罐（MTOP 令牌）====================

// cna：与优酷 web 播放器一致的固定值即可
const CNA = 'defaultCnaLive20180425';
let JAR = COOKIE ? String(COOKIE).trim() : '';

function jarGet(name) {
    const m = ('; ' + JAR + '; ').match(new RegExp('; ' + name + '=([^;]*)'));
    return m ? m[1] : '';
}

function jarSet(map) {
    const parts = JAR ? JAR.split('; ') : [];
    const idx = {};
    for (let i = 0; i < parts.length; i++) idx[parts[i].split('=')[0]] = i;
    Object.keys(map).forEach(function (k) {
        if (idx[k] === undefined) parts.push(k + '=' + map[k]);
        else parts[idx[k]] = k + '=' + map[k];
    });
    JAR = parts.join('; ');
}

function jarDel(name) {
    JAR = (JAR ? JAR.split('; ') : []).filter(function (p) { return p && p.split('=')[0] !== name; }).join('; ');
}

// 从响应里捞 Set-Cookie（不同客户端形态不一，全部兜住）
function harvest(res) {
    try {
        let sc = '';
        const h = res && res.headers;
        if (h) {
            if (typeof h.get === 'function') { try { sc = h.get('set-cookie') || ''; } catch (e) { } }
            if (!sc) sc = h['set-cookie'] || h['Set-Cookie'] || '';
        }
        if (!sc && res) sc = res['set-cookie'] || res.cookies || '';
        if (Array.isArray(sc)) sc = sc.join('\n');
        sc = String(sc || '');
        if (!sc) return;
        const bad = { path: 1, expires: 1, domain: 1, 'max-age': 1, secure: 1, httponly: 1, samesite: 1, version: 1, comment: 1 };
        const map = {};
        const re = /([A-Za-z0-9_.\-]+)=([^;,\r\n\t ]+)/g;
        let m;
        while ((m = re.exec(sc)) !== null) {
            const k = m[1].toLowerCase();
            if (bad[k]) continue;
            if (m[2].indexOf('GMT') >= 0) continue;
            map[m[1]] = m[2];
        }
        if (Object.keys(map).length) jarSet(map);
    } catch (e) { }
}

// ==================== MTOP 调用 ====================

function tokenNow() {
    const v = jarGet('_m_h5_tk');
    return v ? String(v).split('_')[0] : '';
}

async function httpGet(url, headers) {
    const opt = {
        headers: Object.assign({
            'User-Agent': UA,
            'Referer': PAGE_URL,
            'Accept': 'application/json, text/plain, */*',
            'Accept-Language': 'zh-CN,zh;q=0.9'
        }, headers || {})
    };
    if (JAR) opt.headers['Cookie'] = JAR;
    return await $fetch.get(url, opt);
}

async function mtop(api, ver, dataObj) {
    const data = JSON.stringify(dataObj);
    for (let attempt = 0; attempt < 4; attempt++) {
        const t = String(Date.now());
        const before = tokenNow();
        const tk = before;
        const sign = tk ? md5Hex(tk + '&' + t + '&' + APPKEY + '&' + data) : '';
        const url = 'https://acs.youku.com/h5/' + api + '/' + ver + '/?jsv=2.5.1&appKey=' + APPKEY +
            '&t=' + t + '&sign=' + sign + '&api=' + api + '&v=' + ver +
            '&type=originaljson&dataType=json&timeout=20000&data=' + encodeURIComponent(data);
        const res = await withTimeout(httpGet(url), 9000, null);
        if (!res) { MTOP_LAST = '请求超时/失败'; await lSleep(200); continue; }
        harvest(res);                       // 先接收服务端下发的令牌
        const after = tokenNow();
        const txt = textOf(res);
        let j = null;
        try { j = JSON.parse(txt); } catch (e) { }
        if (!j) { MTOP_LAST = '非JSON(len=' + txt.length + ')'; continue; }
        const ret = String((j.ret && j.ret[0]) || '');
        MTOP_LAST = ret || '(无ret)';
        const tokenBad = ret.indexOf('TOKEN') >= 0 || ret.indexOf('令牌') >= 0;
        if (tokenBad || ret.indexOf('ILLEGAL_ACCESS') >= 0) {
            // 服务端没换新令牌 → 主动清掉，下一轮重新申领；换了新令牌则直接用
            if (!after || after === before) jarDel('_m_h5_tk');
            await lSleep(120);
            continue;
        }
        return j;
    }
    return null;
}

// ==================== 优酷接口 ====================

// 直播信息（标题/封面/状态）—— v1.0 字段最全（v4.0 只有主题/挂件）
async function fullInfo(liveId) {
    const j = await mtop('mtop.youku.live.com.livefullinfo', '1.0', { liveId: String(liveId) });
    const d = j && j.data && j.data.data;
    if (!d) return null;
    const st = (d.stream && d.stream[0]) || {};
    return {
        liveId: String(liveId),
        name: d.name || '',
        pic: d.imgMUrl || st.imgMUrl || '',
        picBig: d.imgBUrl || '',
        status: Number(d.liveStatus === undefined ? d.state : d.liveStatus),
        sceneId: st.sceneId || d.screenId || 0,
        streamName: st.streamName || '',
        nick: ''
    };
}

// 取流：逐个 ckey 试，返回可播 m3u8
let okCkey = 0;

// 远端续期：3201（ckey 失效）时从续期服务拉新 key，localStorage 记忆
function loadRemoteCkeys() {
    try {
        if (typeof localStorage === 'undefined') return [];
        const s = localStorage.getItem('yk_ckeys');
        if (!s) return [];
        const a = JSON.parse(s);
        return Array.isArray(a) ? a.filter(function (k) { return typeof k === 'string' && k.length > 300; }) : [];
    } catch (e) { return []; }
}

function saveRemoteCkeys(keys) {
    try {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('yk_ckeys', JSON.stringify(keys));
            for (let i = 0; i < keys.length; i++) { if (CKEYS.indexOf(keys[i]) < 0) CKEYS.push(keys[i]); }
        }
    } catch (e) { }
}

async function refreshCkeysRemote() {
    if (!CKEY_API) return [];
    try {
        const res = await withTimeout(httpGet(CKEY_API, { 'Accept': 'application/json' }), 6000, null);
        if (!res) return [];
        let j = null;
        try { j = JSON.parse(textOf(res)); } catch (e) { }
        const keys = j && (j.keys || j.ckeys || (j.ckey ? [j.ckey] : null));
        if (Array.isArray(keys) && keys.length) {
            const ok = keys.filter(function (k) { return typeof k === 'string' && k.length > 300; });
            if (ok.length) { saveRemoteCkeys(ok); return ok; }
        }
    } catch (e) { }
    return [];
}

// 取流失败原因（探测诊断用）：playUrl 每次尝试的状态都记在这里
let LAST_PLAY_FAIL = '';
let MTOP_LAST = '';

// 中转兜底：直接取流失败时问中转服务要流地址（服务端完成令牌+签名+ckey）
async function relayPlay(liveId) {
    if (!RELAY) return '';
    try {
        const r = await withTimeout(httpGet(RELAY + '/play/' + String(liveId).replace(/\D/g, '') + RELAY_QS, { 'Accept': 'application/json' }), 8000, null);
        if (!r) return '';
        const j = JSON.parse(textOf(r) || '{}');
        return j && /^https?:\/\//.test(j.url || '') ? j.url : '';
    } catch (e) { return ''; }
}

async function playUrl(liveId, budget) {
    if (!CKEYS.length) { LAST_PLAY_FAIL = '无内置ckey'; return ''; }
    LAST_PLAY_FAIL = ''; MTOP_LAST = '';
    const t0 = Date.now();
    const limit = budget || 11000;
    let remoteTried = false;
    for (let pass = 0; pass < 2; pass++) {
        const pool = pass === 0 ? CKEYS : loadRemoteCkeys().concat(CKEYS);
        for (let i = 0; i < pool.length; i++) {
            if (Date.now() - t0 > limit) { LAST_PLAY_FAIL += '[预算超时]'; return ''; }
            const idx = (okCkey + i) % pool.length;
            const j = await mtop('mtop.youku.live.com.liveplaycontrol', '4.0', {
                ckey: pool[idx],
                encryptRClient: '',
                liveId: String(liveId),
                sceneId: 0,
                reqQuality: 0,
                ad: JSON.stringify({
                    site: 'youku', aw: 'w', p: 1, vs: '1.0', vc: 0, bt: 'pc', rst: 'mp4', dq: 0,
                    isvert: 0, wintype: 'h5', bf: 0, utdid: '', fu: 0, os: 'win',
                    dvh: 384, dvw: 216, ccode: 'live05010101', lid: String(liveId)
                }),
                cna: CNA,
                playAbilities: JSON.stringify({ decode_resolution_FPS: '4K_50', abrPlay: 2, vrPlay: 1, mixPlay: 3, mix_ability: 1, decode: 'H265' }),
                systemInfo: JSON.stringify({ webPlayerCoreVer: 2 }),
                keyIndex: 'web01',
                ccode: 'live05010101',
                app: 'Pc',
                AntiFlood: true
            });
            const dd = j && j.data && j.data.data;
            if (!dd) {
                const st = j && j.data ? j.data.status : undefined;
                const ret = (j && j.ret ? JSON.stringify(j.ret) : MTOP_LAST || '').slice(0, 50);
                LAST_PLAY_FAIL += '[st=' + st + ' ret=' + ret + ']';
                continue;
            }
            const st = Number(j.data.status);
            const qs = (dd.qualities || []).filter(function (q) { return q && q.h264PlayUrl; });
            if (!qs.length) {
                if (st === 2001) { LAST_PLAY_FAIL += '[2001:VIP/未开播]'; return ''; }   // VIP 专享/未开播，换 key 无用
                if (st === 3201) {
                    // ckey 失效：先试远端续期，再换下一份
                    LAST_PLAY_FAIL += '[3201:ckey失效]';
                    if (!remoteTried) {
                        remoteTried = true;
                        const fresh = await refreshCkeysRemote();
                        if (fresh.length) { okCkey = 0; }
                    }
                    continue;
                }
                LAST_PLAY_FAIL += '[st' + st + ':无流]';
                continue;
            }
            qs.sort(function (a, b) { return (b.quality || 0) - (a.quality || 0); });
            okCkey = idx;
            let u = qs[0].h264PlayUrl;
            if (u.indexOf('http://') === 0) u = 'https://' + u.substring(7);   // iOS 端优先 https
            return u;
        }
        if (remoteTried && !CKEY_API) break;
        if (pass === 1) break;
    }
    return '';
}

// ==================== 频道清单 ====================

// 解析直播首页 SSR 里的全部直播间
async function homeChannels() {
    let res = null;
    try { res = await withTimeout(httpGet(HOME_URL, { 'Accept': 'text/html,application/xhtml+xml' }), 5000, null); } catch (e) { }
    let html = '';
    try { html = textOf(res); } catch (e) { }
    if (!html || html.length < 5000) {
        // 退一步用 live.youku.com
        try {
            const r2 = await withTimeout(httpGet(PAGE_URL, { 'Accept': 'text/html' }), 1800, null);
            const h2 = textOf(r2) || '';
            if (h2.length > (html || '').length) html = h2;
        } catch (e) { }
    }
    const out = [], seen = {};
    if (html) {
        const re = /ilproom\?id=(\d{5,10})"[^>]*aria-label="([^"]*)"[\s\S]{0,700}?data-src="([^"]+)"/g;
        let m;
        while ((m = re.exec(html)) !== null) {
            const id = m[1];
            if (seen[id]) continue;
            seen[id] = 1;
            let title = m[2].replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
            if (!title) continue;
            out.push({ liveId: id, name: title, pic: m[3].split('?')[0] });
        }
    }
    return out;
}

function cardOf(liveId, name, pic, remarks) {
    return {
        vod_id: String(liveId),
        vod_name: name || ('直播间 ' + liveId),
        vod_pic: pic || '',
        vod_remarks: remarks || '直播',
        ext: { live: 1, liveId: String(liveId), name: name || '' }
    };
}

// 经典直播白名单卡：SSR 失败时的兜底，与过滤后的 SSR 列表同源
function classicCards() {
    const list = CLASSIC.map(function (row) { return cardOf(row[0], row[1], row[2], '直播中'); });
    // 版本信标：首卡角标烧入版本号，截图即知设备运行版本
    if (list.length) list[0].vod_remarks = 'v' + VER;
    return list;
}
// 兼容旧名（诊断兜底等处引用）
function stableCards() { return classicCards(); }

// ==================== 诊断（链路逐步打点） ====================

// 探测结果存 localStorage（yk_last_probe），由前台探测 probeFast() 写入
let LAST_PROBE = '';

function loadProbe() {
    try {
        if (typeof localStorage !== 'undefined') LAST_PROBE = localStorage.getItem('yk_last_probe') || '';
    } catch (e) { }
}
function saveProbe() {
    try {
        if (typeof localStorage !== 'undefined') localStorage.setItem('yk_last_probe', LAST_PROBE);
    } catch (e) { }
}

// 后台流探测：XPTV 三条铁律（设备端实测教训）：
//   ① search/getCards 有约 9~10 秒客户端超时 → 入口绝不能 await 完整探测（总耗时可达 16s+，
//      慢链路下仅 16KB 分片就要 8s）→ 否则搜索白屏 + 探测被杀 + localStorage 全空
//   ② 入口返回后 setTimeout 被回收（withTimeout/lSleep 已做无 setTimeout 降级，后台可安全 await）
//   ③ 每完成一段立刻写 localStorage：即使中途被回收，已完成段的数字仍留在诊断页
// 由 search('探测') 同步启动（不 await），入口立即返回卡片，探测本体在后台续跑
async function probeBg() {
    const emsg = function (e) {
        const m = String((e && e.message) || e);
        const s = e && e.stack ? String(e.stack).split('\n').slice(0, 2).join(' / ') : '';
        return (m + (s ? ' @' + s : '')).slice(0, 160);
    };
    const res = [];
    const put = function () {
        const now = new Date();
        const pad = function (n) { return (n < 10 ? '0' : '') + n; };
        const ts = pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':' + pad(now.getSeconds());
        LAST_PROBE = '[' + ts + '] ' + res.join(' ｜ ');
        saveProbe();
    };
    put(); // 先落盘时间戳：诊断页看到时间戳 = 探测确实已启动
    // T 段：令牌链路专项诊断——XPTV 能否读到 Set-Cookie、签名能否配对成功
    try {
        jarDel('_m_h5_tk'); jarDel('_m_h5_tk_enc');
        const t0 = Date.now();
        const dta = JSON.stringify({ liveId: '8175820' });
        // T1：无签名请求 → 服务端应回 TOKEN_EMPTY 并下发令牌
        const url1 = 'https://acs.youku.com/h5/mtop.youku.live.com.liveplaycontrol/4.0/?jsv=2.5.1&appKey=' + APPKEY +
            '&t=' + Date.now() + '&sign=&api=mtop.youku.live.com.liveplaycontrol&v=4.0&type=originaljson&dataType=json&timeout=20000&data=' + encodeURIComponent(dta);
        const r1 = await withTimeout(httpGet(url1), 7000, null);
        let tkLen = 0, scHead = '';
        if (r1) {
            harvest(r1);
            tkLen = tokenNow() ? tokenNow().length : 0;
            const h = r1.headers;
            if (h) {
                let sc = '';
                if (typeof h.get === 'function') { try { sc = h.get('set-cookie') || ''; } catch (e) { } }
                if (!sc) sc = h['set-cookie'] || h['Set-Cookie'] || '';
                scHead = String(sc).slice(0, 50);
            }
        }
        const j1 = r1 ? JSON.parse(textOf(r1) || '{}') : {};
        res.push('T1令牌:' + (String((j1.ret && j1.ret[0]) || 'ERR').replace('FAIL_SYS_', '').slice(0, 24)) +
            ' 收到tk:' + (tkLen ? '有' + tkLen + '位' : '无') +
            ' 原始SC:' + (scHead ? scHead.replace(/[^\x20-\x7e]/g, '').slice(0, 30) : '空'));
        put();
        // T2：用收到的令牌签名重发 → 期望 SUCCESS
        const t2 = String(Date.now());
        const tk2 = tokenNow();
        const s2 = tk2 ? md5Hex(tk2 + '&' + t2 + '&' + APPKEY + '&' + dta) : '';
        const url2 = 'https://acs.youku.com/h5/mtop.youku.live.com.liveplaycontrol/4.0/?jsv=2.5.1&appKey=' + APPKEY +
            '&t=' + t2 + '&sign=' + s2 + '&api=mtop.youku.live.com.liveplaycontrol&v=4.0&type=originaljson&dataType=json&timeout=20000&data=' + encodeURIComponent(dta);
        const r2 = await withTimeout(httpGet(url2), 7000, null);
        const j2 = r2 ? JSON.parse(textOf(r2) || '{}') : {};
        res.push('T2签名:' + (tk2 ? '有tk' : '无tk') + '→' + (String((j2.ret && j2.ret[0]) || 'ERR').replace('FAIL_SYS_', '').slice(0, 24)) +
            ' ' + (Date.now() - t0) + 'ms');
        put();
    } catch (e) { res.push('✘T ERR ' + emsg(e)); put(); }
    // A 段：取流地址（5 小时内缓存直接复用）
    let u = '';
    try {
        if (typeof localStorage !== 'undefined') {
            const cu = localStorage.getItem('yk_probe_url') || '';
            const ct = Number(localStorage.getItem('yk_probe_ts') || 0);
            if (cu && /^https?:\/\//.test(cu) && Date.now() - ct < 5 * 3600 * 1000) { u = cu; res.push('A取流:用缓存✔'); put(); }
        }
        if (!u) {
            const t3 = Date.now();
            // 中转优先：设备端直连 mtop 签名必然失败（ILLEGAL_ACCESS，已诊断确认）
            u = await relayPlay('8175820');
            if (u) res.push('A中转✔ ' + (Date.now() - t3) + 'ms');
            else {
                res.push('✘A中转:无(' + (Date.now() - t3) + 'ms) → 试直连');
                const t = Date.now();
                u = await playUrl('8175820', 9000);
                if (u) res.push('A直连✔ ' + (Date.now() - t) + 'ms');
                else res.push('✘A直连:空(' + (Date.now() - t) + 'ms) ' + (LAST_PLAY_FAIL || ''));
            }
            if (u) {
                try {
                    if (typeof localStorage !== 'undefined') {
                        localStorage.setItem('yk_probe_url', u);
                        localStorage.setItem('yk_probe_ts', String(Date.now()));
                    }
                } catch (e) { }
            }
        }
    } catch (e) { res.push('✘A ERR ' + emsg(e) + ' U:' + String(u).slice(0, 60)); put(); return; }
    put();
    // B 段：m3u8 列表（A 段失败没有地址时跳过，避免拿空 URL 报 URL is not valid 的误报）
    let segLine = '';
    if (u) {
        try {
            const t = Date.now();
            const r1 = await $fetch.get(u, { headers: { 'User-Agent': UA } });
            const txt = typeof r1.data === 'string' ? r1.data : String(JSON.stringify(r1.data));
            const lines = txt.split('\n').filter(function (l) { return l.indexOf('http') === 0; });
            res.push('B列表' + r1.status + '/' + (Date.now() - t) + 'ms');
            if (lines.length) segLine = lines[0];
            else res.push('B无分片(len=' + txt.length + ')');
        } catch (e) { res.push('✘B ERR ' + emsg(e) + ' U:' + String(u).slice(0, 60)); }
        put();
        // C 段：分片 16KB（探测下载速度的关键数字，慢链路下要 8s+，后台跑不受 XPTV 超时限制）
        if (segLine) {
            res.push('⏳C测速中…'); put();
            try {
                const t2 = Date.now();
                const r2 = await $fetch.get(segLine, { headers: { 'User-Agent': UA, 'Range': 'bytes=0-16383' } });
                const n = typeof r2.data === 'string' ? r2.data.length : 0;
                const ms = Math.max(Date.now() - t2, 1);
                res[res.length - 1] = 'C分片' + r2.status + ' ' + (n / 1024).toFixed(0) + 'KB/' + ms + 'ms ≈' + Math.round(n / 1024 / (ms / 1000)) + 'KB/s';
            } catch (e) { res[res.length - 1] = '✘C ERR ' + emsg(e) + ' U:' + String(segLine).slice(0, 60); }
            put();
        }
    }
}

// 探测结果切卡：详情页标题显示的是 vod_name（不是角标！角标会被截断），
// 因此把每段全文同时放进 vod_name 和 vod_remarks——点开卡片后标题即该段完整文字。
// 注意：诊断卡不可播放，详情页的「播放」按钮点了没反应是正常的，看标题即可。
function probeCards() {
    const steps = [];
    const probeTxt = String(LAST_PROBE || '（还没探测过：在主页顶部搜索框输入「探测」并搜索，等15~30秒后刷新本页）');
    const segs = [];
    for (let i = 0; i < probeTxt.length && segs.length < 16; i += 32) segs.push(probeTxt.slice(i, i + 32));
    for (let si = 0; si < segs.length; si++) {
        steps.push({
            vod_id: 'probe_' + si,
            vod_name: segs[si],
            vod_pic: '',
            vod_remarks: segs[si],
            ext: { diag: 1, ok: 1 }
        });
    }
    return steps;
}

// 诊断（纯同步版）：零网络、零 await、零 setTimeout——任何环境下都能立即返回，
// 不可能超时、不可能触发兜底退回海报。手动测速：搜索框输入「探测」
function diagCardsSync() {
    const steps = [];
    steps.push({
        vod_id: 'diag_0',
        vod_name: '⓪ 插件版本',
        vod_pic: '',
        vod_remarks: 'v' + VER + ' · keys=' + CKEYS.length + ' · cna=' + String(CNA).slice(0, 12) +
            ' · cookie=' + (COOKIE ? '有' : '无') + ' · API=' + (CKEY_API ? '已配置' : '未配置'),
        ext: { diag: 1, ok: 1 }
    });
    probeCards().forEach(function (c) { steps.push(c); });
    steps.push({
        vod_id: 'diag_howto',
        vod_name: '② 生效确认',
        vod_pic: '',
        vod_remarks: '能看到本卡=设备已运行 v' + VER + '；「经典直播」首卡角标也是版本号',
        ext: { diag: 1, ok: 1 }
    });
    steps.push({
        vod_id: 'diag_guide',
        vod_name: '③ 手动测速方法',
        vod_pic: '',
        vod_remarks: '主页顶部搜索框输入「探测」→ 立刻出「测速已启动」卡 → 等15~30秒 → 回到本诊断页看结果（①卡有[时间戳]=探测已启动）',
        ext: { diag: 1, ok: 1 }
    });
    return steps;
}

async function favCards() {
    const list = [];
    for (let i = 0; i < ROOMS.length; i++) {
        const id = String(ROOMS[i][0]);
        const nm = ROOMS[i][1] || '';
        const info = await withTimeout(fullInfo(id), 2500, null);
        let remarks = '点击播放';
        if (info) {
            if (info.status === 1) remarks = '直播中';
            else if (info.status === 4) remarks = '预告中';
            else remarks = '可能未开播';
            if (!nm && info.name) { /* 名称留空则用官方标题 */ }
        }
        list.push(cardOf(id, nm || (info && info.name) || ('直播间 ' + id), (info && info.pic) || '', remarks));
    }
    return list;
}

// ==================== XPTV 入口 ====================

// 启动时把上次远端续期的 key 合并进来（重启不丢）
(function () {
    const rk = loadRemoteCkeys();
    for (let i = 0; i < rk.length; i++) { if (CKEYS.indexOf(rk[i]) < 0) CKEYS.push(rk[i]); }
})();
loadProbe();

async function getCards(ext) {
    // 外层兜底：任何异常都必须返回至少一张卡片，绝不给客户端空响应
    try {
        ext = parseExt(ext);
        const page = Number(ext.page || ext.pg || 0);
        const src = ext.src || 'home';
        if (page > 1) return JSON.stringify({ list: [], hasMore: false, pagecount: 1 });

        // 诊断：纯同步直返，不进入任何异步/竞速流程
        if (src === 'diag') {
            const dl = diagCardsSync();
            return JSON.stringify({ list: dl.length ? dl : classicCards(), hasMore: false, pagecount: 1 });
        }

        // 整体 6.5 秒硬兜底：无论网络多慢，列表一定按时返回
        const build = (async function () {
            if (src === 'stable') return classicCards();
            // 经典直播：SSR 频道 ∩ 可播白名单（实测过滤，VIP/未开播全部剔除）
            const chs = await homeChannels();
            const allow = {};
            for (let i = 0; i < CLASSIC.length; i++) allow[String(CLASSIC[i][0])] = 1;
            const filtered = (chs || []).filter(function (c) { return allow[String(c.liveId)] === 1; });
            if (filtered.length >= 5) {
                const cards = filtered.map(function (c) { return cardOf(c.liveId, c.name, c.pic, '直播中'); });
                if (cards.length) cards[0].vod_remarks = 'v' + VER;   // 版本信标
                return cards;
            }
            // SSR 拉不到或过滤后太少（编排临时变动）→ 直接用白名单卡（白名单本身实测可播）
            return classicCards();
        })();

        // 外层竞速：6.5s 硬兜底
        let list = await withTimeout(build, 6500, null);
        if (!list || !list.length) list = classicCards();
        if (!list.length) list = stableCards().slice(0, 8);
        return JSON.stringify({ list: list, hasMore: false, pagecount: 1 });
    } catch (e) {
        // 就算炸了也要出卡片（纯本地，零网络依赖）
        try {
            return JSON.stringify({
                list: stableCards().slice(0, 12),
                hasMore: false,
                pagecount: 1
            });
        } catch (e2) {
            return JSON.stringify({ list: [], hasMore: false, pagecount: 1 });
        }
    }
}

// 详情页条目（播放按钮下方）：格式必须为 { list: [{ title, tracks: [{ name, ext }] }] }，
// ext 里带 liveId，XPTV 点条目时会把 ext 原样传给 getPlayinfo
function getTracks(ext) {
    try {
        ext = parseExt(ext);
        const liveId = String(ext.liveId || ext.id || '');
        if (!liveId) return JSON.stringify({ list: [] });
        const nm = ext.name || ('直播间 ' + liveId);
        return JSON.stringify({
            list: [{
                title: nm + ' · 直播中',
                tracks: [
                    { name: '原画', ext: { live: 1, liveId: liveId, name: nm } },
                    { name: '备用·HTTP', ext: { live: 1, liveId: liveId, name: nm, line: 'http' } }
                ]
            }]
        });
    } catch (e) {
        return JSON.stringify({ list: [] });
    }
}

async function getPlayinfo(ext) {
    ext = parseExt(ext);
    const liveId = String(ext.liveId || ext.id || '');
    if (!liveId) return JSON.stringify({ urls: [] });
    const line = String(ext.line || 'https');
    const fix = function (u) {
        if (line === 'http' && u.indexOf('https://') === 0) return 'http://' + u.slice(8);
        return u;
    };
    // 中转优先：设备端 mtop 签名必然失败（ILLEGAL_ACCESS，已诊断确认），先走服务端取流（约0.3s）
    try {
        const url3 = await withTimeout(relayPlay(liveId), 5000, '');
        if (url3) return JSON.stringify({ urls: [fix(url3)], headers: [{ 'User-Agent': UA }] });
    } catch (e) { }
    // 中转不可用时回退直连（桌面端/ckey 服务续期场景直连本可成功）
    try {
        const url = await withTimeout(playUrl(liveId, 8000), 10000, '');
        if (url) {
            return JSON.stringify({ urls: [fix(url)], headers: [{ 'User-Agent': UA }] });
        }
    } catch (e) { }
    // 最后再试一次中转（抖动重试）
    try {
        const url2 = await relayPlay(liveId);
        if (url2) return JSON.stringify({ urls: [fix(url2)], headers: [{ 'User-Agent': UA }] });
    } catch (e) { }
    return JSON.stringify({ urls: [] });
}

// XPTV 搜索入口传的是 JSON 串：{"text":"关键词","page":1}（参考金牌影视 jpyy.js 的写法）。
// 之前误写成 search(kw) 直接当关键词用，String 后得到的是整段 JSON → 正则永远匹配不上 → 白屏。
// 兼容三种传参：JSON 串 / 对象 / 纯字符串。
async function search(ext) {
    try {
        let q = '', page = 1;
        const raw = (ext === null || ext === undefined) ? '' :
            (typeof ext === 'object' ? '' : String(ext));
        if (typeof ext === 'object' && ext !== null) {
            q = String(ext.text || ext.wd || ext.keyword || '');
            page = Number(ext.page || 1);
        } else if (raw) {
            try {
                const o = JSON.parse(raw);
                if (o && typeof o === 'object') {
                    q = String(o.text || o.wd || o.keyword || '');
                    page = Number(o.page || 1);
                } else q = raw;
            } catch (e) { q = raw; }
        }
        q = String(q || '').trim();
        // 手动测速入口：搜索框输入「探测」→ 立即返回卡片，探测本体放后台跑
        // （之前 await probeFast() 撞 XPTV 9~10 秒搜索超时 → 白屏 + 探测被杀 + 诊断页"(空)"）
        if (/^(探测|测速|probe|test|cs)$/i.test(q)) {
            probeBg();
            return JSON.stringify({
                list: [{
                    vod_id: 'probe_started',
                    vod_name: '⏳ 测速已启动 · 后台运行中',
                    vod_pic: '',
                    vod_remarks: '等 15~30 秒，再进「诊断」页看结果；分片的 KB/s 就是手机到优酷CDN的真实速度',
                    ext: { diag: 1, ok: 1 }
                }],
                hasMore: false, pagecount: 1
            });
        }
        const m = q.match(/[?&]id=(\d{5,10})/) || q.match(/(\d{5,10})/);
        if (!m) return JSON.stringify({ list: [], hasMore: false, pagecount: 1 });
        const id = m[1];
        const info = await withTimeout(fullInfo(id), 6000, null);
        const list = [cardOf(id, (info && info.name) || ('直播间 ' + id), (info && info.pic) || '',
            info ? (info.status === 1 ? '直播中' : (info.status === 4 ? '预告中' : '可能未开播')) : '点击尝试播放')];
        return JSON.stringify({ list: list, hasMore: false, pagecount: 1 });
    } catch (e) {
        return JSON.stringify({ list: [], hasMore: false, pagecount: 1 });
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getConfig, getCards, getTracks, getPlayinfo, search, appConfig, ROOMS };
}
