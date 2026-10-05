const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';

const SITE = 'https://www.xuexi.cn';

// ★★★ 各频道的列表数据地址 ★★★
const CHANNEL_LIST = {
    // 原有频道
    first: 'https://www.xuexi.cn/lgdata/3m1erqf28h0r.json',
    people: 'https://www.xuexi.cn/lgdata/139qnt854nl.json',
    theory: 'https://www.xuexi.cn/lgdata/1oajo2vt47l.json',
    law: 'https://www.xuexi.cn/lgdata/14s4462g9nl.json',
    nature: 'https://www.xuexi.cn/lgdata/41gt3rsjd6l8.json',
    art: 'https://www.xuexi.cn/lgdata/1bfcj7u3pnl.json',

    // 新增频道
    mooc: 'https://www.xuexi.cn/lgdata/31t4ilb2dj0v.json',       // 学习慕课
    military: 'https://www.xuexi.cn/lgdata/3jsf4shrl928.json',   // 军事频道
    party: 'https://www.xuexi.cn/lgdata/vc9n1ga0nl.json',        // 党史频道

    // 影视频道拆分
    movie: 'https://www.xuexi.cn/lgdata/18rkaul9h7l.json',          // 电影
    movie_tv: 'https://www.xuexi.cn/lgdata/109tvcosfnl.json',        // 电视剧
    movie_doc: 'https://www.xuexi.cn/lgdata/17fsu5j4hnl.json',       // 纪录片
    movie_micro: 'https://www.xuexi.cn/lgdata/1am3asi2enl.json',     // 微电影
    movie_special: 'https://www.xuexi.cn/lgdata/97drfsf1d2d.json',   // 电视专题片
};

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9',
};

let appConfig = {
    ver: 1,
    title: '学习强国',
    site: SITE,
    tabs: [
        { name: '第一频道', ext: { id: 'first' } },
        { name: '人物频道', ext: { id: 'people' } },
        { name: '理论频道', ext: { id: 'theory' } },
        { name: '法治频道', ext: { id: 'law' } },
        { name: '自然频道', ext: { id: 'nature' } },
        { name: '文艺频道', ext: { id: 'art' } },
        { name: '学习慕课', ext: { id: 'mooc' } },
        { name: '军事频道', ext: { id: 'military' } },
        { name: '党史频道', ext: { id: 'party' } },
        { name: '电影', ext: { id: 'movie' } },
        { name: '电视剧', ext: { id: 'movie_tv' } },
        { name: '纪录片', ext: { id: 'movie_doc' } },
        { name: '微电影', ext: { id: 'movie_micro' } },
        { name: '电视专题片', ext: { id: 'movie_special' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

// ★ 安全解析 ext
function safeArgsify(ext) {
    if (ext == null) return {};
    if (typeof ext === 'object') return ext;
    try {
        return argsify(ext);
    } catch (e) {
        return {};
    }
}

// ★★★ 获取列表（只返回第一页，防止无限滚动重复）★★★
async function getCards(ext) {
    ext = safeArgsify(ext);
    let id = ext.id || 'first';

    // ★ 兼容各种分页参数名
    let page = parseInt(ext.page || ext.pg || ext.pageNum || 1);
    if (isNaN(page) || page < 1) page = 1;

    // ★ 只有第一页返回数据，后续页返回空列表
    if (page > 1) {
        $print('忽略第 ' + page + ' 页请求（学习强国接口不分页）');
        return jsonify({ list: [] });
    }

    let cards = [];

    const listUrl = CHANNEL_LIST[id];
    if (!listUrl) {
        $print('频道 ' + id + ' 的列表地址未配置');
        return jsonify({ list: [] });
    }

    try {
        const { data } = await $fetch.get(listUrl, { headers: HEADERS });
        const list = argsify(data);

        // 去重
        const addedIds = new Set();

        list.forEach(item => {
            // ★ 兼容多种封面字段
            let cover = item.thumbImage
                || item.image
                || item.pic
                || item.cover
                || item.imageUrl
                || item.thumbnail
                || item.picUrl
                || item.videoCover
                || item.image_url
                || '';

            // 补全协议
            if (cover && cover.indexOf('http') !== 0) {
                if (cover.indexOf('//') === 0) {
                    cover = 'https:' + cover;
                } else {
                    cover = SITE + (cover.charAt(0) === '/' ? '' : '/') + cover;
                }
            }

            // ★ 兼容多种 ID 字段
            let itemId = item.itemId || item.id || item.article_id || item.articleId || '';
            if (!itemId && item.url) {
                const match = item.url.match(/\/detail\/(\d+)/);
                if (match) itemId = match[1];
            }

            // 去重
            if (itemId && addedIds.has(itemId)) return;
            if (itemId) addedIds.add(itemId);

            cards.push({
                vod_id: itemId,
                vod_name: item.title || '',
                vod_pic: cover,
                vod_remarks: item.showSource || item.publishTime || '',
                ext: { url: item.url, itemId: itemId },
            });
        });

        $print('频道 ' + id + ' 加载条数: ' + cards.length);

    } catch (e) {
        $print('获取列表失败: ' + e.message);
    }

    return jsonify({ list: cards });
}

// ★★★ 获取剧集（支持单集和多集）★★★
async function getTracks(ext) {
    ext = safeArgsify(ext);
    let itemId = ext.itemId;
    let tracks = [];

    if (!itemId) {
        tracks.push({ name: '缺少itemId', pan: '', ext: { url: '' } });
        return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
    }

    try {
        const apiUrl = `https://article.xuexi.cn/data/app/${itemId}.js`;
        const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
        const text = String(data);

        // 去掉 JSONP 外壳
        let jsonStr = text;
        const start = text.indexOf('(');
        const end = text.lastIndexOf(')');
        if (start !== -1 && end !== -1) {
            jsonStr = text.substring(start + 1, end);
        }

        const detail = argsify(jsonStr);

        // 多集
        if (detail && detail.sub_items && detail.sub_items.length > 0) {
            detail.sub_items.forEach((subItem, index) => {
                let epName = subItem.title || ("第" + (index + 1) + "集");
                let bestUrl = '';
                let bestResolution = -1;

                if (subItem.videos && subItem.videos.length > 0) {
                    let videoInfo = subItem.videos[0].video_storage_info || [];
                    videoInfo.forEach(src => {
                        let srcUrl = src.normal || '';
                        if (srcUrl && (srcUrl.indexOf('.m3u8') > -1 || srcUrl.indexOf('.mp4') > -1)) {
                            const res = parseInt(src.resolution) || 0;
                            if (res > bestResolution) {
                                bestResolution = res;
                                bestUrl = srcUrl;
                            }
                        }
                    });
                }

                if (bestUrl) {
                    tracks.push({ name: epName, pan: '', ext: { url: bestUrl } });
                }
            });
        }
        // 单集
        else if (detail && detail.videos && detail.videos.length > 0) {
            let bestUrl = '';
            let bestResolution = -1;
            const videoInfo = detail.videos[0].video_storage_info || [];
            videoInfo.forEach(src => {
                let srcUrl = src.normal || '';
                if (srcUrl && (srcUrl.indexOf('.m3u8') > -1 || srcUrl.indexOf('.mp4') > -1)) {
                    const res = parseInt(src.resolution) || 0;
                    if (res > bestResolution) {
                        bestResolution = res;
                        bestUrl = srcUrl;
                    }
                }
            });
            if (bestUrl) {
                tracks.push({ name: '播放', pan: '', ext: { url: bestUrl } });
            }
        }

        if (tracks.length === 0) {
            $print('未找到播放地址，详情数据: ' + JSON.stringify(detail).substring(0, 500));
            tracks.push({ name: '未找到播放地址', pan: '', ext: { url: '' } });
        }

    } catch (e) {
        $print('获取播放地址失败: ' + e.message);
        tracks.push({ name: '获取失败', pan: '', ext: { url: '' } });
    }

    return jsonify({ list: [{ title: '默认分组', tracks: tracks }] });
}

// 播放
async function getPlayinfo(ext) {
    ext = safeArgsify(ext);
    let url = ext.url;
    if (!url) return jsonify({ urls: [] });

    return jsonify({
        urls: [url],
        headers: {
            'User-Agent': UA,
            'Referer': SITE + '/',
            'Origin': SITE,
        }
    });
}

async function search(ext) {
    return jsonify({ list: [] });
}
