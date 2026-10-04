const cheerio = createCheerio();
const CryptoJS = createCryptoJS();

const SITE = 'https://www.1958xy.com';
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
    'Accept-Language': 'zh-CN,zh;q=0.9',
};

let appConfig = {
    ver: 1,
    title: '西影网',
    site: SITE,
    tabs: [
        { name: '电影', ext: { id: 'movie' } },
        { name: '电视剧', ext: { id: 'TVplay' } },
        { name: '纪录片', ext: { id: 'documentary' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

// 获取分类列表
async function getCards(ext) {
    ext = argsify(ext);
    let cards = [];
    let page = ext.page || 1;
    let id = ext.id || 'movie';

    // 拼接分类页 URL
    let url;
    if (id === 'movie') {
        url = `${SITE}/page/listFilmLibrary?page=${page}`;
    } else {
        url = `${SITE}/page/listFilmLibrary?SEARCH_TYPE=${id}&page=${page}`;
    }

    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);

        // 尝试多种可能的卡片选择器
        const selectors = [
            '.film-list .film-item',
            '.list-item',
            '.video-item',
            '.card',
            '.item',
        ];

        let found = false;
        for (const sel of selectors) {
            const items = $(sel);
            if (items.length > 0) {
                items.each((_, el) => {
                    const href = $(el).find('a').attr('href');
                    const title = $(el).find('a').attr('title') || $(el).find('.title, .name, h3, h4').text().trim();
                    let cover = $(el).find('img').attr('src') || $(el).find('img').attr('data-src') || '';
                    const remark = $(el).find('.note, .remark, .update, .desc').text().trim();

                    if (cover && cover.indexOf('//') === 0) cover = 'https:' + cover;
                    if (cover && !cover.startsWith('http')) cover = SITE + cover;

                    if (href && title && !cards.some(c => c.vod_id === href)) {
                        cards.push({
                            vod_id: href,
                            vod_name: title,
                            vod_pic: cover,
                            vod_remarks: remark,
                            ext: { url: href.startsWith('http') ? href : SITE + href },
                        });
                    }
                });
                found = true;
                break;
            }
        }

        // 如果页面选择器都失效，尝试从页面源码中提取
        if (!found) {
            const links = data.match(/href="(\/player\/toPlay\/[^"]+)"/g);
            if (links) {
                const uniqueLinks = [...new Set(links.map(l => l.replace(/href="|"/g, '')))];
                uniqueLinks.forEach(link => {
                    cards.push({
                        vod_id: link,
                        vod_name: link,
                        vod_pic: '',
                        vod_remarks: '',
                        ext: { url: SITE + link },
                    });
                });
            }
        }

        $print('获取到 ' + cards.length + ' 个视频');
    } catch (e) {
        $print('获取列表失败: ' + e.message);
    }

    return jsonify({ list: cards });
}

// 获取剧集/详情
async function getTracks(ext) {
    ext = argsify(ext);
    let url = ext.url;
    let groups = [];
    let tracks = [];

    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);

        // 尝试从页面提取播放地址
        // 西影网的播放页通常是 /player/toPlay/{id}
        // 从页面中查找 m3u8 地址或 iframe
        let playUrl = '';

        // 方式1：找 iframe
        const iframeSrc = $('iframe').attr('src');
        if (iframeSrc) {
            playUrl = iframeSrc;
        }

        // 方式2：找 video 标签
        if (!playUrl) {
            playUrl = $('video source').attr('src') || $('video').attr('src') || '';
        }

        // 方式3：从 script 中匹配 m3u8 或 mp4
        if (!playUrl) {
            const m3u8Match = data.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/);
            if (m3u8Match) playUrl = m3u8Match[0];
        }

        // 方式4：找 player_aaaa 变量
        if (!playUrl) {
            const match = data.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*<\/script>/);
            if (match) {
                try {
                    const playerData = JSON.parse(match[1]);
                    playUrl = playerData.url || '';
                } catch (e) {}
            }
        }

        if (playUrl) {
            if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
            tracks.push({
                name: '播放',
                pan: '',
                ext: { url: playUrl },
            });
        }
    } catch (e) {
        $print('获取详情失败: ' + e.message);
    }

    if (tracks.length > 0) {
        groups.push({ title: '默认分组', tracks: tracks });
    }

    return jsonify({ list: groups });
}

// 获取播放地址
async function getPlayinfo(ext) {
    ext = argsify(ext);
    let url = ext.url;

    if (!url) return jsonify({ urls: [] });

    try {
        // 如果已经是 m3u8/mp4 直链，直接返回
        if (url.includes('.m3u8') || url.includes('.mp4')) {
            return jsonify({
                urls: [url],
                headers: {
                    'User-Agent': UA,
                    'Referer': SITE + '/',
                    'Origin': SITE,
                }
            });
        }

        // 否则请求页面，从页面中提取 m3u8
        const { data } = await $fetch.get(url, { headers: HEADERS });

        let playUrl = '';
        const m3u8Match = data.match(/https?:\/\/[^\s"'<>]+\.(?:m3u8|mp4)[^\s"'<>]*/);
        if (m3u8Match) playUrl = m3u8Match[0];

        if (!playUrl) {
            const match = data.match(/player_aaaa\s*=\s*({[\s\S]*?})\s*<\/script>/);
            if (match) {
                try {
                    const playerData = JSON.parse(match[1]);
                    playUrl = playerData.url || '';
                } catch (e) {}
            }
        }

        if (playUrl) {
            if (playUrl.startsWith('//')) playUrl = 'https:' + playUrl;
            return jsonify({
                urls: [playUrl],
                headers: {
                    'User-Agent': UA,
                    'Referer': SITE + '/',
                    'Origin': SITE,
                }
            });
        }
    } catch (e) {
        $print('获取播放地址失败: ' + e.message);
    }

    return jsonify({ urls: [] });
}

// 搜索
async function search(ext) {
    ext = argsify(ext);
    let cards = [];
    let text = encodeURIComponent(ext.text);

    const url = `${SITE}/page/search?keyword=${text}`;

    try {
        const { data } = await $fetch.get(url, { headers: HEADERS });
        const $ = cheerio.load(data);

        $('a[href*="/player/toPlay/"]').each((_, el) => {
            const href = $(el).attr('href');
            const title = $(el).attr('title') || $(el).text().trim();
            const cover = $(el).find('img').attr('src') || '';

            if (href && title && !cards.some(c => c.vod_id === href)) {
                cards.push({
                    vod_id: href,
                    vod_name: title,
                    vod_pic: cover,
                    vod_remarks: '',
                    ext: { url: href.startsWith('http') ? href : SITE + href },
                });
            }
        });
    } catch (e) {
        $print('搜索失败: ' + e.message);
    }

    return jsonify({ list: cards });
}
