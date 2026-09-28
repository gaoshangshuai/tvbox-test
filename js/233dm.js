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

    // 根据你发的 HTML 确认：第一页不带页码，第二页开始是 -2, -3...
    let url;
    if (page === 1) {
        url = `${appConfig.site}/type/${id}.html`;
    } else {
        url = `${appConfig.site}/type/${id}-${page}.html`;
    }

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    // 真实结构：卡片是 <a class="JIHA_... lazyload" href="/anime/xxx.html">
    // 用 href 包含 /anime/ 来定位，避免随机 class 失效
    $('a[href*="/anime/"]').each((_, element) => {
        const href = $(element).attr('href');
        const title = $(element).attr('title');
        const cover = $(element).attr('data-original');
        // 更新状态在最后一个 span 的 b 标签里，如“已完结”、“1180集”
        const remark = $(element).find('span:last-child b').text().trim();

        // 去重：同一张卡片可能出现两次（一个外层，一个内层）
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

    // 详情页的播放列表可能用这些选择器，按顺序尝试
    const playlistSelectors = [
        '.play-list a',
        '.module-play-list a',
        '.anthology a',
        '#play-list a',
        'a[href*="/play/"]',
        'a[href*="/watch/"]',
        '.content-playlist a',
        '.playlist a',
        '.fed-play-list a',
    ];

    let found = false;
    for (const selector of playlistSelectors) {
        const elements = $(selector);
        if (elements.length > 0) {
            elements.each((_, element) => {
                const name = $(element).text().trim();
                const playUrl = $(element).attr('href');
                if (name && playUrl) {
                    tracks.push({
                        name: name,
                        pan: '',
                        ext: { url: playUrl.startsWith('http') ? playUrl : `${appConfig.site}${playUrl}` },
                    });
                }
            });
            found = true;
            break;
        }
    }

    // 如果没找到剧集列表，就当作电影处理，直接把详情页当播放页
    if (!found || tracks.length === 0) {
        tracks.push({
            name: '播放',
            pan: '',
            ext: { url: url },
        });
    }

    return jsonify({
        list: [{ title: '默认分组', tracks }],
    });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;

    const { data } = await $fetch.get(url, { headers: { 'User-Agent': UA } });
    const $ = cheerio.load(data);

    // 方法1：直接找 video 标签
    let playUrl = $('video source').attr('src') || $('video').attr('src');

    // 方法2：查找 player_aaaa 变量（苹果CMS常见）
    if (!playUrl) {
        const match = data.match(/player_aaaa\s*=\s*({[^}]+})/);
        if (match) {
            try {
                const playerData = JSON.parse(match[1]);
                playUrl = playerData.url;
            } catch (e) {}
        }
    }

    // 方法3：查找 m3u8 链接
    if (!playUrl) {
        const m3u8Match = data.match(/https?:\/\/[^\s"']+\.m3u8[^\s"']*/);
        if (m3u8Match) {
            playUrl = m3u8Match[0];
        }
    }

    // 方法4：查找通用 url 字段
    if (!playUrl) {
        const urlMatch = data.match(/["']url["']\s*:\s*["']([^"']+)["']/);
        if (urlMatch) {
            playUrl = urlMatch[1];
        }
    }

    // 处理相对路径
    if (playUrl) {
        if (playUrl.startsWith('//')) {
            playUrl = 'https:' + playUrl;
        } else if (playUrl.startsWith('/')) {
            playUrl = appConfig.site + playUrl;
        }
        return jsonify({ urls: [playUrl] });
    }

    return jsonify({ urls: [] });
}

async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);
    let page = ext.page || 1;

    // 搜索路径：/search/关键词-------------.html
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
