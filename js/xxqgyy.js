const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SITE = 'https://www.xuexi.cn';
const DEFAULT_PIC = 'https://boot-img.xuexi.cn/image/1005/process/93ef3edd804a4a26b7f8f899e8bf258c.jpg';

// 1. 普通频道列表
const CHANNEL_LIST = {
    movie: 'https://www.xuexi.cn/lgdata/18rkaul9h7l.json',          // 电影
    movie_tv: 'https://www.xuexi.cn/lgdata/109tvcosfnl.json',        // 电视剧
    movie_doc: 'https://www.xuexi.cn/lgdata/17fsu5j4hnl.json'        // 纪录片
};

// 2. 动画频道
const ANIMATION_LIST = [
    { name: '长征先锋', pic: 'https://boot-img.xuexi.cn/image/1005/process/521e22e4b1154a2d9551f6d9fbb4376d.jpg', desc: '全52集', artIds: ['7521238365152978329'] },
    { name: '犟驴小红军', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/5646dcb04b6041abaff2359f45a2c96b_crop_1581052257107_h_422_w_750_1581052257185_h_422_w_750.jpg', desc: '全12集', artIds: ['1439398455075646484'] },
    { name: '寻找英雄 小淘气长征记', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/9652b016cd394ae49590bac4010090e5_crop_new_h_422_w_750_h_422_w_750.jpg', desc: '全26集', artIds: ['783402746357409941'] },
    { name: '那年那兔那些事儿', pic: 'https://boot-img.xuexi.cn/image/1006/process/9a020fdb20104931ad51743d44519c51.jpg', desc: '全3季', artIds: ['32561504674169041'] },
    // 👇 新增的《四渡赤水》
    { name: '四渡赤水', pic: 'https://boot-img.xuexi.cn/image/1005/process/76fb7792312d42be936e04e65fca3325.jpg', desc: '全8集', artIds: ['8374057897549941762'] }
];

const HEADERS = {
    'User-Agent': UA,
    'Referer': SITE + '/',
    'Origin': SITE,
    'Accept': 'application/json, text/plain, */*'
};

let appConfig = {
    ver: 4,
    title: '学习强国',
    site: SITE,
    tabs: [
        { name: '电影', ext: { id: 'movie' } },
        { name: '电视剧', ext: { id: 'movie_tv' } },
        { name: '纪录片', ext: { id: 'movie_doc' } },
        { name: '动画', ext: { id: 'ani' } }
    ]
};

async function getConfig() { return jsonify(appConfig); }

function safeArgsify(ext) {
    if (ext == null) return {};
    if (typeof ext === 'object') return ext;
    try { return argsify(ext); } catch (e) { return {}; }
}

// ==================== 1. 获取卡片列表 ====================
async function getCards(ext) {
    ext = safeArgsify(ext);
    let page = ext.page || 1;
    if (page > 1) return jsonify({ list: [] });

    let id = ext.id || 'movie';
    let cards = [];

    if (id === 'ani') {
        ANIMATION_LIST.forEach(drama => {
            cards.push({
                vod_id: drama.artIds.join(','),
                vod_name: drama.name,
                vod_pic: drama.pic,
                vod_remarks: drama.desc,
                ext: { type: 'tv_detail', artIds: drama.artIds }
            });
        });
        return jsonify({ list: cards });
    }

    let listUrl = CHANNEL_LIST[id];
    if (!listUrl) return jsonify({ list: [] });

    try {
        const { data } = await $fetch.get(listUrl, { headers: HEADERS });
        const list = typeof data === 'string' ? argsify(data) : data;
        const addedIds = new Set();

        if (Array.isArray(list)) {
            list.forEach(item => {
                let cover = item.thumbImage || item.image || item.pic || item.cover || item.imageUrl || '';
                if (cover && cover.indexOf('http') !== 0) {
                    cover = cover.indexOf('//') === 0 ? 'https:' + cover : SITE + (cover.charAt(0) === '/' ? '' : '/') + cover;
                }

                let itemId = item.itemId || item.id || item.article_id || '';
                if (!itemId && item.url) {
                    const match = item.url.match(/\/detail\/(\d+)/);
                    if (match) itemId = match[1];
                }

                if (itemId && addedIds.has(itemId)) return;
                if (itemId) addedIds.add(itemId);

                cards.push({
                    vod_id: itemId,
                    vod_name: item.title || '',
                    vod_pic: cover || DEFAULT_PIC,
                    vod_remarks: item.showSource || item.publishTime || '',
                    ext: { type: 'tv_detail', artIds: [itemId] }
                });
            });
        }
    } catch (e) {
        console.log('获取列表失败: ' + e.message);
    }

    return jsonify({ list: cards });
}

// ==================== 2. 解析底层视频数据 ====================
async function fetchSingleId(id) {
    try {
        // 优先尝试普通合集接口
        const apiUrl = `https://boot-source.xuexi.cn/data/app/${id}.js`;
        const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
        let text = String(data);
        let jsonStr = text;
        const start = text.indexOf('(');
        const end = text.lastIndexOf(')');
        if (start !== -1 && end !== -1) jsonStr = text.substring(start + 1, end);
        
        let detail = argsify(jsonStr);

        // 如果普通接口拿到了数据，直接返回
        if (detail && detail.sub_items && detail.sub_items.length > 0) {
            return detail.sub_items;
        }
        if (detail && detail.videos && detail.videos.length > 0) {
            return [{ title: detail.title || '正片', videos: detail.videos }];
        }
    } catch (e) {}

    try {
        // 如果普通接口失败，尝试专题接口（多季）
        const specialUrl = `https://article.xuexi.cn/data/special/pc/${id}.js`;
        const { data: sData } = await $fetch.get(specialUrl, { headers: HEADERS });
        let sText = String(sData);
        let sJsonStr = sText;
        const sStart = sText.indexOf('(');
        const sEnd = sText.lastIndexOf(')');
        if (sStart !== -1 && sEnd !== -1) sJsonStr = sText.substring(sStart + 1, sEnd);
        
        let sDetail = argsify(sJsonStr);

        // 如果是专题，提取多季数据
        if (sDetail && sDetail.slots && sDetail.slots.length > 0) {
            let allEpisodes = [];
            sDetail.slots.forEach(slot => {
                let seasonName = slot.title ? slot.title.title : '';
                if (slot.list && slot.list.length > 0) {
                    slot.list.forEach(item => {
                        allEpisodes.push({
                            title: `${seasonName} ${item.title}`,
                            articleId: item.$$id
                        });
                    });
                }
            });
            return allEpisodes;
        }
    } catch (e) {}
    
    return [];
}

// 请求单集真实MP4/M3U8
async function fetchSingleEpisode(artId) {
    try {
        const apiUrl = `https://article.xuexi.cn/data/app/${artId}.js`;
        const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
        let text = String(data);
        let jsonStr = text;
        const start = text.indexOf('(');
        const end = text.lastIndexOf(')');
        if (start !== -1 && end !== -1) jsonStr = text.substring(start + 1, end);
        
        let detail = argsify(jsonStr);
        if (detail && detail.videos && detail.videos.length > 0) {
            let info = detail.videos[0].video_storage_info || [];
            if (info.length > 0) {
                return info[0].normal || info[0].url || '';
            }
        }
    } catch (e) {}
    return '';
}

// ==================== 3. 获取剧集 ====================
async function getTracks(ext) {
    ext = safeArgsify(ext);
    let tracks = [];

    if (ext.type === 'tv_detail' && ext.artIds) {
        let subItems = [];
        for (let id of ext.artIds) {
            subItems = subItems.concat(await fetchSingleId(id));
        }
        
        for (let i = 0; i < subItems.length; i++) {
            let item = subItems[i];
            let epName = item.title || `第${i + 1}集`;
            let bestUrl = '';

            // 判断是普通视频结构还是专题提取出来的单集ID
            if (item.videos && item.videos[0]) {
                let info = item.videos[0].video_storage_info || [];
                if (info.length > 0) bestUrl = info[0].normal || info[0].url || '';
            } else if (item.articleId) {
                bestUrl = await fetchSingleEpisode(item.articleId);
            }

            if (bestUrl) {
                tracks.push({ name: epName, pan: '', ext: { url: bestUrl } });
            }
        }

        if (tracks.length === 0) {
            tracks.push({ name: '暂无视频源', pan: '', ext: { url: '' } });
        }
        return jsonify({ list: [{ title: '剧集列表', tracks: tracks }] });
    }

    return jsonify({ list: [] });
}

// ==================== 4. 播放 ====================
async function getPlayinfo(ext) {
    ext = safeArgsify(ext);
    let url = ext.url;
    if (!url) return jsonify({ urls: [] });
    let urls = Array.isArray(url) ? url : [url];
    return jsonify({ 
        urls: urls, 
        headers: { 'User-Agent': UA, 'Referer': SITE + '/' } 
    });
}

async function search(ext) { return jsonify({ list: [] }); }
