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

    // 第一步：请求233dm的播放页，拿到 player_aaaa 配置
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    let playUrl = '';
    let from = 'mp4'; // 精品线路的 from 通常是 mp4
    let vid = '';

    // 解析 player_aaaa，提取视频ID (url 字段)
    const match = data.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*<\/script>/);
    if (match) {
        try {
            let jsonStr = match[1];
            try {
                const playerData = JSON.parse(jsonStr);
                vid = playerData.url || '';
                from = playerData.from || 'mp4';
            } catch (e) {
                jsonStr = jsonStr.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
                const playerData = JSON.parse(jsonStr);
                vid = playerData.url || '';
                from = playerData.from || 'mp4';
            }
        } catch (e) {
            $print('解析 player_aaaa 失败: ' + e.message);
        }
    }

    // 第二步：如果拿到了视频ID，就请求远程播放器接口
    if (vid && !vid.startsWith('http')) {
        // 如果ID是编码过的，先解码
        if (vid.startsWith('%')) {
            try { vid = decodeURIComponent(vid); } catch (e) {}
        }

        $print('精品线路，视频ID: ' + vid);

        // 构造远程播放器接口地址（从你的抓包结果中获取）
        const playerApiUrl = `https://art.v2player.top:8989/player/?url=${vid}&dmid=18119&next=${encodeURIComponent(url)}&nid=1&h=${appConfig.site}`;
        $print('请求远程播放器接口: ' + playerApiUrl);

        try {
            const { data: playerData } = await $fetch.get(playerApiUrl, {
                headers: {
                    'User-Agent': UA,
                    'Referer': appConfig.site + '/',
                }
            });

            // 从返回的HTML中提取 player_aaaa 或 config 变量中的播放地址
            let realPlayUrl = '';
            const realMatch = playerData.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*<\/script>/);
            if (realMatch) {
                try {
                    let realJson = realMatch[1];
                    try {
                        const realData = JSON.parse(realJson);
                        realPlayUrl = realData.url || '';
                    } catch (e) {
                        realJson = realJson.replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
                        const realData = JSON.parse(realJson);
                        realPlayUrl = realData.url || '';
                    }
                } catch (e) {}
            }

            // 如果 player_aaaa 里没有，尝试直接匹配 m3u8 或 mp4 链接
            if (!realPlayUrl) {
                const m3u8Match = playerData.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4|flv)[^\s"'<>]*/);
                if (m3u8Match) realPlayUrl = m3u8Match[0];
            }

            if (realPlayUrl) {
                playUrl = realPlayUrl;
                $print('从远程播放器接口找到播放地址: ' + playUrl);
            }
        } catch (e) {
            $print('请求远程播放器接口失败: ' + e.message);
        }
    }

    // 第三步：如果远程接口没拿到，回退到直接从原页面提取
    if (!playUrl) {
        playUrl = $('video source').attr('src') || $('video').attr('src') || $('iframe').attr('src') || '';
    }
    if (!playUrl) {
        const m3u8Match = data.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4|flv)[^\s"'<>]*/);
        if (m3u8Match) playUrl = m3u8Match[0];
    }

    if (playUrl) {
        if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
        else if (playUrl.startsWith('/')) playUrl = appConfig.site + playUrl;

        $print('最终播放地址: ' + playUrl);

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
