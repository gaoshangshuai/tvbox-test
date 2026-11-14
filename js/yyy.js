// ============================================================
// 央视频 · XPTV 插件（海报 + 真播放）
//   列表：PC 站页面配置 JSON —— 海报/标题/cid/vid 齐全（整页一次给全，不翻页）
//   选集：移动端 SSR 页 window.__STATE_video__（纯 JSON，设备端可用）
//   播放：App 端 playvinfo（cKey 8.1 鉴权 → vkey 直链 mp4）
// ============================================================

const UA_PC = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36';
const UA_M = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const SITE = 'https://www.yangshipin.cn';
const H_PC = 'https://capi.yangshipin.cn/api/oms/pc';
const H_CS = 'https://csapi.yangshipin.cn/voapi/omsot';
const H_PLAY = 'https://playvv.yangshipin.cn/playvinfo';

const GUID = 'ko7djb70_vbjvrg5gcm';
const PLATFORM = '4330701';
const APPVER = '3.0.37';
const AES_KEY_HEX = '4E2918885FD98109869D14E0231A0BF4';
const AES_IV_HEX = '16B17E519DDD0CE5B79D7A63A4DD801C';

let appConfig = {
    ver: 202611147,
    title: '央视频',
    site: SITE,
    tabs: [
        { name: '推荐', ext: { pid: 'PG00000022' }, hasMore: false },
        { name: '电视剧', ext: { cat: '电视剧' }, hasMore: false },
        { name: '电影', ext: { cat: '电影' }, hasMore: false },
        { name: '纪录片', ext: { cat: '纪录片' }, hasMore: false },
        { name: '栏目', ext: { col: 1 }, hasMore: false },
        { name: '动画片', ext: { cat: ['动画', '青少'] }, hasMore: false },
        { name: '影视', ext: { pid: 'PG00000021' }, hasMore: false },
        { name: '晚会', ext: { pid: 'PG00000019' }, hasMore: false },
        { name: '全部', ext: { pid: 'PG00000002' }, hasMore: false },
        { name: '微短剧', ext: { cat: '微短剧' }, hasMore: false },
        { name: '特别节目', ext: { cat: ['特别节目', '世界杯'] }, hasMore: false },  
        { name: '诊断', ext: { diag: 1 }, hasMore: false }
    ]
};

async function getConfig() { return JSON.stringify(appConfig); }

// ==================== 基础工具 ====================
function log(m) {
    try { if (typeof $print === 'function') { $print(String(m)); return; } } catch (e) { }
    try { console.log(String(m)); } catch (e) { }
}

function parseExt(ext) {
    if (!ext) return {};
    if (typeof ext === 'string') { try { return JSON.parse(ext) || {}; } catch (e) { return {}; } }
    return ext;
}

// $fetch 的返回形态在不同客户端不一致，统一取正文
// 注意：部分客户端对二进制响应把 data 置为空字符串，此时继续尝试其他字段
function bodyOf(res) {
    if (res === null || res === undefined) return '';
    if (typeof res === 'string') return res;
    if (typeof res === 'object') {
        const cands = [res.data, res.body, res.text, res.response, res.raw];
        for (const c of cands) {
            if (c === undefined || c === null) continue;
            if (typeof c === 'string' && c.length === 0) continue;   // 空串不算命中
            return c;
        }
        // 实在没有：退回 data（可能是真的空）
        if (res.data !== undefined) return res.data;
    }
    return res;
}

function textOf(res) {
    let b = bodyOf(res);
    if (typeof b === 'string') return b;
    try {
        if (b instanceof ArrayBuffer) b = new Uint8Array(b);
        if (b && b.buffer && typeof b.length === 'number') {
            if (typeof TextDecoder !== 'undefined') return new TextDecoder('utf-8').decode(new Uint8Array(b.buffer || b));
            let s = '';
            const u = new Uint8Array(b.buffer || b);
            for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]);
            return s;
        }
    } catch (e) { }
    try { return String(b); } catch (e) { return ''; }
}

async function httpGet(url, ua, ref) {
    if (typeof $fetch === 'undefined' || !$fetch.get) throw new Error('无 $fetch');
    try {
        return await $fetch.get(url, { headers: { 'User-Agent': ua, 'Referer': ref || SITE + '/' } });
    } catch (e) {
        // 个别客户端对自定义请求头不兼容时，退化为裸请求（csapi 两个接口均不校验请求头）
        return await $fetch.get(url);
    }
}

// ==================== 二进制响应兼容层 ====================
// XPTV 的 $fetch 对二进制（protobuf）响应的交付形态不确定，这里统一处理：
//   base64 字符串 / ArrayBuffer / TypedArray / 字节数组对象 / latin1 字符串 / UTF-8 字符串
const B64T = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function b64ToLatin(s) {
    let clean = '';
    for (let i = 0; i < s.length; i++) {
        const c = s.charAt(i);
        if (c === '=') break;
        if (B64T.indexOf(c) >= 0) clean += c;
        else if (c === '-' ) clean += '+';
        else if (c === '_') clean += '/';
        else if (c === '\r' || c === '\n' || c === ' ' || c === '\t') continue;
        else return '';                      // 非 base64 字符
    }
    let out = '', bits = 0, acc = 0;
    for (let i = 0; i < clean.length; i++) {
        acc = (acc << 6) | B64T.indexOf(clean.charAt(i));
        bits += 6;
        if (bits >= 8) {
            bits -= 8;
            out += String.fromCharCode((acc >> bits) & 0xff);
        }
    }
    return out;
}

function bytesToLatin(u8) {
    let s = '';
    for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i] & 0xff);
    return s;
}

function looksLikeBase64(s) {
    if (typeof s !== 'string' || s.length < 64) return false;
    const t = s.replace(/[\r\n\s]/g, '');
    if (t.length < 64 || t.length % 4 !== 0) return false;
    if (/[^A-Za-z0-9+/\-_=]/.test(t)) return false;
    return true;
}

// 二进制接口专用取正文；返回值是「一字符=一字节」或「UTF-8 已解码」的字符串
function binaryTextOf(res) {
    let b = bodyOf(res);
    // 部分桥接会包一层 { base64: ... }
    if (b && typeof b === 'object' && typeof b.base64 === 'string') b = b.base64;
    if (typeof b === 'string') {
        if (looksLikeBase64(b)) {
            const dec = b64ToLatin(b);
            // 解出来应当像 protobuf（含 0a/12/1a 字段标记才可信）
            if (dec && /[\x0a\x12\x1a]/.test(dec.substring(0, 32))) return dec;
        }
        return b;
    }
    try {
        if (b instanceof ArrayBuffer) return bytesToLatin(new Uint8Array(b));
        if (b && typeof b.length === 'number' && typeof b.byteLength === 'number') return bytesToLatin(new Uint8Array(b.buffer || b));
        if (b && typeof b === 'object') {
            // 形如 {0:10,1:32,...} 的字节数组对象
            const ks = Object.keys(b);
            if (ks.length > 16 && /^[0-9]+$/.test(ks[0]) && /^[0-9]+$/.test(ks[ks.length - 1])) {
                const u8 = new Uint8Array(ks.length);
                for (const k of ks) u8[+k] = b[k] & 0xff;
                return bytesToLatin(u8);
            }
        }
    } catch (e) { }
    try { return String(b); } catch (e) { return ''; }
}

// ==================== AES-128-CBC（纯 JS，PKCS7）====================
const AES_SBOX = [
    0x63, 0x7c, 0x77, 0x7b, 0xf2, 0x6b, 0x6f, 0xc5, 0x30, 0x01, 0x67, 0x2b, 0xfe, 0xd7, 0xab, 0x76,
    0xca, 0x82, 0xc9, 0x7d, 0xfa, 0x59, 0x47, 0xf0, 0xad, 0xd4, 0xa2, 0xaf, 0x9c, 0xa4, 0x72, 0xc0,
    0xb7, 0xfd, 0x93, 0x26, 0x36, 0x3f, 0xf7, 0xcc, 0x34, 0xa5, 0xe5, 0xf1, 0x71, 0xd8, 0x31, 0x15,
    0x04, 0xc7, 0x23, 0xc3, 0x18, 0x96, 0x05, 0x9a, 0x07, 0x12, 0x80, 0xe2, 0xeb, 0x27, 0xb2, 0x75,
    0x09, 0x83, 0x2c, 0x1a, 0x1b, 0x6e, 0x5a, 0xa0, 0x52, 0x3b, 0xd6, 0xb3, 0x29, 0xe3, 0x2f, 0x84,
    0x53, 0xd1, 0x00, 0xed, 0x20, 0xfc, 0xb1, 0x5b, 0x6a, 0xcb, 0xbe, 0x39, 0x4a, 0x4c, 0x58, 0xcf,
    0xd0, 0xef, 0xaa, 0xfb, 0x43, 0x4d, 0x33, 0x85, 0x45, 0xf9, 0x02, 0x7f, 0x50, 0x3c, 0x9f, 0xa8,
    0x51, 0xa3, 0x40, 0x8f, 0x92, 0x9d, 0x38, 0xf5, 0xbc, 0xb6, 0xda, 0x21, 0x10, 0xff, 0xf3, 0xd2,
    0xcd, 0x0c, 0x13, 0xec, 0x5f, 0x97, 0x44, 0x17, 0xc4, 0xa7, 0x7e, 0x3d, 0x64, 0x5d, 0x19, 0x73,
    0x60, 0x81, 0x4f, 0xdc, 0x22, 0x2a, 0x90, 0x88, 0x46, 0xee, 0xb8, 0x14, 0xde, 0x5e, 0x0b, 0xdb,
    0xe0, 0x32, 0x3a, 0x0a, 0x49, 0x06, 0x24, 0x5c, 0xc2, 0xd3, 0xac, 0x62, 0x91, 0x95, 0xe4, 0x79,
    0xe7, 0xc8, 0x37, 0x6d, 0x8d, 0xd5, 0x4e, 0xa9, 0x6c, 0x56, 0xf4, 0xea, 0x65, 0x7a, 0xae, 0x08,
    0xba, 0x78, 0x25, 0x2e, 0x1c, 0xa6, 0xb4, 0xc6, 0xe8, 0xdd, 0x74, 0x1f, 0x4b, 0xbd, 0x8b, 0x8a,
    0x70, 0x3e, 0xb5, 0x66, 0x48, 0x03, 0xf6, 0x0e, 0x61, 0x35, 0x57, 0xb9, 0x86, 0xc1, 0x1d, 0x9e,
    0xe1, 0xf8, 0x98, 0x11, 0x69, 0xd9, 0x8e, 0x94, 0x9b, 0x1e, 0x87, 0xe9, 0xce, 0x55, 0x28, 0xdf,
    0x8c, 0xa1, 0x89, 0x0d, 0xbf, 0xe6, 0x42, 0x68, 0x41, 0x99, 0x2d, 0x0f, 0xb0, 0x54, 0xbb, 0x16
];
const AES_RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

function _xtime(a) { return ((a << 1) ^ ((a & 0x80) ? 0x1b : 0)) & 0xff; }
function _mul(a, b) { let r = 0; while (b) { if (b & 1) r ^= a; a = _xtime(a); b >>= 1; } return r & 0xff; }

function _expandKey(key) {
    const w = [];
    for (let i = 0; i < 4; i++) w.push([key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]]);
    for (let i = 4; i < 44; i++) {
        let t = w[i - 1].slice();
        if (i % 4 === 0) {
            t = [t[1], t[2], t[3], t[0]];
            t = [AES_SBOX[t[0]], AES_SBOX[t[1]], AES_SBOX[t[2]], AES_SBOX[t[3]]];
            t[0] ^= AES_RCON[i / 4 - 1];
        }
        w.push([w[i - 4][0] ^ t[0], w[i - 4][1] ^ t[1], w[i - 4][2] ^ t[2], w[i - 4][3] ^ t[3]]);
    }
    return w;
}

function _encBlock(s, w) {
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) s[4 * c + r] ^= w[c][r];
    for (let round = 1; round <= 10; round++) {
        const t = new Array(16);
        for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) t[4 * c + r] = AES_SBOX[s[4 * ((c + r) % 4) + r]];
        for (let i = 0; i < 16; i++) s[i] = t[i];
        if (round !== 10) {
            for (let c = 0; c < 4; c++) {
                const a0 = s[4 * c], a1 = s[4 * c + 1], a2 = s[4 * c + 2], a3 = s[4 * c + 3];
                s[4 * c] = _mul(a0, 2) ^ _mul(a1, 3) ^ a2 ^ a3;
                s[4 * c + 1] = a0 ^ _mul(a1, 2) ^ _mul(a2, 3) ^ a3;
                s[4 * c + 2] = a0 ^ a1 ^ _mul(a2, 2) ^ _mul(a3, 3);
                s[4 * c + 3] = _mul(a0, 3) ^ a1 ^ a2 ^ _mul(a3, 2);
            }
        }
        for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) s[4 * c + r] ^= w[4 * round + c][r];
    }
    return s;
}

function aesCbcHex(plain, keyHex, ivHex) {
    const key = [], iv = [];
    for (let i = 0; i < 16; i++) { key.push(parseInt(keyHex.substr(i * 2, 2), 16)); iv.push(parseInt(ivHex.substr(i * 2, 2), 16)); }
    const w = _expandKey(key);

    const bytes = [];
    for (let i = 0; i < plain.length; i++) {
        const c = plain.charCodeAt(i);
        if (c < 0x80) bytes.push(c);
        else if (c < 0x800) { bytes.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f)); }
        else if (c >= 0xd800 && c <= 0xdbff) {
            const c2 = plain.charCodeAt(++i);
            const cp = 0x10000 + ((c - 0xd800) << 10) + (c2 - 0xdc00);
            bytes.push(0xf0 | (cp >> 18), 0x80 | ((cp >> 12) & 0x3f), 0x80 | ((cp >> 6) & 0x3f), 0x80 | (cp & 0x3f));
        } else { bytes.push(0xe0 | (c >> 12), 0x80 | ((c >> 6) & 0x3f), 0x80 | (c & 0x3f)); }
    }
    const pad = 16 - (bytes.length % 16);
    for (let i = 0; i < pad; i++) bytes.push(pad);

    let prev = iv.slice();
    const out = [];
    for (let off = 0; off < bytes.length; off += 16) {
        const blk = [];
        for (let i = 0; i < 16; i++) blk.push(bytes[off + i] ^ prev[i]);
        _encBlock(blk, w);
        for (let i = 0; i < 16; i++) { out.push(blk[i]); prev[i] = blk[i]; }
    }
    let hex = '';
    for (let i = 0; i < out.length; i++) hex += (out[i] < 16 ? '0' : '') + out[i].toString(16);
    return hex.toUpperCase();
}

// ==================== cKey（8.1）====================
// 明文 = "|" + int32滚动哈希 + "|vid|tm|mg3c3b04ba|appVer|guid|platform|referer|ua前24||Mozilla|Netscape|Win32| "
function rollHash(s) {
    let u = 0;
    for (let i = 0; i < s.length; i++) {
        u = ((u << 5) - u + s.charCodeAt(i)) | 0;   // 有符号 32 位，等价于 JS 原生溢出
    }
    return u;
}

function makeCKey(vid, tm) {
    const ua24 = UA_M.toLowerCase().substring(0, 24);
    const tail = '|' + vid + '|' + tm + '|mg3c3b04ba|' + APPVER + '|' + GUID + '|' + PLATFORM + '|https://m.yangshipin.cn/|' + ua24 + '||Mozilla|Netscape|Win32| ';
    return '--01' + aesCbcHex('|' + rollHash(tail) + tail, AES_KEY_HEX, AES_IV_HEX);
}

// ==================== 列表 ====================
function cleanPic(u) {
    if (!u) return '';
    u = String(u).replace(/^\/\//, 'https://');
    u = u.replace(/\/(\d+)\?imageMogr2.*$/, '');   // 去掉 /1080?imageMogr2/format/webp
    u = u.replace(/\?imageMogr2.*$/, '');
    if (u.indexOf('http') !== 0) return '';
    return u;
}

async function cardsFromPage(pid, limit) {
    const lim = limit || 1200;
    let j = null;
    try {
        j = await fetchPage(pid);
    } catch (e) {
        // 残包挽救：配置整体解析失败，但拿到了截断的原始文本
        if (e.partialTxt) {
            const items = salvageItems(e.partialTxt).slice(0, lim);
            log('页面残包挽救(' + pid + '): ' + items.length + ' 条');
            if (items.length) return items;
        }
        throw new Error('配置获取失败');
    }
    return collectFromModules(j, null).slice(0, lim);
}

// 有的客户端把二进制当 latin1 字符串给过来，标题会变成 UTF-8 字节流，这里还原
function utf8Fix(s) {
    if (!s) return '';
    let high = false;
    for (let i = 0; i < s.length; i++) {
        const c = s.charCodeAt(i);
        if (c > 255) return s;           // 已是正常 Unicode
        if (c >= 0x80) high = true;
    }
    if (!high) return s;
    let out = '', i = 0;
    while (i < s.length) {
        const b0 = s.charCodeAt(i) & 0xff;
        let need = 0, cp = 0;
        if (b0 < 0x80) { out += String.fromCharCode(b0); i++; continue; }
        else if (b0 >= 0xc2 && b0 <= 0xdf) { need = 1; cp = b0 & 0x1f; }
        else if (b0 >= 0xe0 && b0 <= 0xef) { need = 2; cp = b0 & 0x0f; }
        else if (b0 >= 0xf0 && b0 <= 0xf4) { need = 3; cp = b0 & 0x07; }
        else { out += String.fromCharCode(b0); i++; continue; }
        let ok = true;
        for (let k = 1; k <= need; k++) {
            if (i + k >= s.length) { ok = false; break; }
            const bk = s.charCodeAt(i + k) & 0xff;
            if ((bk & 0xc0) !== 0x80) { ok = false; break; }
            cp = (cp << 6) | (bk & 0x3f);
        }
        if (!ok) { out += String.fromCharCode(b0); i++; continue; }
        if (cp >= 0x10000) {
            cp -= 0x10000;
            out += String.fromCharCode(0xd800 + (cp >> 10), 0xdc00 + (cp & 0x3ff));
        } else out += String.fromCharCode(cp);
        i += need + 1;
    }
    return out;
}

// 二进制文本可能是「一字符=一字节」也可能是已按 UTF-8 解码，判断一次
function isLatinText(t) {
    for (let i = 0; i < t.length; i++) if (t.charCodeAt(i) > 255) return false;
    return true;
}

// 从一段 protobuf 文本里读出第一个「像标题」的字段：
//   形如 1a <varint 字节长度> <正文>
// 按「字节预算」取字符，无论上游是一字符一字节还是已按 UTF-8 解码都精确
function readTextField(seg) {
    const latin = isLatinText(seg);
    let i = seg.indexOf('\x1a');
    while (i >= 0 && i < seg.length) {
        let p = i + 1, len = 0, shift = 0, ok = false;
        while (p < seg.length && shift < 28) {
            const b = seg.charCodeAt(p++) & 0xff;
            len |= (b & 0x7f) << shift; shift += 7;
            if (!(b & 0x80)) { ok = true; break; }
        }
        if (ok && len > 0 && len < 500) {
            let raw = '', bytes = 0;
            while (p < seg.length && bytes < len) {
                const c = seg.charCodeAt(p);
                const w = latin ? 1 : (c < 0x80 ? 1 : (c < 0x800 ? 2 : (c >= 0xd800 && c <= 0xdbff ? 4 : 3)));
                if (bytes + w > len) break;
                raw += seg.charAt(p);
                bytes += w;
                p++;
            }
            let t = utf8Fix(raw)
                .replace(/<[^>]+>/g, '')          // 去掉高亮标签
                .replace(/[\x00-\x1f].*$/, '')    // 截到下一个字段
                .split(/https?:/)[0]
                .trim();
            if (/[\u4e00-\u9fa5]/.test(t)) return t;
        }
        i = seg.indexOf('\x1a', i + 1);
    }
    return '';
}

// 条目扫描：protobuf 里每个条目都以「<id> 12 01 <数字>」开头
function scanItems(txt, win, exclude) {
    const out = [], seen = {};
    if (!txt) return out;
    const re = /([a-z0-9][a-z0-9]{8,14})\x12\x01[\x30-\x39]/g;
    let m;
    while ((m = re.exec(txt)) !== null) {
        const id = m[1];
        if (/^[0-9]+$/.test(id)) continue;         // 纯数字是直播 pid
        if (id === exclude) continue;              // 跳过专辑自身
        if (seen[id]) continue;
        seen[id] = 1;
        out.push({ id: id, seg: txt.substr(re.lastIndex, win || 420) });
    }
    return out;
}

// 搜索结果（protobuf）→ 卡片
function parseSearchItems(txt) {
    const cards = [];
    const items = scanItems(txt, 460);
    for (let i = 0; i < items.length; i++) {
        const seg = items[i].seg;
        const mPic = /(https?:\/\/[^\s"'\x00-\x1f\\]+?\.(?:jpg|jpeg|png|webp))/i.exec(seg);
        if (!mPic) continue;
        const pic = cleanPic(mPic[1]);
        if (!pic) continue;
        const title = readTextField(seg);
        // 标题读不出（如设备端把二进制按错误编码解码）时降级保留：
        // vid/图片 URL 是 ASCII 不受影响，仍可点播，标题用序号占位
        const nm = title || ('节目 ' + (cards.length + 1));
        cards.push({
            vod_id: items[i].id,
            vod_name: nm.length > 40 ? nm.substring(0, 40) : nm,
            vod_pic: pic,
            vod_remarks: title ? '' : '(标题编码异常)',
            ext: { id: items[i].id }
        });
    }
    return cards;
}

// 搜索：优先 .json 后缀（纯 JSON，设备端 $fetch 可处理）；
// protobuf 接口在部分客户端对二进制响应返回空 body（诊断⑦实测 status=200 长度=0）
function cardsFromSearchJson(d) {
    const cards = [];
    const lst = (d && d.data && d.data.list) || [];
    for (let i = 0; i < lst.length; i++) {
        const x = lst[i];
        if (x.dataType === 'album' && Array.isArray(x.albumList)) {
            for (let k = 0; k < x.albumList.length; k++) {
                const a = x.albumList[k];
                // 综合搜索(type=0)封面在 coverUrl；纯专辑搜索(type=2)在 coverHzUrl/coverVtUrl
                const pic = cleanPic(a.coverUrl || a.coverHzUrl || a.coverVtUrl);
                if (!a.cid || !a.title || !pic) continue;
                // 专辑内嵌的 videoList 是该专辑最新一期，直接带上便于播放
                const fv = (a.videoList && a.videoList[0]) || {};
                const ext = { cid: a.cid, t: a.title, vip: a.isVip ? 1 : 0 };
                if (fv.vid) ext.vid = fv.vid;
                if (fv.duration) ext.dur = Number(fv.duration);
                cards.push({ vod_id: a.cid, vod_name: String(a.title).replace(/<[^>]+>/g, ''), vod_pic: pic, vod_remarks: a.subTitle || '', ext: ext });
            }
        } else if (x.dataType === 'video' && Array.isArray(x.videoList)) {
            for (let k = 0; k < x.videoList.length; k++) {
                const v = x.videoList[k];
                const pic = cleanPic(v.coverUrl);
                if (!v.vid || !v.title || !pic) continue;
                cards.push({ vod_id: v.vid, vod_name: String(v.title).replace(/<[^>]+>/g, ''), vod_pic: pic, vod_remarks: v.duration ? durStr(v.duration) : '', ext: { vid: v.vid, t: v.title, dur: Number(v.duration) || 0 } });
            }
        }
    }
    return cards;
}

// 秒 → 「xx分xx秒」
function durStr(s) {
    s = Number(s) || 0;
    if (s <= 0) return '';
    const m = Math.floor(s / 60), ss = s % 60;
    return m + '分' + (ss < 10 ? '0' + ss : ss) + '秒';
}

async function cardsFromSearch(kw, page, type) {
    const p = page || 1;
    const tp = type || 0;   // 0 综合 / 2 纯专辑
    // ① JSON 版（设备端可用）
    try {
        const urlJ = 'https://csapi.yangshipin.cn/voapi/omsotm/v2/search.json?type=' + tp + '&query=' + encodeURIComponent(kw) + '&page=' + p + '&size=30';
        const resJ = await httpGet(urlJ, UA_PC, 'https://m.yangshipin.cn/');
        const cards = cardsFromSearchJson(JSON.parse(textOf(resJ)));
        if (cards.length) return cards;
    } catch (e) { log('搜索JSON失败: ' + (e && e.message)); }
    // ② protobuf 版兜底
    const url = 'https://csapi.yangshipin.cn/voapi/omsotm/v2/search?type=' + tp + '&query=' + encodeURIComponent(kw) + '&page=' + p + '&size=30';
    const res = await httpGet(url, UA_PC, 'https://m.yangshipin.cn/');
    return parseSearchItems(binaryTextOf(res));
}

// 页面配置缓存（同一会话内复用，避免搜索兜底时反复拉 500KB 配置）
const pageCache = {};

function sleep(ms) { return new Promise(function (r) { setTimeout(r, ms); }); }

// 拉取页面配置：失败自动重试 3 次；全部失败时把「残包文本」挂在错误上，供挽救逻辑使用
async function fetchPage(pid) {
    if (pageCache[pid] && Date.now() - pageCache[pid].ts < 600000) return pageCache[pid].j;
    let lastTxt = '', lastErr = null;
    for (let a = 0; a < 3; a++) {
        if (a) await sleep(300 * a);
        try {
            const url = H_PC + '/page/' + pid + '.json?v=' + Date.now() + (a ? 'x' + a : '');
            const res = await httpGet(url, UA_PC, SITE + '/');
            const txt = textOf(res);
            try {
                const j = JSON.parse(txt);
                pageCache[pid] = { j: j, ts: Date.now() };
                return j;
            } catch (e) {
                lastTxt = txt;
                lastErr = new Error('JSON解析失败(收到' + txt.length + '字符)');
                log('页面配置解析失败(' + pid + ' 第' + (a + 1) + '次) len=' + txt.length);
            }
        } catch (e) { lastErr = e; }
    }
    const err = new Error('配置获取失败: ' + ((lastErr && lastErr.message) || '未知'));
    if (lastTxt && lastTxt.length > 200) err.partialTxt = lastTxt;   // 残包交给挽救逻辑
    throw err;
}

// ---------- 残包挽救：JSON 解析失败（响应被截断）时，用正则从原始文本里抠出卡片 ----------
function unesc(s) {
    return String(s).replace(/\\u002[fF]/g, '/').replace(/\\\//g, '/').replace(/\\"/g, '"');
}

// 从一段原始 JSON 文本里抠出所有「带标题+封面」的专辑/视频条目
// 注意：线上 JSON 冒号后带空格（"cid": "xxx"），正则必须允许空白
function salvageItems(txt) {
    const out = [], seen = {};
    if (!txt || txt.length < 200) return out;
    // 专辑：找 "cid": "xxxx"
    let re = /"cid":\s*"([a-z0-9]{5,24})"/g, m;
    while ((m = re.exec(txt)) !== null) {
        const win = txt.slice(Math.max(0, m.index - 400), m.index + 600);
        const t = /"title":\s*"((?:[^"\\]|\\.){1,120})"/.exec(win);
        const p = /"coverUrl":\s*"([^"]{10,300})"/.exec(win);
        if (!t || !p) continue;
        const id = 'c' + m[1];
        if (seen[id]) continue;
        const pic = cleanPic(unesc(p[1]));
        if (!pic) continue;
        seen[id] = 1;
        out.push({ vod_id: m[1], vod_name: unesc(t[1]), vod_pic: pic, vod_remarks: '', ext: { cid: m[1], t: unesc(t[1]) } });
    }
    // 视频：找 "vid": "xxxx"（vidNum 等带引号值才匹配，数字字段不受影响）
    re = /"vid":\s*"([a-z0-9]{5,24})"/g;
    while ((m = re.exec(txt)) !== null) {
        const win = txt.slice(Math.max(0, m.index - 400), m.index + 600);
        const t = /"title":\s*"((?:[^"\\]|\\.){1,120})"/.exec(win);
        const p = /"coverUrl":\s*"([^"]{10,300})"/.exec(win);
        if (!t || !p) continue;
        const id = 'v' + m[1];
        if (seen[id]) continue;
        const pic = cleanPic(unesc(p[1]));
        if (!pic) continue;
        seen[id] = 1;
        out.push({ vod_id: m[1], vod_name: unesc(t[1]), vod_pic: pic, vod_remarks: '', ext: { vid: m[1], t: unesc(t[1]) } });
    }
    return out;
}

// 从页面配置 JSON 里按关键词收集卡片（模块名匹配任一关键词；exs 为排除词）
function collectFromModules(j, kws, exs) {
    const mods = (j && j.data && j.data.feedModuleList) || [];
    const cards = [];
    for (let m = 0; m < mods.length; m++) {
        const nm = String(mods[m].moduleName || mods[m].title || mods[m].name || '');
        if (!nm) continue;
        if (kws && kws.length) {
            let matched = false;
            for (let x = 0; x < kws.length; x++) { if (nm.indexOf(kws[x]) >= 0) { matched = true; break; } }
            if (!matched) continue;
        }
        if (exs && exs.length) {
            let excluded = false;
            for (let x = 0; x < exs.length; x++) { if (nm.indexOf(exs[x]) >= 0) { excluded = true; break; } }
            if (excluded) continue;
        }
        const list = mods[m].dataList || [];
        for (let k = 0; k < list.length; k++) {
            const d = list[k];
            let ext = null;
            if (d.dataType === 'album' && d.cid) ext = { cid: d.cid, t: d.title, vip: d.isVip ? 1 : 0 };
            else if (d.dataType === 'video' && d.vid) ext = { vid: d.vid, t: d.title, vip: d.isVip ? 1 : 0 };
            else continue;
            const pic = cleanPic(d.coverUrl);
            if (!d.title || !pic) continue;
            let remark = d.subTitle || '';
            if (d.isVip) remark = (remark ? remark + ' · ' : '') + 'VIP';
            if (d.updateNum && !d.isVip) remark = remark || ('更新至' + d.updateNum + '集');
            cards.push({ vod_id: ext.cid || ext.vid, vod_name: d.title, vod_pic: pic, vod_remarks: remark, ext: ext });
        }
    }
    return cards;
}

// ---------- 分类定义：关键词 + 排除词 + 所需页面（实测映射） ----------
// 页面配置是编辑精选（每模块 8~50 条），这里用宽关键词聚合多个页面里的相关模块，
// 并按条目去重。实测条数：电视剧≈216 电影≈188 动画片≈80 微短剧≈83 纪录片≈82
const CAT_DEF = {
    '电视剧': { kws: ['电视剧', '剧荒', '好剧', '大剧', '追剧', '热播'], ex: ['微短剧', '短剧'], pages: ['PG00000021', 'PG00000002', 'PG00000022'] },
    '电影': { kws: ['电影', '影片', '光影', '影院', '放映厅'], ex: [], pages: ['PG00000021', 'PG00000002', 'PG00000022'] },
    '纪录片': { kws: ['纪录片', '纪录', '纪实'], ex: [], pages: ['PG00000021', 'PG00000002', 'PG00000022'] },
    '动画片': { kws: ['动画', '动漫', '国漫', '青少', '童年', '益智', '卡通'], ex: [], pages: ['PG00000002', 'PG00000022', 'PG00000019'] },
    '微短剧': { kws: ['微短剧', '短剧'], ex: [], pages: ['PG00000021', 'PG00000002', 'PG00000022'] },
    '特别节目': { kws: ['特别节目', '世界杯'], ex: [], pages: ['PG00000023'] }
};
// tab 传入的别名 → 归一到 CAT_DEF 主键
const CAT_ALIAS = { '动画': '动画片', '青少': '动画片', '世界杯': '特别节目' };
const CAT_PAGES_DEFAULT = ['PG00000021', 'PG00000002', 'PG00000022', 'PG00000023'];   // 兜底

function catDefFor(kws) {
    for (let i = 0; i < kws.length; i++) {
        const key = CAT_ALIAS[kws[i]] || kws[i];
        if (CAT_DEF[key]) return CAT_DEF[key];
        // 模糊兼容（如客户端把数组拼成 "动画,青少"）
        for (const k in CAT_DEF) {
            if (kws[i].indexOf(k) >= 0 || k.indexOf(kws[i]) >= 0) return CAT_DEF[k];
        }
    }
    return null;
}

// 分类聚合：并行拉取所需页面（单个失败不影响其他），失败且有残包时挽救
async function cardsFromCategory(kw, limit) {
    const tabKws = Array.isArray(kw) ? kw : [kw];
    const def = catDefFor(tabKws);
    const kws = def ? def.kws : tabKws;
    const exs = def ? def.ex : [];
    const pids = def ? def.pages : CAT_PAGES_DEFAULT;
    const lim = limit || 600;
    const results = await Promise.all(pids.map(function (pid) {
        return fetchPage(pid).then(function (j) { return { pid: pid, j: j }; })
            .catch(function (e) { return { pid: pid, err: e, partial: e.partialTxt || '' }; });
    }));
    const cards = [], seen = {};
    for (let i = 0; i < results.length; i++) {
        const r = results[i];
        let items = [];
        if (r.j) {
            items = collectFromModules(r.j, kws, exs);
        } else if (r.partial) {
            // 残包挽救：按 moduleId 切出模块段，段内任一标题命中关键词即挽救
            // （页面配置里 dataList 在模块 title 之前，所以不能只看第一个 title）
            const segs = r.partial.split(/"moduleId":\s*"(MD[0-9]+)"/);
            for (let s = 1; s < segs.length; s += 2) {
                const seg = segs[s + 1] || '';
                const titles = seg.match(/"title":\s*"((?:[^"\\]|\\.){1,80})"/g) || [];
                let matched = false;
                for (let ti = 0; ti < titles.length; ti++) {
                    const nm = unesc(/"title":\s*"((?:[^"\\]|\\.){1,80})"/.exec(titles[ti])[1]);
                    for (let x = 0; x < kws.length; x++) { if (nm.indexOf(kws[x]) >= 0) { matched = true; break; } }
                    if (matched) break;
                }
                if (!matched) continue;
                items = items.concat(salvageItems(seg));
            }
            log('栏目残包挽救(' + r.pid + '): ' + items.length + ' 条');
        }
        for (let k = 0; k < items.length && cards.length < lim; k++) {
            const key = String(items[k].vod_id);
            if (seen[key]) continue;
            seen[key] = 1;
            cards.push(items[k]);
        }
        if (cards.length >= lim) break;
    }
    return cards;
}

// 各频道实际可入库条数（实测）：PG22=269 PG21=379 PG19=326 PG02=1109 PG20=2337
const LIST_HISTORY = {};   // 栏目最近一次返回的指纹，用于识别客户端的重复翻页请求

// ---------- 栏目 tab：页面配置里的 column 条目聚合 + 常用栏目补充 ----------
// column 条目自带 lid/期数/封面（新闻联播/中国新闻/海峡两岸等，实测 25 个去重栏目）。
// 页面配置中没有的常用栏目用关键词补充；点击栏目卡片 → 搜索该栏目 → 近期各期直接可播。
const COLUMN_EXTRA = ['今日说法', '焦点访谈', '朝闻天下', '新闻30分', '星光大道', '动物世界', '人与自然', '走遍中国', '探索发现', '中国诗词大会', '典籍里的中国', '经典咏流传', '开讲啦'];

async function cardsFromColumns() {
    const pids = ['PG00000002', 'PG00000020', 'PG00000021', 'PG00000022', 'PG00000023', 'PG00000019'];
    const results = await Promise.all(pids.map(function (pid) {
        return fetchPage(pid).then(function (j) { return j; }).catch(function (e) { return null; });
    }));
    const seen = {}, raw = [];
    for (let i = 0; i < results.length; i++) {
        const j = results[i];
        if (!j) continue;
        const mods = (j.data && j.data.feedModuleList) || [];
        for (let m = 0; m < mods.length; m++) {
            const list = mods[m].dataList || [];
            for (let k = 0; k < list.length; k++) {
                const d = list[k];
                if (!d || d.dataType !== 'column' || !d.title) continue;
                if (seen[d.title]) continue;
                seen[d.title] = 1;
                raw.push({
                    title: String(d.title),
                    pic: cleanPic(d.coverUrl),
                    lid: String(d.lid || d.action && d.action.targetId || ''),
                    updateNum: Number(d.updateNum) || 0,
                    periods: String(d.periods || '')
                });
            }
        }
    }
    raw.sort(function (a, b) { return b.updateNum - a.updateNum; });
    const cards = [];
    for (let i = 0; i < raw.length; i++) {
        const c = raw[i];
        let remark = c.periods ? '最新 ' + c.periods : '';
        if (c.updateNum) remark += (remark ? ' · ' : '') + '更新' + c.updateNum + '期';
        cards.push({ vod_id: 'col_' + c.lid + '_' + c.title, vod_name: c.title, vod_pic: c.pic, vod_remarks: remark, ext: { kw: c.title, lid: c.lid } });
    }
    for (let i = 0; i < COLUMN_EXTRA.length; i++) {
        const t = COLUMN_EXTRA[i];
        if (seen[t]) continue;
        cards.push({ vod_id: 'colk_' + t, vod_name: t, vod_pic: '', vod_remarks: '栏目', ext: { kw: t } });
    }
    return cards;
}

const PID_LIMITS = {
    PG00000022: 320,
    PG00000021: 420,
    PG00000019: 380,
    PG00000002: 1200,
    PG00000020: 800,
    PG00000023: 720
};

async function getCards(ext) {
    ext = parseExt(ext);
    // ext 兼容：部分客户端会把数组型 ext 拼成字符串（如 "动画,青少"）
    if (typeof ext.cat === 'string' && /[,，、|]/.test(ext.cat)) ext.cat = ext.cat.split(/[,，、|]/);
    // 翻页保护：数据源是「整页配置」，一次就能给全，没有真正的第 2 页。
    // 若客户端仍然请求 page>=2（老 tab 未标记 hasMore 时会这样），必须返回空数组，
    // 否则同一批数据会被反复追加，界面上表现为「就这十几个一直循环」。
    const pg = Number(ext.page || ext.pg || 0);
    if (pg > 1) return JSON.stringify({ list: [], hasMore: false, pagecount: 1 });
    // ext 解析失败时不要乱走搜索分支，直接给空列表
    if (ext.col === undefined && !ext.diag && !ext.pid && !ext.cat && !ext.kw) return JSON.stringify({ list: [], hasMore: false, pagecount: 1 });

    let cards = [];
    try {
        if (ext.diag) cards = await diagnosticCards();
        else if (ext.pid) cards = await cardsFromPage(ext.pid, PID_LIMITS[ext.pid] || 400);
        else if (ext.cat) cards = await cardsFromCategory(ext.cat, 600);
        else if (ext.col !== undefined) cards = await cardsFromColumns();
        else cards = await cardsFromSearch(ext.kw, 1);
    } catch (e) {
        log('取列表失败: ' + (e && e.message));
    }
    // 最终去重（按 vod_id，其次按标题），并明确告知客户端没有更多页
    const out = [], seen = {};
    for (let i = 0; i < cards.length; i++) {
        const c = cards[i] || {};
        const key = String(c.vod_id || '') || ('t:' + String(c.vod_name || ''));
        if (seen[key]) continue;
        seen[key] = 1;
        out.push(c);
    }
    // 重复请求兜底：极短时间内又请求同一栏目且返回内容完全相同 → 视为客户端在"翻页"，
    // 直接给空数组让它停下，避免同一批卡片被反复追加（否则会无限循环）。
    const ck = String(ext.diag !== undefined ? 'd' + ext.diag : (ext.pid || (ext.col !== undefined ? 'col' : (ext.cat ? 'c:' + ext.cat : 'k:' + ext.kw))));
    const sig = out.length + '|' + out.slice(0, 8).map(function (c) { return String(c.vod_id); }).join(',');
    const now = Date.now();
    const prev = LIST_HISTORY[ck];
    if (prev && prev.sig === sig && now - prev.ts < 1500) {
        LIST_HISTORY[ck] = { sig: sig, ts: now };
        return JSON.stringify({ list: [], hasMore: false, pagecount: 1 });
    }
    LIST_HISTORY[ck] = { sig: sig, ts: now };
    return JSON.stringify({ list: out, hasMore: false, pagecount: 1 });
}

// ==================== 选集 ====================
// 剧集列表首选：移动端 SSR 页面（纯 HTML+JSON，XPTV 可直接抓取）
// window.__STATE_video__.payloads.sharevideo.shareLongVideoRec.episodes.videoList
// 实测：《武林外传》80 集全量返回，hasNextPage=0，仅给 cid 或仅给 vid 都能拿到
function parseSsrState(txt) {
    if (!txt) return null;
    const i = txt.indexOf('window.__STATE_video__');
    if (i < 0) return null;
    const j0 = txt.indexOf('=', i) + 1;
    const j1 = txt.indexOf('</script>', j0);
    const end = j1 > 0 ? j1 : txt.length;
    try { return JSON.parse(txt.slice(j0, end).trim()); } catch (e) { return null; }
}

async function ssrEps(cid, vid) {
    const url = 'https://m.yangshipin.cn/video?type=0'
        + (vid ? '&vid=' + encodeURIComponent(vid) : '')
        + (cid ? '&cid=' + encodeURIComponent(cid) : '');
    const res = await httpGet(url, UA_M, 'https://m.yangshipin.cn/');
    const j = parseSsrState(textOf(res));
    const sv = j && j.payloads && j.payloads.sharevideo;
    const ep = sv && sv.shareLongVideoRec && sv.shareLongVideoRec.episodes;
    const vl = (ep && ep.videoList) || [];
    const eps = [];
    for (let i = 0; i < vl.length; i++) {
        if (vl[i] && vl[i].vid) eps.push({ vid: vl[i].vid, title: String(vl[i].title || '') });
    }
    return eps;
}

// 剧集列表兜底：protobuf 接口（部分客户端对二进制响应返回空，此时上面的 SSR 已先命中）
async function albumEps(cid) {
    // ① JSON 版（设备端可用）：/album/v1/playinfo.json
    try {
        const urlJ = H_CS + '/album/v1/playinfo.json?cid=' + cid + '&ts=' + Math.floor(Date.now() / 1000);
        const resJ = await httpGet(urlJ, UA_PC, SITE + '/');
        const data = (JSON.parse(textOf(resJ)) || {}).data || {};
        const vl = data.videoList || [];
        const epsJ = [];
        for (let i = 0; i < vl.length; i++) {
            if (vl[i] && vl[i].vid) epsJ.push({ vid: vl[i].vid, title: String(vl[i].title || '') });
        }
        if (epsJ.length) return epsJ;
    } catch (e) { log('选集JSON失败: ' + (e && e.message)); }
    // ② protobuf 版兜底
    const url = H_CS + '/album/v1/playinfo?cid=' + cid + '&ts=' + Math.floor(Date.now() / 1000);
    const res = await httpGet(url, UA_PC, SITE + '/');
    const txt = binaryTextOf(res);
    const eps = [];
    const items = scanItems(txt, 320, cid);
    for (let i = 0; i < items.length; i++) {
        const title = readTextField(items[i].seg);
        eps.push({ vid: items[i].id, title: title });
    }
    return eps;
}

function epName(title, i) {
    const m = /第\s*([0-9]+)\s*集/.exec(title || '');
    if (m) return '第' + m[1] + '集';
    if (/^\d+$/.test(String(title || ''))) return '第' + title + '集';
    let t = String(title || '').replace(/<[^>]+>/g, '').trim();
    if (!t) return '第' + (i + 1) + '集';
    return t.length > 22 ? t.substring(0, 22) : t;
}

// VIP 选集过滤：逐集实测可播性（并发6/批）。
// 只删除「服务端明确回 em=100（完全锁死）」的集；
// 返回播放地址（含"可试看5分钟"的VIP集）→ 保留；
// 请求异常/超时/限流等无法判定的情况 → 一律保留，避免误删正常剧集。
// 集数上限 120，超过则不测（避免加载过久）；全部锁死时保留原列表兜底。
async function filterPlayable(eps) {
    const res = new Array(eps.length);
    const CH = 6;
    for (let i = 0; i < eps.length; i += CH) {
        const batch = eps.slice(i, i + CH);
        await Promise.all(batch.map(async function (ep, k) {
            let keep = true;              // 默认保留（失败也不删）
            try {
                let j = await playvinfo(ep.vid, null, 'fhd');
                let u = pickUrl(j);
                if (!u && j && j.tm) { j = await playvinfo(ep.vid, Number(j.tm), 'fhd'); u = pickUrl(j); }
                if (u) keep = true;
                else if (j && Number(j.em) === 100) keep = false;   // 确认锁死才删
            } catch (e) { keep = true; }
            res[i + k] = keep;
        }));
    }
    const out = [];
    for (let i = 0; i < eps.length; i++) if (res[i]) out.push(eps[i]);
    return out;
}

async function getTracks(ext) {
    ext = parseExt(ext);
    // 诊断卡片：点进详情页显示完整诊断文本
    if (ext.diag !== undefined && ext.diag !== '') {
        const idx = Number(ext.diag);
        if (!DIAG.length) { try { await diagnosticCards(); } catch (e) { } }
        const d = DIAG[idx];
        if (d && d.lines.length) return JSON.stringify({ list: [{ title: d.name, tracks: d.lines.map(function (l) { return { name: l, ext: { diagText: 1 } }; }) }] });
        return JSON.stringify({ list: [{ title: '诊断', tracks: [{ name: '(无内容，请回到诊断栏目刷新后重进)', ext: {} }] }] });
    }
    // 栏目卡片（栏目 tab）：取该栏目的各期正片
    // 正片来源 = 纯专辑搜索（type=2）：央视栏目每期发布为一个专辑（标题=栏目名+期数日期），
    // 专辑内嵌 videoList[0] 即当期正片（约 20-30 分钟），带 vid 可直接播放
    // 旧方案的教训：综合搜索排前面的是 3 分钟剧透短视频，必须用专辑搜索 + 时长过滤
    if (ext.kw) {
        const kwS = String(ext.kw);
        let tracksKw = [];
        try {
            // ① 纯专辑搜索翻 2 页（size=30 → 最多 60 期正片）
            const albums = [];
            const seenC = {};
            for (let p = 1; p <= 2; p++) {
                let cards = [];
                try { cards = await cardsFromSearch(kwS, p, 2); } catch (e) { }
                for (let i = 0; i < cards.length; i++) {
                    const c = cards[i];
                    if (!c.ext || !c.ext.cid) continue;
                    const nm = String(c.vod_name || '');
                    // 严格匹配：《栏目名》（带书名号）或标题以栏目名开头，
                    // 避免「内蒙古新闻联播」被当成「新闻联播」的期
                    if (!(nm.indexOf('《' + kwS + '》') >= 0 || nm.indexOf(kwS) === 0)) continue;
                    if (seenC[c.ext.cid]) continue;
                    seenC[c.ext.cid] = 1;
                    // 期数日期（标题里的 8 位数字），用于倒序排列
                    const dm = /20\d{6}/.exec(nm);
                    albums.push({ name: nm, vid: c.ext.vid || '', cid: c.ext.cid, date: dm ? dm[0] : '' });
                }
            }
            albums.sort(function (a, b) { return (b.date || '').localeCompare(a.date || ''); });
            const strip = new RegExp('《[^》]*' + kwS + '[^》]*》\\s*', 'g');
            for (let i = 0; i < albums.length; i++) {
                let nm = albums[i].name.replace(/<[^>]+>/g, '').replace(strip, '').trim() || albums[i].name;
                if (nm.length > 30) nm = nm.substring(0, 30);
                tracksKw.push({ name: nm, ext: albums[i].vid ? { vid: albums[i].vid } : { cid: albums[i].cid } });
            }
        } catch (e) { log('栏目专辑取集失败: ' + (e && e.message)); }
        // ② 专辑搜索不足 → 综合搜索兜底：专辑全收，视频只留正片（时长≥240秒，3分钟剧透/预告排除）
        // 第一轮严格匹配；不足 5 条第二轮放宽为「标题含栏目名」（地方台同名栏目也收，总比剧透强）
        if (tracksKw.length < 5) {
            try {
                const cards = await cardsFromSearch(kwS, 1, 0);
                const seenT = {};
                for (const strict of [true, false]) {
                    if (tracksKw.length >= 5) break;
                    const picked = [];
                    for (let i = 0; i < cards.length; i++) {
                        const c = cards[i];
                        const nm = String(c.vod_name || '').replace(/<[^>]+>/g, '').trim();
                        if (!nm || seenT[nm]) continue;
                        const hit = strict ? (nm.indexOf('《' + kwS + '》') >= 0 || nm.indexOf(kwS) === 0) : (nm.indexOf(kwS) >= 0);
                        if (!hit) continue;
                        const isAlbum = c.ext && c.ext.cid;
                        const dur = (c.ext && c.ext.dur) || 0;
                        if (!isAlbum && dur && dur < 240) continue;   // 短视频=剧透/预告，排除
                        seenT[nm] = 1;
                        picked.push({ name: nm, ext: isAlbum ? { cid: c.ext.cid, vid: c.ext.vid || '' } : { vid: c.vod_id } });
                    }
                    // 专辑在前，其余按标题长度升序（正片标题短）
                    picked.sort(function (a, b) { return (b.ext.cid ? 1 : 0) - (a.ext.cid ? 1 : 0) || String(a.name).length - String(b.name).length; });
                    for (let i = 0; i < picked.length && tracksKw.length < 24; i++) {
                        let nm = picked[i].name;
                        if (nm.length > 30) nm = nm.substring(0, 30);
                        const e2 = picked[i].ext;
                        tracksKw.push({ name: nm, ext: e2.vid ? { vid: e2.vid } : { cid: e2.cid } });
                    }
                }
            } catch (e) { log('栏目综合兜底失败: ' + (e && e.message)); }
        }
        if (!tracksKw.length) tracksKw = [{ name: '（未搜到该栏目的近期节目，可用首页搜索试试）', ext: {} }];
        return JSON.stringify({ list: [{ title: '各期正片', tracks: tracksKw }] });
    }

    const id = ext.id || ext.cid || ext.vid || '';
    const cid = ext.cid || '';
    const vid0 = ext.vid || '';
    let tracks = [];
    // 选集：优先移动端 SSR（纯 JSON，设备端实测可用），protobuf 作兜底
    if (id) {
        const tries = [];
        if (cid || vid0) tries.push(() => ssrEps(cid, vid0));
        if (cid) tries.push(() => ssrEps(cid, ''));
        if (cid) tries.push(() => albumEps(cid));
        for (const fn of tries) {
            try {
                const eps = await fn();
                const seenVid = {};
                for (let i = 0; i < eps.length; i++) {
                    const v = eps[i].vid;
                    if (!v || seenVid[v]) continue;    // 同一 vid 只保留一次，避免选集重复
                    seenVid[v] = 1;
                    tracks.push({ name: epName(eps[i].title, i), ext: { vid: v } });
                }
                if (tracks.length) break;
            } catch (e) { log('取选集失败: ' + (e && e.message)); }
        }
        // 非专辑（单视频）：只有 vid 且 SSR/protobuf 都没给出列表时按正片处理
        if (!tracks.length && !cid && vid0) tracks = [{ name: '正片', ext: { vid: vid0 } }];
    }
    // VIP 专辑：剔除完全锁死（无法播放）的集数，保留可试看的 VIP 集
    if (tracks.length && ext.vip && tracks.length <= 120) {
        try {
            const kept = await filterPlayable(tracks.map(t => ({ vid: t.ext.vid, name: t.name })));
            if (kept.length) {
                log('VIP过滤: ' + tracks.length + ' 集 → 保留 ' + kept.length + ' 集(含试看)');
                tracks = kept.map(e => ({ name: e.name, ext: { vid: e.vid } }));
            }
        } catch (e) { log('VIP过滤失败: ' + (e && e.message)); }
    }
    if (!tracks.length) return JSON.stringify({ list: [] });
    return JSON.stringify({ list: [{ title: '选集', tracks: tracks }] });
}

// ==================== 播放 ====================
function parseJsonp(t) {
    if (!t) return null;
    t = String(t).trim();
    try { return JSON.parse(t); } catch (e) { }
    const i = t.indexOf('('), j = t.lastIndexOf(')');
    if (i >= 0 && j > i) { try { return JSON.parse(t.substring(i + 1, j)); } catch (e) { } }
    return null;
}

async function playvinfo(vid, tm, defn) {
    const t = tm || Math.floor(Date.now() / 1000);
    const qs = 'cmd=2'
        + '&vid=' + encodeURIComponent(vid)
        + '&cKey=' + encodeURIComponent(makeCKey(vid, t))
        + '&tm=' + t
        + '&guid=' + GUID
        + '&appVer=' + APPVER
        + '&platform=' + PLATFORM
        + '&encryptVer=8.1'
        + '&defn=' + (defn || 'fhd')
        + '&otype=json&sphttps=1&sdtfrom=113&host=yangshipin.cn'
        + '&device=PC&system=1&stream=2&pla=0&uhd_flag=4'
        + '&flowid=' + flowid();
    const res = await httpGet(H_PLAY + '?' + qs, UA_M, 'https://m.yangshipin.cn/');
    return parseJsonp(textOf(res));
}

function flowid() {
    let s = '';
    for (let i = 0; i < 32; i++) s += Math.floor(Math.random() * 16).toString(16);
    return s;
}

function pickUrl(j) {
    const vi = j && j.vl && j.vl.vi && j.vl.vi[0];
    if (!vi || !vi.fvkey || !vi.fn) return '';
    let base = '';
    try { base = vi.ul.ui[0].url; } catch (e) { }
    if (!base) base = 'https://mp4playcnc-cdn.ysp.cctv.cn/';
    return base + vi.fn + '?vkey=' + vi.fvkey;
}

async function getPlayinfo(ext) {
    ext = parseExt(ext);
    // 诊断卡片本身不可播放
    if (ext.diagText || (ext.diag !== undefined && ext.diag !== '')) return JSON.stringify({ urls: [] });
    const hdr = { 'User-Agent': UA_M };
    let vid = ext.vid || '';
    const id = ext.cid || ext.id || '';

    // 专辑只给了 cid：取第一集（SSR 优先）
    if (!vid && id && ext.cid) {
        try {
            const eps = await ssrEps(id, '');
            if (eps.length) vid = eps[0].vid;
        } catch (e) { }
        if (!vid) {
            try {
                const eps = await albumEps(id);
                if (eps.length) vid = eps[0].vid;
            } catch (e) { }
        }
    }
    // 只知道一个 id、不清楚是视频还是专辑：先按视频试
    if (!vid && id) {
        try {
            const j0 = await playvinfo(id, null, 'fhd');
            if (pickUrl(j0)) return JSON.stringify({ urls: [pickUrl(j0)], headers: [hdr] });
        } catch (e) { }
        try {
            const eps = await ssrEps('', id);
            if (eps.length) vid = eps[0].vid;
        } catch (e) { }
        if (!vid) {
            try {
                const eps = await albumEps(id);
                if (eps.length) vid = eps[0].vid;
            } catch (e) { }
        }
    }
    if (!vid) {
        log('缺少 vid，无法播放');
        return JSON.stringify({ urls: [] });
    }

    const tries = ['fhd', 'shd', 'hd'];
    let j = null;
    for (let i = 0; i < tries.length; i++) {
        try {
            j = await playvinfo(vid, null, tries[i]);
            let u = pickUrl(j);
            // 服务端时间偏差时，用返回的 tm 再算一次 cKey
            if (!u && j && j.tm) {
                const j2 = await playvinfo(vid, Number(j.tm), tries[i]);
                u = pickUrl(j2);
                j = j2;
            }
            if (u) {
                log('播放: ' + u.substring(0, 100) + '…');
                return JSON.stringify({ urls: [u], headers: [hdr] });
            }
        } catch (e) { log('解析失败(' + tries[i] + '): ' + (e && e.message)); }
    }
    log('未取到播放地址 em=' + (j && j.em));
    return JSON.stringify({ urls: [] });
}

// ==================== 诊断 ====================
// 用于在设备上实测各接口的真实返回形态。
// 卡片可点击：点进详情页可以看到完整的多行诊断文本（卡片上只显示摘要，会被截断）。
var DIAG = [];   // [{ name, lines: [] }]

function dPush(name, lines) {
    DIAG.push({ name: name, lines: lines.map(function (x) { return String(x); }) });
    return DIAG.length - 1;
}

function dCard(name, lines, pic) {
    const idx = dPush(name, lines);
    const summary = (lines.length ? lines[0] : '').substring(0, 50);
    return { vod_id: 'd' + idx, vod_name: name, vod_pic: pic || '', vod_remarks: summary, ext: { diag: idx } };
}

function esc(s) {
    let out = '';
    for (let i = 0; i < s.length && out.length < 110; i++) {
        const c = s.charCodeAt(i);
        if (c >= 0x20 && c <= 0x7e) out += s.charAt(i);
        else if (c < 0x100) out += '\\x' + (c < 16 ? '0' : '') + c.toString(16);
        else out += '\\u' + ('000' + c.toString(16)).slice(-4);
    }
    return out;
}

function typeName(v) {
    return Object.prototype.toString.call(v).replace('[object ', '').replace(']', '');
}

// 把任意 body 归一成「用于观察的字符串」（byte 数组也逐字节映射）
function observeString(b) {
    if (typeof b === 'string') return b;
    try {
        if (b instanceof ArrayBuffer) return bytesToLatin(new Uint8Array(b));
        if (b && typeof b.length === 'number' && typeof b.byteLength === 'number') return bytesToLatin(new Uint8Array(b.buffer || b));
        if (b && typeof b === 'object') {
            const ks = Object.keys(b);
            if (ks.length > 4 && /^[0-9]+$/.test(ks[0])) {
                let s = '';
                for (const k of ks) s += String.fromCharCode(b[k] & 0xff);
                return s;
            }
        }
    } catch (e) { }
    return String(b);
}

// 字符串特征统计：用于唯一判定设备端的二进制编码形态
function strStats(s) {
    const n = s.length;
    let hi = 0, nul = 0, asc = 0, hexOnly = n > 100;
    for (let i = 0; i < n; i++) {
        const c = s.charCodeAt(i);
        if (c > 127) hi++;
        if (c === 0) nul++;
        if (c >= 0x20 && c < 0x7f) asc++;
        if (hexOnly && !/[0-9a-fA-F]/.test(s.charAt(i))) hexOnly = false;
    }
    const codes = [];
    for (let i = 0; i < Math.min(24, n); i++) codes.push(s.charCodeAt(i));
    return {
        len: n, hiPct: Math.round(hi / n * 100), nulPct: Math.round(nul / n * 100),
        ascPct: Math.round(asc / n * 100), hexOnly: hexOnly, codes: codes
    };
}

async function diagnosticCards() {
    DIAG = [];
    const out = [];
    let pic = '';
    // 先拿一张真实封面做占位图
    try {
        const j = await fetchPage('PG00000022');
        const mods = (j && j.data && j.data.feedModuleList) || [];
        for (const m of mods) for (const d of (m.dataList || [])) {
            const p = cleanPic(d.coverUrl);
            if (p) { pic = p; break; }
        }
        out.push({ vod_id: 'dx', vod_name: '✅ JSON页面接口正常(能显示此图即网络OK)', vod_pic: pic, vod_remarks: '点击其他卡片查看完整诊断', ext: {} });
    } catch (e) {
        out.push({ vod_id: 'dx', vod_name: '❌ JSON页面接口失败: ' + (e && e.message), vod_pic: '', vod_remarks: '', ext: {} });
    }

    // ① 选集 protobuf（带请求头）
    let body = null, res1 = null, err1 = '', raw = null;
    try {
        res1 = await httpGet(H_CS + '/album/v1/playinfo?cid=aejjg68xrczdghu&ts=' + Math.floor(Date.now() / 1000), UA_PC, SITE + '/');
        raw = bodyOf(res1);
        body = observeString(raw);
    } catch (e) { err1 = (e && e.message) || String(e); }
    if (err1) {
        out.push(dCard('① 选集接口(带头)', ['❌ 请求抛错: ' + err1], pic));
    } else {
        const st = strStats(body);
        const lines1 = [
            'status=' + (res1 && res1.status) + ' data原始类型=' + typeName(raw),
            '字符串长度=' + st.len + ' 高位(>127)占' + st.hiPct + '% ASCII占' + st.ascPct + '% NUL占' + st.nulPct + '%',
            '开头40字:「' + esc(body.substring(0, 40)) + '」',
            '前24个码点: ' + st.codes.join(','),
            '疑似纯hex编码: ' + (st.hexOnly ? '是' : '否') + ' | 疑似gzip: ' + (body.substring(0, 2) === '\x1f\x8b' ? '是' : '否')
        ];
        out.push(dCard('① 选集接口(带头)', lines1, pic));

        // ② base64 判定与解码
        if (looksLikeBase64(body)) {
            const dec = b64ToLatin(body);
            out.push(dCard('② base64判定', [
                '是base64, 解码' + (dec ? '成功' + dec.length + '字节' : '失败'),
                dec ? '解码开头:「' + esc(dec.substring(0, 40)) + '」' : '(解码为空)',
                dec ? '解码后前24码点: ' + strStats(dec).codes.join(',') : ''
            ].filter(function (x) { return x; }), pic));
        } else {
            out.push(dCard('② base64判定', ['否(data不是base64字符串)'], pic));
        }

        // ③ hex 判定与解码
        if (st.hexOnly) {
            let hexDec = '';
            try {
                for (let i = 0; i + 1 < body.length; i += 2) hexDec += String.fromCharCode(parseInt(body.substr(i, 2), 16));
            } catch (e) { }
            out.push(dCard('③ hex判定', [
                '是纯hex, 解码' + (hexDec ? '成功' + hexDec.length + '字节' : '失败'),
                hexDec ? '解码开头:「' + esc(hexDec.substring(0, 40)) + '」' : ''
            ].filter(function (x) { return x; }), pic));
        } else {
            out.push(dCard('③ hex判定', ['否(data不是hex字符串)'], pic));
        }

        // ④ 选集解析明细（关键卡片）
        try {
            const ssr = await ssrEps('aejjg68xrczdghu', '');
            out.push(dCard('④ 选集解析明细', [
                'SSR方式(移动端网页): ' + ssr.length + ' 集' + (ssr.length ? ', 首集vid=' + ssr[0].vid : ''),
                'SSR方式为纯HTML+JSON, 不依赖二进制接口',
                'protobuf方式: ' + (await albumEps('aejjg68xrczdghu')).length + ' 集'
            ], pic));
        } catch (e) {
            out.push(dCard('④ 选集解析明细', ['❌ 抛错: ' + (e && e.message)], pic));
        }

        // ④b 响应对象结构：看 XPTV 把二进制放在了哪个字段
        if (res1 && typeof res1 === 'object') {
            const lines = [];
            for (const k of Object.keys(res1)) {
                const v = res1[k];
                let d = typeName(v);
                if (typeof v === 'string') d += ' 长度=' + v.length;
                else if (v && typeof v.length === 'number') d += ' 长度=' + v.length;
                else if (typeof v === 'function') d += ' (函数)';
                else if (v && typeof v === 'object') { try { d += ' keys=' + Object.keys(v).slice(0, 8).join('|'); } catch (e) { } }
                lines.push(k + ': ' + d);
            }
            out.push(dCard('④b 响应对象结构', lines.length ? lines : ['(无键名)'], pic));
        }
    }

    // ⑤ 选集接口（裸请求，不带任何请求头）
    try {
        const res5 = await $fetch.get(H_CS + '/album/v1/playinfo?cid=aejjg68xrczdghu&ts=' + Math.floor(Date.now() / 1000));
        const b5 = observeString(bodyOf(res5));
        const st5 = strStats(b5);
        out.push(dCard('⑤ 选集接口(裸)', [
            'status=' + (res5 && res5.status) + ' 长度=' + st5.len + ' 高位占' + st5.hiPct + '%',
            '开头40字:「' + esc(b5.substring(0, 40)) + '」',
            '前24个码点: ' + st5.codes.join(',')
        ], pic));
    } catch (e) { out.push(dCard('⑤ 选集接口(裸)', ['❌ 抛错: ' + (e && e.message)], pic)); }

    // ⑥ 播放接口（带头，验证 Referer 是否被送达）
    try {
        const j6 = await playvinfo('h000032u340', null, 'fhd');
        const vi6 = j6 && j6.vl && j6.vl.vi && j6.vl.vi[0];
        out.push(dCard('⑥ 播放接口(带头)', [vi6 ? '✅ OK fn=' + vi6.fn : '❌ em=' + (j6 && j6.em) + '(em=200说明Referer头没送达)'], pic));
    } catch (e) { out.push(dCard('⑥ 播放接口(带头)', ['❌ 抛错: ' + (e && e.message)], pic)); }

    // ⑦ 搜索 protobuf
    try {
        const res7 = await httpGet('https://csapi.yangshipin.cn/voapi/omsotm/v2/search?type=0&query=' + encodeURIComponent('纪录片') + '&page=1&size=24', UA_PC, 'https://m.yangshipin.cn/');
        const b7 = observeString(bodyOf(res7));
        const st7 = strStats(b7);
        out.push(dCard('⑦ 搜索接口', [
            'status=' + (res7 && res7.status) + ' 长度=' + st7.len + ' 高位占' + st7.hiPct + '%',
            '开头40字:「' + esc(b7.substring(0, 40)) + '」',
            '前24个码点: ' + st7.codes.join(',')
        ], pic));
    } catch (e) { out.push(dCard('⑦ 搜索接口', ['❌ 抛错: ' + (e && e.message)], pic)); }

    // ⑧ 栏目取集实测：直接跑「栏目→专辑搜索→各期正片」完整链路，看真实返回
    try {
        const r8 = JSON.parse(await getTracks({ kw: '今日说法' }));
        const tr8 = (r8.list && r8.list[0] && r8.list[0].tracks) || [];
        const names8 = tr8.slice(0, 3).map(function (t) { return String(t.name).substring(0, 20); });
        out.push(dCard('⑧ 栏目取集实测(今日说法)', [
            tr8.length + ' 期' + (names8.length ? '，如: ' + names8.join(' / ') : ''),
            tr8.length ? '✅ 链路正常（各期应为「期数+标题」，非3分钟剧透）' : '❌ 专辑搜索链路在设备端失败'
        ], pic));
    } catch (e) { out.push(dCard('⑧ 栏目取集实测(今日说法)', ['❌ 抛错: ' + (e && e.message)], pic)); }

    return out;
}

// 搜索兜底：protobuf 接口不可用时，在页面配置的条目标题里做纯 JSON 匹配
async function searchFromPages(text) {
    const cards = [], seen = {};
    const kw = String(text).toLowerCase();
    const pages = CAT_PAGES_DEFAULT;
    for (let i = 0; i < pages.length && cards.length < 60; i++) {
        let j;
        try { j = await fetchPage(pages[i]); } catch (e) { continue; }
        const mods = (j && j.data && j.data.feedModuleList) || [];
        for (let m = 0; m < mods.length; m++) {
            const list = mods[m].dataList || [];
            for (let k = 0; k < list.length; k++) {
                const d = list[k];
                let id = '', ext = null;
                if (d.dataType === 'album' && d.cid) { id = 'c' + d.cid; ext = { cid: d.cid, t: d.title, vip: d.isVip ? 1 : 0 }; }
                else if (d.dataType === 'video' && d.vid) { id = 'v' + d.vid; ext = { vid: d.vid, t: d.title, vip: d.isVip ? 1 : 0 }; }
                else continue;
                if (seen[id]) continue;
                const pic = cleanPic(d.coverUrl);
                if (!d.title || !pic) continue;
                if (String(d.title).toLowerCase().indexOf(kw) < 0) continue;
                seen[id] = 1;
                cards.push({ vod_id: ext.cid || ext.vid, vod_name: d.title, vod_pic: pic, vod_remarks: d.subTitle || '', ext: ext });
            }
        }
    }
    return cards;
}

// ==================== 搜索 ====================
async function search(ext) {
    ext = parseExt(ext);
    const text = ext.wd || ext.text || ext.kw || '';
    if (!text) return JSON.stringify({ list: [], hasMore: false, pagecount: 1 });
    // 同样做翻页保护，避免搜索页无限追加重复结果
    const pg = Number(ext.page || ext.pg || 1);
    if (pg > 1) return JSON.stringify({ list: [], hasMore: false, pagecount: 1 });
    let cards = [];
    try { cards = await cardsFromSearch(text, 1); } catch (e) { log('搜索失败: ' + (e && e.message)); }
    if (cards.length < 3) {
        try {
            const alt = await searchFromPages(text);
            if (alt.length > cards.length) cards = alt;
        } catch (e) { }
    }
    const out = [], seen = {};
    for (let i = 0; i < cards.length; i++) {
        const c = cards[i] || {};
        const key = String(c.vod_id || '') || ('t:' + String(c.vod_name || ''));
        if (seen[key]) continue;
        seen[key] = 1;
        out.push(c);
    }
    return JSON.stringify({ list: out, hasMore: false, pagecount: 1 });
}

// 便于本地测试；XPTV 里 module 不存在会跳过
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { getConfig, getCards, getTracks, getPlayinfo, search, makeCKey, aesCbcHex, parseSearchItems, albumEps, utf8Fix, salvageItems, collectFromModules, unesc, cardsFromCategory, fetchPage, catDefFor, playvinfo, pickUrl, cardsFromSearch, cardsFromSearchJson };
}
