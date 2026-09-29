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

    // 第一页不带页码后缀，第二页开始是 -2, -3...
    let url = page === 1 ? `${appConfig.site}/type/${id}.html` : `${appConfig.site}/type/${id}-${page}.html`;
    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    // 用 href 包含 /anime/ 定位卡片
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

    // 1. 抓取线路按钮：<ul class="channel-tab"><li><a href="#playlist2">天堂<span>13</span></a></li>...</ul>
    let lines = [];
    $('.channel-tab li a').each((_, el) => {
        // 去掉末尾集数数字，如 "天堂13" → "天堂"
        const rawText = $(el).text().replace(/\d+$/, '').trim();
        const href = $(el).attr('href') || '';
        const match = href.match(/#playlist(\d+)/);
        const lineId = match ? match[1] : '';
        if (rawText && lineId) {
            lines.push({ name: rawText, lineId: lineId });
        }
    });

    // 2. 对每个线路，抓取 #playlistN 容器里的剧集链接
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

    // 3. 兜底：如果线路抓不到，暴力抓所有 /play/ 链接
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

    let playUrl = '';

    const $ = cheerio.load(data);
    playUrl = $('video source').attr('src') || $('video').attr('src') || $('iframe').attr('src') || '';

    // 方法2：player_aaaa 变量（苹果CMS核心）
    if (!playUrl) {
        const match = data.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*<\/script>/);
        if (match) {
            try {
                const playerData = JSON.parse(match[1]);
                playUrl = playerData.url || playerData.vid || '';
            } catch (e) {
                try {
                    const fixed = match[1].replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":');
                    const playerData = JSON.parse(fixed);
                    playUrl = playerData.url || playerData.vid || '';
                } catch (e2) {}
            }
        }
    }

    // 方法3：宽松匹配 url 字段
    if (!playUrl) {
        const match = data.match(/["']url["']\s*:\s*["']([^"']+)["']/);
        if (match) playUrl = match[1];
    }

    // 方法4：URL 解码
    if (playUrl && playUrl.includes('%')) {
        try {
            const decoded = decodeURIComponent(playUrl);
            if (decoded.startsWith('http')) playUrl = decoded;
        } catch (e) {}
    }

    // 方法5：Base64 解码
    if (playUrl && !playUrl.startsWith('http') && playUrl.length > 20) {
        try {
            const decoded = Buffer.from(playUrl, 'base64').toString('utf-8');
            if (decoded.startsWith('http')) playUrl = decoded;
        } catch (e) {}
    }

    // 方法6：正则匹配 m3u8 / mp4 / flv
    if (!playUrl) {
        const m3u8Match = data.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4|flv)[^\s"'<>]*/);
        if (m3u8Match) playUrl = m3u8Match[0];
    }

    // 方法7：嵌套 m3u8（如量子线路）
    if (playUrl && playUrl.includes('http') && playUrl.indexOf('http', 5) > 0) {
        const nestedMatch = playUrl.match(/(https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*)/g);
        if (nestedMatch && nestedMatch.length > 1) {
            playUrl = nestedMatch[nestedMatch.length - 1];
        }
    }

    if (playUrl) {
        if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
        else if (playUrl.startsWith('/')) playUrl = appConfig.site + playUrl;

        $print('找到播放地址: ' + playUrl);

        // ★★★ 按域名区分 headers ★★★
        let headers = { 'User-Agent': UA };

        if (playUrl.includes('tiktokcdn') || playUrl.includes('akamaized.net')) {
            // 精品线路：TikTok CDN，用 tiktok 的 Referer
            headers['Referer'] = 'https://www.tiktok.com/';
        } else {
            headers['Referer'] = appConfig.site + '/';
            headers['Origin'] = appConfig.site;
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

    const url = `${appConfig.site}/search/${text}-------------.html`;
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
