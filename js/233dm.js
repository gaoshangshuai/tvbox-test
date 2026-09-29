const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/14.0 Mobile/15E148 Safari/604.1';

let appConfig = {
    ver: 1,
    title: '233动漫',
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

async function getConfig() {
    return jsonify(appConfig);
}

async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let { id, page = 1 } = ext;
    let url = page === 1 ? `${appConfig.site}/type/${id}.html` : `${appConfig.site}/type/${id}-${page}.html`;
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);
    $('a[href*="/anime/"]').each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).attr('title');
        const cover = $(element).attr('data-original');
        const remark = $(element).find('span:last-child b').text().trim();
        if (href && title && !cards.some(c => c.vod_id === href)) {
            cards.push({ vod_id: href, vod_name: title, vod_pic: cover, vod_remarks: remark, ext: { url: `${appConfig.site}${href}` } });
        }
    });
    return jsonify({ list: cards });
}

async function getTracks(ext) {
    ext = argsify(ext);
    let url = ext.url;
    let groups = [];
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);
    let lines = [];
    $('.channel-tab li a').each((_, el) => {
        const rawText = $(el).text().replace(/\d+$/, '').trim();
        const href = $(el).attr('href') || '';
        const match = href.match(/#playlist(\d+)/);
        const lineId = match ? match[1] : '';
        if (rawText && lineId) lines.push({ name: rawText, lineId: lineId });
    });
    for (const line of lines) {
        let tracks = [];
        const container = $(`#playlist${line.lineId}`);
        container.find('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !tracks.some(t => t.ext.url.endsWith(href))) {
                tracks.push({ name: text, pan: '', ext: { url: href.startsWith('http') ? href : `${appConfig.site}${href}` } });
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
                tracks.push({ name: text, pan: '', ext: { url: href.startsWith('http') ? href : `${appConfig.site}${href}` } });
            }
        });
        groups.push({ title: '默认分组', tracks: tracks });
    }
    return jsonify({ list: groups });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;
    let playUrl = '';

    try {
        const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA, 'Referer': appConfig.site + '/' } });
        
        // 1. 尝试提取直链
        const directMatch = data.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/i);
        if (directMatch) playUrl = directMatch[0];

        // 2. 尝试解析接口
        if (!playUrl) {
            const configMatch = data.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*;?\s*<\/script>/);
            if (configMatch) {
                let jsonStr = configMatch[1].replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
                try {
                    const playerData = JSON.parse(jsonStr);
                    let vid = playerData.url || '';
                    if (vid.startsWith('%')) vid = decodeURIComponent(vid);
                    if (vid.includes('=') && !vid.startsWith('http')) vid = atob(vid);
                    
                    if (vid && !vid.startsWith('http')) {
                        const parseApi = `https://art.v2player.top:8989/player/?url=${encodeURIComponent(vid)}&next=${encodeURIComponent(url)}&nid=1&h=${encodeURIComponent(appConfig.site)}`;
                        const { data: parseHtml } = await $fetch.get(parseApi, { headers: { 'User-Agent': UA, 'Referer': appConfig.site } });
                        
                        // 优先找 m3u8，因为 m3u8 的切片请求有时能绕过部分 Referer 检查
                        const m3u8Match = parseHtml.match(/["'](https?:\/\/[^"']+?\.m3u8[^"']*?)["']/i);
                        const mp4Match = parseHtml.match(/["'](https?:\/\/[^"']+?\.mp4[^"']*?)["']/i);
                        
                        if (m3u8Match) playUrl = m3u8Match[1];
                        else if (mp4Match) playUrl = mp4Match[1];
                    } else if (vid.startsWith('http')) {
                        playUrl = vid;
                    }
                } catch (e) {}
            }
        }

        if (playUrl) {
            if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
            
            // ★★★ 关键判断：如果是 TikTok 链接，XPTV 几乎必死 ★★★
            if (playUrl.includes('tiktokcdn') || playUrl.includes('akamaized.net')) {
                $print('[233dm] ⚠️ 检测到 TikTok 链接，XPTV 原生播放器可能无法播放。');
                $print('[233dm] 💡 建议：请在 XPTV 设置中切换播放器内核为 "IJKPlayer" 或 "MPV"。');
                
                // 尝试最后一次：返回不带 headers 的纯 URL，看是否能碰巧通过
                return jsonify({ urls: [playUrl], headers: {} });
            }
            
            return jsonify({ urls: [playUrl], headers: { 'User-Agent': UA, 'Referer': appConfig.site } });
        }
    } catch (err) {
        $print(`[233dm] Error: ${err.message}`);
    }
    return jsonify({ urls: [] });
}

async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);
    const url = `${appConfig.site}/search/-------------.html?wd=${text}`;
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);
    $('a[href*="/anime/"]').each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).attr('title');
        const cover = $(element).attr('data-original');
        const remark = $(element).find('span:last-child b').text().trim();
        if (href && title && !cards.some(c => c.vod_id === href)) {
            cards.push({ vod_id: href, vod_name: title, vod_pic: cover, vod_remarks: remark, ext: { url: `${appConfig.site}${href}` } });
        }
    });
    return jsonify({ list: cards });
}
