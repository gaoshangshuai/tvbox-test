// 优酷 - XPTV 终极破解版（修复列表崩溃，完整还原签名请求）
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36'

// ==========================================
// MD5 算法内置
// ==========================================
function MD5(string) {
    function RotateLeft(lValue, iShiftBits) { return (lValue << iShiftBits) | (lValue >>> (32 - iShiftBits)); }
    function AddUnsigned(lX, lY) {
        var lX4, lY4, lX8, lY8, lResult;
        lX8 = (lX & 0x80000000); lY8 = (lY & 0x80000000);
        lX4 = (lX & 0x40000000); lY4 = (lY & 0x40000000);
        lResult = (lX & 0x3FFFFFFF) + (lY & 0x3FFFFFFF);
        if (lX4 & lY4) return (lResult ^ 0x80000000 ^ lX8 ^ lY8);
        if (lX4 | lY4) {
            if (lResult & 0x40000000) return (lResult ^ 0xC0000000 ^ lX8 ^ lY8);
            else return (lResult ^ 0x40000000 ^ lX8 ^ lY8);
        } else return (lResult ^ lX8 ^ lY8);
    }
    function F(x, y, z) { return (x & y) | ((~x) & z); }
    function G(x, y, z) { return (x & z) | (y & (~z)); }
    function H(x, y, z) { return (x ^ y ^ z); }
    function I(x, y, z) { return (y ^ (x | (~z))); }
    function FF(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(F(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
    function GG(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(G(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
    function HH(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(H(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
    function II(a, b, c, d, x, s, ac) { a = AddUnsigned(a, AddUnsigned(AddUnsigned(I(b, c, d), x), ac)); return AddUnsigned(RotateLeft(a, s), b); }
    function ConvertToWordArray(string) {
        var lWordCount, lMessageLength = string.length, lNumberOfWords_temp1 = lMessageLength + 8;
        var lNumberOfWords_temp2 = (lNumberOfWords_temp1 - (lNumberOfWords_temp1 % 64)) / 64;
        var lNumberOfWords = (lNumberOfWords_temp2 + 1) * 16;
        var lWordArray = Array(lNumberOfWords - 1);
        var lBytePosition = 0, lByteCount = 0;
        while (lByteCount < lMessageLength) {
            lWordCount = (lByteCount - (lByteCount % 4)) / 4;
            lBytePosition = (lByteCount % 4) * 8;
            lWordArray[lWordCount] = (lWordArray[lWordCount] | (string.charCodeAt(lByteCount) << lBytePosition));
            lByteCount++;
        }
        lWordCount = (lByteCount - (lByteCount % 4)) / 4;
        lBytePosition = (lByteCount % 4) * 8;
        lWordArray[lWordCount] = lWordArray[lWordCount] | (0x80 << lBytePosition);
        lWordArray[lNumberOfWords - 2] = lMessageLength << 3;
        lWordArray[lNumberOfWords - 1] = lMessageLength >>> 29;
        return lWordArray;
    }
    function WordToHex(lValue) {
        var WordToHexValue = "", WordToHexValue_temp = "", lByte, lCount;
        for (lCount = 0; lCount <= 3; lCount++) {
            lByte = (lValue >>> (lCount * 8)) & 255;
            WordToHexValue_temp = "0" + lByte.toString(16);
            WordToHexValue = WordToHexValue + WordToHexValue_temp.substr(WordToHexValue_temp.length - 2, 2);
        }
        return WordToHexValue;
    }
    function Utf8Encode(string) {
        string = string.replace(/\r\n/g, "\n");
        var utftext = "";
        for (var n = 0; n < string.length; n++) {
            var c = string.charCodeAt(n);
            if (c < 128) utftext += String.fromCharCode(c);
            else if ((c > 127) && (c < 2048)) { utftext += String.fromCharCode((c >> 6) | 192); utftext += String.fromCharCode((c & 63) | 128); }
            else { utftext += String.fromCharCode((c >> 12) | 224); utftext += String.fromCharCode(((c >> 6) & 63) | 128); utftext += String.fromCharCode((c & 63) | 128); }
        }
        return utftext;
    }
    var x = Array();
    var k, AA, BB, CC, DD, a, b, c, d;
    var S11 = 7, S12 = 12, S13 = 17, S14 = 22, S21 = 5, S22 = 9, S23 = 14, S24 = 20, S31 = 4, S32 = 11, S33 = 16, S34 = 23, S41 = 6, S42 = 10, S43 = 15, S44 = 21;
    string = Utf8Encode(string);
    x = ConvertToWordArray(string);
    a = 0x67452301; b = 0xEFCDAB89; c = 0x98BADCFE; d = 0x10325476;
    for (k = 0; k < x.length; k += 16) {
        AA = a; BB = b; CC = c; DD = d;
        a = FF(a, b, c, d, x[k + 0], S11, 0xD76AA478); d = FF(d, a, b, c, x[k + 1], S12, 0xE8C7B756); c = FF(c, d, a, b, x[k + 2], S13, 0x242070DB); b = FF(b, c, d, a, x[k + 3], S14, 0xC1BDCEEE);
        a = FF(a, b, c, d, x[k + 4], S11, 0xF57C0FAF); d = FF(d, a, b, c, x[k + 5], S12, 0x4787C62A); c = FF(c, d, a, b, x[k + 6], S13, 0xA8304613); b = FF(b, c, d, a, x[k + 7], S14, 0xFD469501);
        a = FF(a, b, c, d, x[k + 8], S11, 0x698098D8); d = FF(d, a, b, c, x[k + 9], S12, 0x8B44F7AF); c = FF(c, d, a, b, x[k + 10], S13, 0xFFFF5BB1); b = FF(b, c, d, a, x[k + 11], S14, 0x895CD7BE);
        a = FF(a, b, c, d, x[k + 12], S11, 0x6B901122); d = FF(d, a, b, c, x[k + 13], S12, 0xFD987193); c = FF(c, d, a, b, x[k + 14], S13, 0xA679438E); b = FF(b, c, d, a, x[k + 15], S14, 0x49B40821);
        a = GG(a, b, c, d, x[k + 1], S21, 0xF61E2562); d = GG(d, a, b, c, x[k + 6], S22, 0xC040B340); c = GG(c, d, a, b, x[k + 11], S23, 0x265E5A51); b = GG(b, c, d, a, x[k + 0], S24, 0xE9B6C7AA);
        a = GG(a, b, c, d, x[k + 5], S21, 0xD62F105D); d = GG(d, a, b, c, x[k + 10], S22, 0x02441453); c = GG(c, d, a, b, x[k + 15], S23, 0xD8A1E681); b = GG(b, c, d, a, x[k + 4], S24, 0xE7D3FBC8);
        a = GG(a, b, c, d, x[k + 9], S21, 0x21E1CDE6); d = GG(d, a, b, c, x[k + 14], S22, 0xC33707D6); c = GG(c, d, a, b, x[k + 3], S23, 0xF4D50D87); b = GG(b, c, d, a, x[k + 8], S24, 0x455A14ED);
        a = GG(a, b, c, d, x[k + 13], S21, 0xA9E3E905); d = GG(d, a, b, c, x[k + 2], S22, 0xFCEFA3F8); c = GG(c, d, a, b, x[k + 7], S23, 0x676F02D9); b = GG(b, c, d, a, x[k + 12], S24, 0x8D2A4C8A);
        a = HH(a, b, c, d, x[k + 5], S31, 0xFFFA3942); d = HH(d, a, b, c, x[k + 8], S32, 0x8771F681); c = HH(c, d, a, b, x[k + 11], S33, 0x6D9D6122); b = HH(b, c, d, a, x[k + 14], S34, 0xFDE5380C);
        a = HH(a, b, c, d, x[k + 1], S31, 0xA4BEEA44); d = HH(d, a, b, c, x[k + 4], S32, 0x4BDECFA9); c = HH(c, d, a, b, x[k + 7], S33, 0xF6BB4B60); b = HH(b, c, d, a, x[k + 10], S34, 0xBEBFBC70);
        a = HH(a, b, c, d, x[k + 13], S31, 0x289B7EC6); d = HH(d, a, b, c, x[k + 0], S32, 0xEAA127FA); c = HH(c, d, a, b, x[k + 3], S33, 0xD4EF3085); b = HH(b, c, d, a, x[k + 6], S34, 0x04881D05);
        a = HH(a, b, c, d, x[k + 9], S31, 0xD9D4D039); d = HH(d, a, b, c, x[k + 12], S32, 0xE6DB99E5); c = HH(c, d, a, b, x[k + 15], S33, 0x1FA27CF8); b = HH(b, c, d, a, x[k + 2], S34, 0xC4AC5665);
        a = II(a, b, c, d, x[k + 0], S41, 0xF4292244); d = II(d, a, b, c, x[k + 7], S42, 0x432AFF97); c = II(c, d, a, b, x[k + 14], S43, 0xAB9423A7); b = II(b, c, d, a, x[k + 5], S44, 0xFC93A039);
        a = II(a, b, c, d, x[k + 12], S41, 0x655B59C3); d = II(d, a, b, c, x[k + 3], S42, 0x8F0CCC92); c = II(c, d, a, b, x[k + 10], S43, 0xFFEFF47D); b = II(b, c, d, a, x[k + 1], S44, 0x85845DD1);
        a = II(a, b, c, d, x[k + 8], S41, 0x6FA87E4F); d = II(d, a, b, c, x[k + 15], S42, 0xFE2CE6E0); c = II(c, d, a, b, x[k + 6], S43, 0xA3014314); b = II(b, c, d, a, x[k + 13], S44, 0x4E0811A1);
        a = II(a, b, c, d, x[k + 4], S41, 0xF7537E82); d = II(d, a, b, c, x[k + 11], S42, 0xBD3AF235); c = II(c, d, a, b, x[k + 2], S43, 0x2AD7D2BB); b = II(b, c, d, a, x[k + 9], S44, 0xEB86D391);
        a = AddUnsigned(a, AA); b = AddUnsigned(b, BB); c = AddUnsigned(c, CC); d = AddUnsigned(d, DD);
    }
    var temp = WordToHex(a) + WordToHex(b) + WordToHex(c) + WordToHex(d);
    return temp.toLowerCase();
}
// ==========================================

const appConfig = {
    ver: 1,
    title: '优酷',
    site: 'https://www.youku.com',
    tabs: [
        { name: '电影',   ext: { id: '电影' } },
        { name: '电视剧', ext: { id: '电视剧' } },
        { name: '动漫',   ext: { id: '动漫' } },
        { name: '短剧',   ext: { id: '短剧' } },
        { name: '综艺',   ext: { id: '综艺' } },
        { name: '少儿',   ext: { id: '少儿' } },
        { name: '纪录片', ext: { id: '纪录片' } },
    ],
}

// 修复列表空白：恢复 SESSION 声明
const SESSION = {}
const filterList = {}

function getHeaders() {
    return {
        'User-Agent': UA,
        Referer: 'https://www.youku.com',
    }
}

async function fetchCategory(id, filters, page, session) {
    const params = Object.assign({}, filters || {})
    params.type = id
    const paramsStr = encodeURIComponent(JSON.stringify(params))

    let url
    if (page > 1 && session) {
        url = `${appConfig.site}/category/data?session=${encodeURIComponent(session)}&pageNo=${page}&params=${paramsStr}`
    } else {
        url = `${appConfig.site}/category/data?optionRefresh=1&pageNo=${page}&params=${paramsStr}`
    }

    const { data } = await $fetch.get(url, { headers: getHeaders() })
    const json = JSON.parse(data)
    const filterData = json.data.filterData || {}

    let sess = filterData.session
    if (sess && typeof sess !== 'string') sess = JSON.stringify(sess)

    return { listData: filterData.listData || [], session: sess || '' }
}

async function getConfig() {
    return JSON.stringify(appConfig)
}

async function getCards(ext) {
    ext = JSON.parse(ext)
    const { id, page = 1 } = ext
    const filters = ext.filters || {}

    let result
    if (page > 1 && !SESSION[id]) {
        const first = await fetchCategory(id, filters, 1, '')
        SESSION[id] = first.session
        result = await fetchCategory(id, filters, page, SESSION[id])
    } else {
        result = await fetchCategory(id, filters, page, SESSION[id])
    }
    if (result.session) SESSION[id] = result.session

    const cards = []
    result.listData.forEach((it) => {
        const link = it.videoLink || ''
        let vid = ''
        if (it.rightTagColor === 'BLUE' && link.includes('groupId=')) {
            const m = link.match(/groupId=([^&]+)/)
            if (m) vid = m[1]
        } else if (link.includes('id_')) {
            vid = link.split('id_')[1].split('.html')[0]
        }
        cards.push({
            vod_id: vid || (it.title || ''),
            vod_name: it.title || '',
            vod_pic: it.img || '',
            vod_remarks: it.subTitle || '',
            vod_content: it.summary || '',
            ext: { id: vid, name: it.title || '' },
        })
    })

    return JSON.stringify({ list: cards, filter: filterList[id] || [] })
}

async function getTracks(ext) {
    ext = JSON.parse(ext)
    let showId = ext.id
    const name = ext.name || ''

    if (!showId && name) {
        const sUrl = `https://search.youku.com/api/search?pg=1&keyword=${encodeURIComponent(name)}`
        const { data } = await $fetch.get(sUrl, { headers: getHeaders() })
        const sJson = JSON.parse(data)
        const item = (sJson.pageComponentList || []).find((x) => x && x.commonData)
        if (item) showId = item.commonData.showId
    }
    if (!showId) return JSON.stringify({ list: [] })

    const url = `https://search.youku.com/api/search?appScene=show_episode&showIds=${encodeURIComponent(showId)}`
    const { data } = await $fetch.get(url, { headers: getHeaders() })
    const json = JSON.parse(data)

    const tracks = []
    ;(json.serisesList || []).forEach((it) => {
        const epName = it.showVideoStage
            ? it.showVideoStage.replace('期', '集')
            : (it.displayName || it.title || '')
        tracks.push({
            name: epName,
            ext: { id: it.videoId, showId, name: epName },
        })
    })

    return JSON.stringify({ list: [{ title: '默认分组', tracks }] })
}

// ====== 播放核心：完美还原官方接口 ======
async function getPlayinfo(ext) {
    ext = JSON.parse(ext)
    const vid = ext.id

    const token = '84093b1c0aa5119b0e492b8c3f79e4b8'
    const t = Date.now()
    const appKey = '24679788'
    
    const biz_params = JSON.stringify({
        vid: vid,
        current_showid: "",
        preferClarity: 5,
        media_type: "standard",
        app_ver: "9.22.2",
        extag: "EXT-X-PRIVINF",
        play_ability: 2164266240,
        close_ability: 655360,
        local_vid: vid,
        local_time: Math.floor(t / 1000),
        skh: 1,
        start_point_ms: 0,
        last_clarity: 4,
        clarity_chg_ts: Math.floor(t / 1000),
        wdm: 1,
        pn: "com.youku.pcweb",
        playMode: "normal",
        enc_ver: 2
    })
    
    const ad_params = JSON.stringify({
        vs: "1.0", pver: "9.22.2", sver: "2.0", site: 1, aw: "w", fu: 0, d: 0, bt: "pc", os: "ios", osv: "16_6", dq: "hd3", atm: "", partnerid: "null", wintype: "interior", isvert: 0, vip: 0, emb: "", p: 1, rst: "mp4", needbf: 2, avs: "1.0"
    })
    
    // 必须带上 steal_params 才能让服务器开心
    const steal_params = JSON.stringify({
        ccode: "0502",
        utid: "4fBDImK+YhoCASrk71SNfs1x",
        version: "9.22.2",
        ckey: "140#ykSohFqGzzPzvzo2+bab4pN8s9DPqRzI0PTXKR/1fE8KWhGMahVHu2phEgxK6iki4Fkblp1zzRn2niS/nbzx4maza3h/zzrb22U3lp1xztsiVXE/tFzx2Dc33z//EHmijDapVrMn79/QCGKQA44d/Q72lQpGncnlAH7CFZW0NXFrEvgp3rzaw7Gr+WPOmDuEP6ydp1aKhkLBRmIPNE08t/3QZm1JlcOMUlhQEZFZwafJlll8zq49dGt2JuMduvY/a953lQgluZiLL5S2EsfsmvzKB93SWpKF2mGYKDY6Ra+P/RLcsshVlFoDbU48bcM+8Y1ZEKqzdAwO0l3xR1xLadcrZxod1Sd6pNuIzyOB5ZJjZylpqe5yrMPP6sKTGkLkxbbPBzKImh25PeokOqg92uYt7ARdA+Mx/vbAPVZ3BvAUdvZzrUd9YxsNQvW1uM4SZibYtCETh0Db+1ywPcCIQPXpqtUHWCf4PiGZvBDU1i5Siqncii30jSBsoEMj3xswkl8jlwIy25mo+Hmr2cyVW/2Svw5OJnK5Ii6H0vAv+7hGNdCdRAW7MPNgTcI6BQm9QkUTYLqOPJKk5esaN/fNP1KPFDWVdhiwv8I75Jm/K384L7APk1qhT1l1dh9p5+IwW+snRnO1OkdLgJrg1Db6ysUbbfz2SdA5LwNtTAiMspJ2aKOwxGwJSouLp+OxHfTkLNg4rzkrGY2L/KAAXFem2BDR3/ZJsCQhRdBM/zfg+rylS9iVvldF+x90s1JBgudZNglWtMQao5OuDBJyocoy9ZsOtoXxekPXKVgQ3pm7M0jbzEF9uc6BokjsZV9BEv5dG1ztYD8TpqM/MF14GQBet9+oR9wXT2teRSZLAjeenOrc41aAeSsqTCp/KuRLYecudey2xCkpDjdbml2AorZexRbPxiad3Nbl5XWHgssmZ5UeUNU65b==",
        client_ip: "192.168.1.1",
        client_ts: Math.floor(t / 1000)
    })

    const dataObj = {
        steal_params: steal_params,
        biz_params: biz_params,
        ad_params: ad_params
    }
    
    const dataStr = JSON.stringify(dataObj)
    const signStr = token + '&' + t + '&' + appKey + '&' + dataStr
    const sign = MD5(signStr) 

    const apiUrl = `https://un-acs.youku.com/h5/mtop.youku.play.ups.appinfo.get/1.1/?jsv=2.6.1&appKey=${appKey}&t=${t}&sign=${sign}&api=mtop.youku.play.ups.appinfo.get&v=1.1&type=jsonp&dataType=jsonp&callback=mtopjsonp1&data=${encodeURIComponent(dataStr)}`

    try {
        const res = await $fetch.get(apiUrl, { 
            headers: { 
                'User-Agent': UA, 
                'Referer': 'https://v.youku.com/',
                'Cookie': `_m_h5_tk=${token}_1792562933234; _m_h5_tk_enc=5a25bcaafb24feb484e5da7e6d50e81f; cna=4fBDImK+YhoCASrk71SNfs1x;`
            } 
        })
        
        let text = res.data
        text = text.replace(/^[a-zA-Z0-9_]+\(/, '').replace(/\)$/, '')
        const json = JSON.parse(text)
        
        if (json.data && json.data.data && json.data.data.stream) {
            const streams = json.data.data.stream
            let playUrl = ""
            let maxRes = 0
            for (let s of streams) {
                if (s.m3u8_url && s.height > maxRes) {
                    maxRes = s.height
                    playUrl = s.m3u8_url
                }
            }
            if (playUrl) {
                return JSON.stringify({
                    urls: [playUrl],
                    headers: { 'User-Agent': UA, 'Referer': 'https://v.youku.com/' }
                })
            }
        }
        
        // 提取服务器返回的真实报错信息
        const errorStr = json.ret ? json.ret.join(',') : JSON.stringify(json).substring(0, 100)
        return JSON.stringify({ urls: [`https://error.com/${encodeURIComponent(errorStr)}`] })

    } catch (e) {
        return JSON.stringify({ urls: [`https://error.com/${encodeURIComponent('网络或解析报错: ' + e.message)}`] })
    }
}

async function search(ext) {
    ext = JSON.parse(ext)
    const text = ext.text
    const page = ext.page || 1

    const url = `https://search.youku.com/api/search?pg=${page}&keyword=${encodeURIComponent(text)}`
    const { data } = await $fetch.get(url, { headers: getHeaders() })
    const json = JSON.parse(data)

    const cards = []
    ;(json.pageComponentList || []).forEach((it) => {
        if (!it || !it.commonData) return
        const c = it.commonData
        const title = (c.titleDTO && c.titleDTO.displayName) || ''
        cards.push({
            vod_id: c.showId,
            vod_name: title,
            vod_pic: c.posterDTO ? c.posterDTO.vThumbUrl : '',
            vod_remarks: c.stripeBottom || '',
            ext: { id: c.showId, name: title },
        })
    })

    return JSON.stringify({ list: cards })
}
