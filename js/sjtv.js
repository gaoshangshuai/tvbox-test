/* ============================================================================
 * CCTV(全能版) - 支持经典大剧、特别节目分类，以及动态签名
 * ==========================================================================*/

const CryptoJS = (typeof createCryptoJS === 'function') ? createCryptoJS() : null

const CFG = {
    site: 'https://m.cctv5g.com',
    ver: '3.5.4',
    uuid: 'LmDaHCBrLwpEeAJhjC81794805107717',
    signKey: '&*UJyui23DR%$#SD&*5H5J3!',
    ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1',
    cookie: '' 
}

let appConfig = {
    ver: 1,
    title: 'CCTV(全能版)',
    site: CFG.site,
    tabs: [
        { name: '经典大剧', ext: { type: 'drama' } },
        { name: '特别节目', ext: { type: 'live', id: '31813' } } // 👈 新增的分类
    ],
}

async function getConfig() { return JSON.stringify(appConfig) }

/* ============================ 1. 3DES 动态签名核心算法 ============================ */
const _IP = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7]
const _FP = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25]
const _E  = [32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1]
const _P  = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25]
const _PC1= [57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4]
const _PC2= [14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32]
const _SHIFT = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1]
const _S = [
[14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
[15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
[10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
[7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
[2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
[12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
[4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
[13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]
]
function _utf8Bytes(s) { const o = []; for (let i = 0; i < s.length; i++) { let c = s.charCodeAt(i); if (c < 0x80) o.push(c); else if (c < 0x800) o.push(0xC0 | (c >> 6), 0x80 | (c & 63)); else if (c >= 0xD800 && c <= 0xDBFF && i + 1 < s.length) { const d = s.charCodeAt(i + 1); const cp = 0x10000 + ((c - 0xD800) << 10) + (d - 0xDC00); i++; o.push(0xF0 | (cp >> 18), 0x80 | ((cp >> 12) & 63), 0x80 | ((cp >> 6) & 63), 0x80 | (cp & 63)); } else o.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63)); } return o; }
function _bits(bytes) { const o = []; for (let i = 0; i < bytes.length; i++) for (let b = 7; b >= 0; b--) o.push((bytes[i] >> b) & 1); return o; }
function _bytes(bits) { const o = []; for (let i = 0; i < bits.length; i += 8) { let v = 0; for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j]; o.push(v); } return o; }
function _perm(bits, table) { const o = new Array(table.length); for (let i = 0; i < table.length; i++) o[i] = bits[table[i] - 1]; return o; }
function _subkeys(k8) { const kb = _perm(_bits(k8), _PC1); let c = kb.slice(0, 28), d = kb.slice(28, 56); const ks = []; for (let r = 0; r < 16; r++) { c = c.slice(_SHIFT[r]).concat(c.slice(0, _SHIFT[r])); d = d.slice(_SHIFT[r]).concat(d.slice(0, _SHIFT[r])); ks.push(_perm(c.concat(d), _PC2)); } return ks; }
function _f(r, k) { const x = _perm(r, _E); for (let i = 0; i < 48; i++) x[i] ^= k[i]; const o = []; for (let i = 0; i < 8; i++) { const g = x.slice(i * 6, i * 6 + 6); const row = (g[0] << 1) | g[5]; const col = (g[1] << 3) | (g[2] << 2) | (g[3] << 1) | g[4]; const v = _S[i][row * 16 + col]; for (let b = 3; b >= 0; b--) o.push((v >> b) & 1); } return _perm(o, _P); }
function _desBlock(b8, ks, dec) { const ip = _perm(_bits(b8), _IP); let l = ip.slice(0, 32), r = ip.slice(32, 64); for (let i = 0; i < 16; i++) { const k = ks[dec ? 15 - i : i]; const fv = _f(r, k); const nl = r, nr = new Array(32); for (let j = 0; j < 32; j++) nr[j] = l[j] ^ fv[j]; l = nl; r = nr; } return _bytes(_perm(r.concat(l), _FP)); }
function _b64(bytes) { const cs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'; let s = ''; for (let i = 0; i < bytes.length; i += 3) { const a = bytes[i], b = bytes[i + 1], c = bytes[i + 2]; s += cs[a >> 2]; s += cs[((a & 3) << 4) | ((b === undefined ? 0 : b) >> 4)]; s += b === undefined ? '=' : cs[((b & 15) << 2) | ((c === undefined ? 0 : c) >> 6)]; s += c === undefined ? '=' : cs[c & 63]; } return s; }
function _des3EcbB64(text, keyText) { const data = _utf8Bytes(text), key = _utf8Bytes(keyText); const ks = [_subkeys(key.slice(0, 8)), _subkeys(key.slice(8, 16)), _subkeys(key.slice(16, 24))]; const pad = 8 - (data.length % 8), padded = data.slice(); for (let i = 0; i < pad; i++) padded.push(pad); const out = []; for (let i = 0; i < padded.length; i += 8) { let b = _desBlock(padded.slice(i, i + 8), ks[0], false); b = _desBlock(b, ks[1], true); b = _desBlock(b, ks[2], false); for (let j = 0; j < 8; j++) out.push(b[j]); } return _b64(out); }
function _cryptoJsAfas(common) { return CryptoJS.TripleDES.encrypt(common, CryptoJS.enc.Utf8.parse(CFG.signKey), { mode: CryptoJS.mode.ECB, padding: CryptoJS.pad.Pkcs7 }).toString() }
const KAT_IN = 'wdVersionName=3.5.4&wdClientType=3&timestamp=1794805271116&uuid=LmDaHCBrLwpEeAJhjC81794805107717'
const KAT_OUT = 'mtFp8cWJ98DsDNfE6FoFOI8J5k1eFIq7jDAAxnG1Gn0CHQua4MQRuuvHRKjYiLcJ0osrom1hejpr5fUvq2F4OaJlLqXx2jR/Pd5Lru/3YBcxGF2u1yFO797nsFQ9pJusEYXX/R3ByIc='
const USE_CRYPTOJS = (function () { if (!CryptoJS || !CryptoJS.TripleDES || !CryptoJS.enc || !CryptoJS.mode || !CryptoJS.pad) return false; try { return _cryptoJsAfas(KAT_IN) === KAT_OUT } catch (e) { return false } })()
function makeAfas(common) { return USE_CRYPTOJS ? _cryptoJsAfas(common) : _des3EcbB64(common, CFG.signKey) }
function commonParams(ts) { return `wdVersionName=${CFG.ver}&wdClientType=3&timestamp=${ts}&uuid=${CFG.uuid}` }
function signedHeaders(ts, extra) { const c = commonParams(ts); const h = { 'accept': 'application/json, text/plain, */*', 'user-agent': CFG.ua, 'commmonparams': c, 'timestamp': ts, 'afas': makeAfas(c) }; if (CFG.cookie) h['cookie'] = CFG.cookie; if (extra) for (const k in extra) if (Object.prototype.hasOwnProperty.call(extra, k)) h[k] = extra[k]; return h; }
function commonQuery(ts) { return `channel=cctv&wdClientType=3&wdAppId=3&wdVersionName=${CFG.ver}&uuid=${CFG.uuid}&timestamp=${ts}` }

/* ============================ 2. 通用请求工具 ============================ */
function parseJson(data) { if (data && typeof data === 'object') return data; if (typeof data !== 'string') return { resultCode: '-998', resultMsg: '空响应' }; const s = data.replace(/^\uFEFF/, '').trim(); try { return JSON.parse(s) } catch (e) { return { resultCode: '-999', resultMsg: '响应非JSON: ' + s.slice(0, 90) } } }
function isTimeError(j) { const m = j.resultMsg || ''; return j.resultCode === '-2' || (j.resultCode === '1111' && /时间|请求错误/.test(m)) }
async function apiGet(pathWithQuery, extraHeaders) { let ts = Date.now().toString(), j = {}; for (let i = 0; i < 2; i++) { const url = `${CFG.site}${pathWithQuery}${pathWithQuery.indexOf('?') >= 0 ? '&' : '?'}${commonQuery(ts)}`; const res = await $fetch.get(url, { headers: signedHeaders(ts, extraHeaders) }); j = parseJson(res && res.data !== undefined ? res.data : res); if (isTimeError(j) && j.systemTime) { const st = String(j.systemTime); if (st !== ts) { ts = st; continue } } break; } return j; }
function h5Headers(contId) { return { referer: `${CFG.site}/yctv/demand?contId=${contId || ''}&dataType=3`, origin: CFG.site } }
function toObj(ext) { if (typeof ext === 'string') { try { return JSON.parse(ext) } catch (e) { return {} } } return (ext && typeof ext === 'object') ? ext : {} }
function cleanName(n) { const s = String(n || '').trim(); const c = s.replace(/^《[^》]+》\s*/, ''); return c || s || '未命名' }
function https(u) { return String(u || '').replace(/^http:\/\//i, 'https://') }
function failList(msg) { return JSON.stringify({ list: [{ title: '获取失败', tracks: [{ name: msg, ext: {} }] }] }) }

/* ============================ 3. 业务函数 ============================ */
async function getCards(ext) {
    const o = toObj(ext)
    const type = o.type || 'drama'
    const page = Number(o.page || 1)

    if (type === 'drama') {
        if (page > 1) return JSON.stringify({ list: [] })
        const cards = [
            { vod_id: '3523153', vod_name: '西游记', vod_pic: 'https://ydvodnyun.cctv4g.com/mnt/data/remote/vod/vod/523/2021/09/02/144345/picture/ys0812ycxy00_cntv_H53_sc.jpg', vod_remarks: '25集全', ext: { id: '3523153', dataType: '3' } },
            { vod_id: '4822954', vod_name: '海天雄鹰', vod_pic: 'https://ydvodnyun.cctv4g.com/cntv/image/0/813/616.jpg', vod_remarks: '35集全', ext: { id: '4822954', dataType: '3' } },
            { vod_id: '4655707', vod_name: '江河之上', vod_pic: 'https://ydvodnyun.cctv4g.com/cntv/image/0/650/43.jpg', vod_remarks: '34集全', ext: { id: '4655707', dataType: '3' } }
        ]
        return JSON.stringify({ list: cards })
    } 
    else if (type === 'live') {
        // 🚨 特别节目列表解析 (himg.jsp)
        const nodeId = o.id || '31813'
        const path = `/cntv/resource/cltv2/himg.jsp?nodeId=${nodeId}&start=${page}`
        const j = await apiGet(path, h5Headers())
        
        if (j.resultCode !== '0000') {
            return JSON.stringify({ list: [{ vod_id: "err", vod_name: "请求失败:" + j.resultMsg, vod_pic: "", vod_remarks: "", ext: {} }] })
        }

        const list = j.recommnedList || []
        const cards = list.map(e => ({
            vod_id: String(e.contId || e.videoId || e.srcContId),
            vod_name: e.name || e.videoOriginalTitle || '特别节目',
            vod_pic: https(e.imageURL),
            vod_remarks: e.totalTime || "精彩推荐",
            ext: { id: String(e.contId || e.videoId || e.srcContId), dataType: '3' }
        }))
        return JSON.stringify({ list: cards })
    }
    return JSON.stringify({ list: [] })
}

async function getTracks(ext) {
    const o = toObj(ext)
    const contId = String(o.id || o.contId || '')
    if (!contId) return failList('缺少 contId')

    // 无论是电视剧还是特别节目，抓取详情页的逻辑是一样的
    let j = await apiGet(`/cntv/resource/cltv2/dramaDetailPage.jsp?contId=${encodeURIComponent(contId)}&dataType=3`, h5Headers(contId))
    if (j.resultCode !== '0000') return failList(`接口报错: ${j.resultMsg}`)

    const items = (j.dramaList && j.dramaList.length) ? j.dramaList : (j.termList && j.termList.length) ? j.termList : []
    const tracks = []
    
    if (items.length) {
        items.forEach((e, i) => {
            tracks.push({
                name: cleanName(e.dramaName || e.name || `第${i + 1}集`),
                ext: { playContId: String(e.playContId || ''), contId: String(e.contId || e.videoId || ''), dataType: '3' }
            })
        })
    } else if (j.dramaInfo && j.dramaInfo.playContId) {
         // 单集特别节目可能直接在 dramaInfo 里
         tracks.push({
            name: cleanName(j.dramaInfo.videoOriginalTitle || j.dramaInfo.name || '正片'),
            ext: { playContId: String(j.dramaInfo.playContId), contId: String(j.dramaInfo.contId || contId), dataType: '3' }
        })
    } else {
        tracks.push({ name: '该节目暂无剧集数据', ext: {} })
    }

    return JSON.stringify({ list: [{ title: cleanName((j.dramaInfo || {}).name) || '默认剧集', tracks }] })
}

async function resolvePlayContId(contId, dataType, nested) {
    if (!contId) return ''
    try {
        let j = await apiGet(`/cntv/resource/cltv2/dramaDetail.jsp?contId=${encodeURIComponent(contId)}&dataType=3`, h5Headers(contId))
        if (j.playContId) return String(j.playContId)
        if (nested !== false) {
            j = await apiGet(`/cntv/resource/cltv2/dramaDetailPage.jsp?contId=${encodeURIComponent(contId)}&dataType=3`, h5Headers(contId))
            const d = (j.dramaList || j.termList || j.choiceList || [])[0]
            if (d && d.playContId) return String(d.playContId)
            if (j.dramaInfo && j.dramaInfo.playContId) return String(j.dramaInfo.playContId)
        }
    } catch (e) {}
    return ''
}

async function getPlayinfo(ext) {
    const o = toObj(ext)
    let pid = String(o.playContId || '')
    let contId = String(o.contId || o.id || '')

    if (!pid && contId) pid = await resolvePlayContId(contId, '3')
    if (!pid) return JSON.stringify({ urls: [], msg: '缺少 playContId（剧集数据异常）' })

    // 统一走取流接口
    let j = await apiGet(`/cntv/clt/getPlayUrl.msp?contId=${encodeURIComponent(pid)}&dataType=3`, h5Headers(contId))
    
    if (j.resultCode !== '0000') {
        return JSON.stringify({ urls: [], msg: `取流失败 ${j.resultCode}: ${j.resultMsg || ''}` })
    }

    const urls = []
    const list = j.playUrls || []
    list.forEach(it => {
        let u = it.playurl || it.playUrl || it.url || ''
        if (typeof u === 'string' && u) {
            u = https(u.replace(/\\\//g, '/'))
            if (urls.indexOf(u) < 0) urls.push(u)
        }
    })

    if (!urls.length) {
        const m = JSON.stringify(j).match(/https?:\\?\/\\?\/[^"'\s]+?\.(?:m3u8|mp4)[^"'\s]*/gi)
        if (m) urls.push(https(m[0].replace(/\\\//g, '/').replace(/\\/g, '')))
    }
    
    if (!urls.length) return JSON.stringify({ urls: [], msg: '该集暂无可播放地址' })
    return JSON.stringify({ urls })
}

async function search(ext) {
    // 搜索功能保持原样
    let wd = '', page = 1
    const o = toObj(ext)
    if (typeof ext === 'string' && !o.wd) wd = ext.trim()
    else wd = String(o.wd || o.keyword || o.k || '').trim()
    page = Number(o.pg || o.page || 1) || 1
    if (!wd) return JSON.stringify({ list: [] })

    let j = await apiGet(`/cntv/resource/cltv2/search.jsp?k=${encodeURIComponent(wd)}&start=${(page - 1) * 20}`, { referer: `${CFG.site}/yctv/search`, origin: CFG.site })
    if (j.resultCode !== '0000') return JSON.stringify({ list: [] })

    const src = (j.searchResult && j.searchResult.contentList) || []
    const list = src.map(e => ({
        vod_id: String(e.contId || e.progId || e.videoId || ''),
        vod_name: cleanName(e.contName || e.videoOriginalTitle || e.name),
        vod_pic: https(e.imageURL),
        vod_remarks: e.updateDesc || e.publishTime || '',
        ext: { id: String(e.contId || e.progId || e.videoId), dataType: '3' }
    })).filter(item => item.vod_id !== '')

    return JSON.stringify({ list, pagecount: page + 1 })
}
