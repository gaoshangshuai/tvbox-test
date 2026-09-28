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
    let tracks = [];

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    // 广泛匹配剧集按钮：链接含 /play/ /watch/ /vod/，或文本是“第X集/话/期”或纯数字
    $('a').each((_, element) => {
        const href = $(element).attr('href') || '';
        const text = $(element).text().trim();
        if (!href || !text) return;

        const isPlayLink = href.includes('/play/') || href.includes('/watch/') || href.includes('/vod/');
        const isEpisodeText = /第[\d一二三四五六七八九十百]+[集话期]/.test(text) || /^\d+$/.test(text);

        if (isPlayLink || isEpisodeText) {
            tracks.push({
                name: text,
                pan: '',
                ext: { url: href.startsWith('http') ? href : `${appConfig.site}${href}` },
            });
        }
    });

    // 去重
    const seen = new Set();
    tracks = tracks.filter(t => {
        if (seen.has(t.ext.url)) return false;
        seen.add(t.ext.url);
        return true;
    });

    // 如果没找到剧集列表，当作电影处理
    if (tracks.length === 0) {
        tracks.push({
            name: '播放',
            pan: '',
            ext: { url: url },
        });
    }

    return jsonify({ list: [{ title: '默认分组', tracks }] });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });

    let playUrl = '';

    // 1. 直接找 video / iframe
    const $ = cheerio.load(data);
    playUrl = $('video source').attr('src') || $('video').attr('src') || $('iframe').attr('src') || '';

    // 2. player_aaaa 变量（苹果CMS常见）
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

        // ★★★ 关键：headers 必须是对象格式，不是数组，用来绕过 CDN 防盗链 ★★★
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
