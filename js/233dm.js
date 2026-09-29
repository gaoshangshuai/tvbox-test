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
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                ext: { url: `${appConfig.site}${href}` },
            });
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

    // 抓取线路按钮
    let lines = [];
    $('.channel-tab li a').each((_, el) => {
        const rawText = $(el).text().replace(/\d+$/, '').trim();
        const href = $(el).attr('href') || '';
        const match = href.match(/#playlist(\d+)/);
        const lineId = match ? match[1] : '';
        if (rawText && lineId) {
            lines.push({ name: rawText, lineId: lineId });
        }
    });

    // 遍历每条线路，抓取对应剧集
    for (const line of lines) {
        let tracks = [];
        const container = $(`#playlist${line.lineId}`);
        container.find('a').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !tracks.some(t => t.ext.url.endsWith(href))) {
                tracks.push({
                    name: text,
                    pan: '',
                    ext: { url: href.startsWith('http') ? href : `${appConfig.site}${href}` }
                });
            }
        });

        if (tracks.length > 0) {
            groups.push({ title: line.name, tracks: tracks });
        }
    }

    // 兜底：如果线路抓不到，暴力抓所有 /play/ 链接
    if (groups.length === 0) {
        let tracks = [];
        $('a[href*="/play/"]').each((_, el) => {
            const href = $(el).attr('href');
            const text = $(el).text().trim();
            if (href && text && !tracks.some(t => t.ext.url.endsWith(href))) {
                tracks.push({
                    name: text,
                    pan: '',
                    ext: { url: href.startsWith('http') ? href : `${appConfig.site}${href}` }
                });
            }
        });
        groups.push({ title: '默认分组', tracks: tracks });
    }

    return jsonify({ list: groups });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    let playUrl = '';
    let from = '';
    let encrypt = 1;

    // 解析 player_aaaa
    const match = data.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*<\/script>/);
    if (match) {
        try {
            let jsonStr = match[1];
            try {
                const playerData = JSON.parse(jsonStr);
                playUrl = playerData.url || '';
                from = playerData.from || '';
                encrypt = playerData.encrypt || 1;
            } catch (e) {
                jsonStr = jsonStr.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
                const playerData = JSON.parse(jsonStr);
                playUrl = playerData.url || '';
                from = playerData.from || '';
                encrypt = playerData.encrypt || 1;
            }
        } catch (e) {
            $print('解析 player_aaaa 失败: ' + e.message);
        }
    }

    // 情况A：url 是编码的（% 开头）
    if (playUrl && playUrl.startsWith('%')) {
        try {
            playUrl = decodeURIComponent(playUrl);
        } catch (e) {}
    }

    // 情况B：url 是一个 ID（精品线路），调用后台 API 获取真实地址
    if (playUrl && !playUrl.startsWith('http') && !playUrl.startsWith('//') && playUrl.length > 10) {
        $print('精品线路，尝试请求后台 API，ID: ' + playUrl);
        const apiUrl = `${appConfig.site}/addons/dp/player/index.php?key=0&id=${playUrl}&uid=0&from=${from}&url=`;
        try {
            const { data: apiData } = await $fetch.get(apiUrl, { headers: { 'User-Agent': UA } });
            const hrefMatch = apiData.match(/href="(.+?)"/);
            if (hrefMatch && hrefMatch[1]) {
                const playerUrl = hrefMatch[1].startsWith('http') ? hrefMatch[1] : appConfig.site + hrefMatch[1];
                const { data: playerData } = await $fetch.get(playerUrl, { headers: { 'User-Agent': UA } });
                const configMatch = playerData.match(/config\s*=\s*(\{[\s\S]*?\})\s*(?:;|if\s*\()/);
                if (configMatch) {
                    try {
                        const cfg = new Function('return ' + configMatch[1])();
                        playUrl = cfg.url || '';
                    } catch (e) {}
                }
                if (!playUrl) {
                    const videoMatch = playerData.match(/https?:\/\/[^\s"']+\.(?:m3u8|mp4|flv)[^\s"']*/);
                    if (videoMatch) playUrl = videoMatch[0];
                }
            }
        } catch (e) {
            $print('后台 API 请求失败: ' + e.message);
        }
    }

    // 情况C：直接从页面提取
    if (!playUrl) {
        playUrl = $('video source').attr('src') || $('video').attr('src') || $('iframe').attr('src') || '';
    }
    if (!playUrl) {
        const urlMatch = data.match(/["']url["']\s*:\s*["']([^"']+)["']/);
        if (urlMatch) playUrl = urlMatch[1];
    }
    if (!playUrl) {
        const m3u8Match = data.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4|flv)[^\s"'<>]*/);
        if (m3u8Match) playUrl = m3u8Match[0];
    }

    // 处理嵌套 m3u8
    if (playUrl && playUrl.includes('http') && playUrl.indexOf('http', 5) > 0) {
        const nestedMatch = playUrl.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g);
        if (nestedMatch && nestedMatch.length > 1) {
            playUrl = nestedMatch[nestedMatch.length - 1];
        }
    }

    if (playUrl) {
        if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
        else if (playUrl.startsWith('/')) playUrl = appConfig.site + playUrl;

        $print('最终播放地址: ' + playUrl + ' (from: ' + from + ')');

        // ★★★ 关键：TikTok CDN 使用专属 headers ★★★
        let headers = {};
        if (playUrl.includes('tiktokcdn') || playUrl.includes('akamaized.net')) {
            headers = {
                'User-Agent': 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.91 Mobile Safari/537.36',
                'Referer': 'https://www.tiktok.com/',
                'Origin': 'https://www.tiktok.com',
                'Accept': '*/*',
                'Accept-Encoding': 'identity',
            };
            $print('精品线路：使用 TikTok 专属 headers');
        } else {
            headers = {
                'User-Agent': UA,
                'Referer': appConfig.site + '/',
                'Origin': appConfig.site,
            };
        }

        return jsonify({ urls: [playUrl], headers: headers });
    }

    $print('未找到播放地址，HTML长度: ' + data.length);
    return jsonify({ urls: [] });
}

async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);

    const url = `${appConfig.site}/search/-------------.html?wd=${text}`;
    const { data } = await $fetch.get(url, {
        headers: {
            'User-Agent': UA,
            'Referer': appConfig.site + '/',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'zh-CN,zh;q=0.9',
        }
    });
    const $ = cheerio.load(data);

    $('a[href*="/anime/"]').each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).attr('title');
        const cover = $(element).attr('data-original');
        const remark = $(element).find('span:last-child b').text().trim();
        if (href && title && !cards.some(c => c.vod_id === href)) {
            cards.push({
                vod_id: href,
                vod_name: title,
                vod_pic: cover,
                vod_remarks: remark,
                ext: { url: `${appConfig.site}${href}` },
            });
        }
    });

    return jsonify({ list: cards });
}
