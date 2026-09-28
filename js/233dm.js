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

    // 用 href 包含 /anime/ 定位卡片，避免随机 class 失效
    $('a[href*="/anime/"]').each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).attr('title');
        const cover = $(element).attr('data-original');
        const remark = $(element).find('span:last-child b').text().trim();

        // 去重
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

    // 1. 提取线路名称（如：天堂、精品、暴风、量子）
    let lineNames = [];
    $('.play-source-tab a, .nav-tabs a, .playlist-tab a, .source-tab a, .module-tab-item').each((_, el) => {
        const name = $(el).text().trim();
        if (name && !lineNames.includes(name)) {
            lineNames.push(name);
        }
    });
    if (lineNames.length === 0) lineNames.push('默认线路');

    // 2. 按线路抓取剧集链接
    let allTracks = [];
    $('a[href*="/play/"]').each((_, el) => {
        const href = $(el).attr('href');
        const text = $(el).text().trim();
        if (!href || !text) return;

        // 解析线路ID（从链接中提取，如 /play/xxx-1-1.html 里的 1）
        const match = href.match(/-(\d+)-\d+\.html/);
        const lineId = match ? parseInt(match[1]) : 0;

        allTracks.push({
            name: text,
            pan: '',
            lineId: lineId,
            url: href.startsWith('http') ? href : `${appConfig.site}${href}`
        });
    });

    // 3. 按线路分组，拼装成 XPTV 能识别的格式
    for (let i = 0; i < lineNames.length; i++) {
        const lineName = lineNames[i];
        const lineId = i + 1; // 假设线路ID从1开始顺序排列
        const lineTracks = allTracks.filter(t => t.lineId === lineId);

        if (lineTracks.length > 0) {
            groups.push({
                title: lineName,
                tracks: lineTracks.map(t => ({
                    name: t.name,
                    pan: '',
                    ext: { url: t.url }
                }))
            });
        }
    }

    // 兜底：如果分组失败，把所有链接塞进一个默认分组
    if (groups.length === 0) {
        groups.push({
            title: '默认分组',
            tracks: allTracks.map(t => ({
                name: t.name,
                pan: '',
                ext: { url: t.url }
            }))
        });
    }

    return jsonify({ list: groups });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });

    let playUrl = '';

    // 1. 直接找 video / iframe
    const $ = cheerio.load(data);
    playUrl = $('video source').attr('src') || $('video').attr('src') || $('iframe').attr('src') || '';

    // 2. player_aaaa 变量
    if (!playUrl) {
        const match = data.match(/player_aaaa\s*=\s*({[\s\S]*?})/);
        if (match) {
            try {
                const playerData = JSON.parse(match[1]);
                playUrl = playerData.url || playerData.vid || '';
            } catch (e) {}
        }
    }

    // 3. m3u8 直链
    if (!playUrl) {
        const m3u8Match = data.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
        if (m3u8Match) playUrl = m3u8Match[0];
    }

    // 4. 任意 http 开头的播放文件
    if (!playUrl) {
        const urlMatch = data.match(/["'](https?:\/\/[^"']+\.(?:m3u8|mp4|flv)[^"']*)["']/);
        if (urlMatch) playUrl = urlMatch[1];
    }

    // 5. iframe src
    if (!playUrl) {
        const iframeMatch = data.match(/<iframe[^>]+src=["']([^"']+)["']/);
        if (iframeMatch) playUrl = iframeMatch[1];
    }

    // 6. url 字段通用匹配
    if (!playUrl) {
        const urlMatch = data.match(/["']url["']\s*:\s*["']([^"']+)["']/);
        if (urlMatch) playUrl = urlMatch[1];
    }

    if (playUrl) {
        if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
        else if (playUrl.startsWith('/')) playUrl = appConfig.site + playUrl;

        $print('找到播放地址: ' + playUrl);

        // ★★★ 关键：headers 必须是对象格式，用来绕过 CDN 防盗链 ★★★
        return jsonify({
            urls: [playUrl],
            headers: {
                'User-Agent': UA,
                'Referer': appConfig.site + '/',
                'Origin': appConfig.site
            }
        });
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
