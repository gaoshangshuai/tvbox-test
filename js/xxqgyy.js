const cheerio = createCheerio();
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';
const SITE = 'https://www.xuexi.cn';
const DEFAULT_PIC = 'https://boot-img.xuexi.cn/image/1005/process/93ef3edd804a4a26b7f8f899e8bf258c.jpg';

// ==================== 1. 动态频道列表 ====================
const CHANNEL_LIST = {
    movie: 'https://www.xuexi.cn/lgdata/18rkaul9h7l.json',
    movie_tv: 'https://www.xuexi.cn/lgdata/109tvcosfnl.json',
    movie_doc: 'https://www.xuexi.cn/lgdata/17fsu5j4hnl.json'
};

// ==================== 2. 动画列表（按历史时期分类） ====================
const ANIMATION_LIST = [
    // ----- 远古 -----
    { name: '神话故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/a358ddf4ea2e469eb2c9a465ec87de21.jpg', desc: '全24集', period: '远古', artIds: ['6142922305421370437'] },
    { name: '山海精奇', pic: 'https://boot-img.xuexi.cn/image/1005/process/0678c9f7ff344c9fbcdbe7077d54c9ae.jpg', desc: '全31集', period: '远古', artIds: ['16368297497425794160'] },
    { name: '山海传奇', pic: 'https://boot-img.xuexi.cn/image/1005/process/d15683e37efa4d11ab877e9055a098ea.jpg', desc: '全13集', period: '远古', artIds: ['1860699912324656805'] },
    { name: '大禹治水', pic: 'https://boot-img.xuexi.cn/image/1005/process/dc3f12c663a1437fbf18669d8c312d37.png', desc: '全12集', period: '夏商周', artIds: ['2222089652804542292'] },
    { name: '中华治水故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/01a06756a5bc4818b8f47e31b2903df9.jpg', desc: '全26集', period: '夏商周', artIds: ['17740314066450394774'] },
    { name: '年画中的传奇', pic: 'https://boot-img.xuexi.cn/image/1005/process/c2d80bcb5f5a4cf08ba1adcd9283f392.jpg', desc: '全30集', period: '夏商周', artIds: ['1040976018234785569'] },
    { name: '茶婆婆渔婆婆蚕婆婆第一季', pic: 'https://boot-img.xuexi.cn/image/1009/process/cd090627d4a74cd2ab3c19e44317dd2d.jpg', desc: '全12集', period: '夏商周', artIds: ['3532802750074198149'] },
    { name: '茶婆婆渔婆婆蚕婆婆第二季', pic: 'https://boot-img.xuexi.cn/image/1005/process/fac5797a9a314617b15bad0879c5276a.jpg', desc: '全12集', period: '夏商周', artIds: ['5808432544675419092'] },

    // ----- 夏商周 -----
    { name: '哪吒传奇', pic: 'https://boot-img.xuexi.cn/image/1005/process/395e971624d243619c0cf444418ef5b9.jpg', desc: '全52集', period: '夏商周', artIds: ['10428547373355348143'] },
    { name: '少年英雄小哪吒', pic: 'https://boot-img.xuexi.cn/image/1005/process/2efa18bef839420d8a6a2f3025d1bde3.png', desc: '全26集', period: '夏商周', artIds: ['15813614759084751263'] },
    
   
    { name: '少年师爷之公祭大禹', pic: 'https://boot-img.xuexi.cn/image/1005/process/3e31244533b14847b6f64ccec0585a25.jpg', desc: '全26集', period: '夏商周', artIds: ['5828744918912178544'] },
    { name: '孔子', pic: 'https://boot-img.xuexi.cn/image/1005/process/f063b05bd36943eb8f55a1c44168b917.jpg', desc: '全104集', period: '夏商周', artIds: ['8937425226398520134'] },
    { name: '孟母教子', pic: 'https://boot-img.xuexi.cn/image/1005/process/5412f4ba1a9c40709341581461af2f2a.jpg', desc: '全30集', period: '夏商周', artIds: ['14368570024158892507'] },

    // ----- 秦汉三国 -----
    { name: '丝路传奇特使张骞', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/7ec29b537147417f9b7c57d284d55c9c_crop_1581671578923_h_422_w_750_1581671578946_h_422_w_750.jpg', desc: '全52集', period: '秦汉三国', artIds: ['4223661874274269490'] },
    { name: '丝路', pic: 'https://boot-img.xuexi.cn/image/1005/process/cfac9f6f92f54ef8b2342227ea3288bb.jpg', desc: '全52集', period: '秦汉三国', artIds: ['14403418793113483431'] },

    // ----- 晋南北朝（暂无，可后续补充） -----
    { name: '好心宝宝之冼夫人', pic: 'https://boot-img.xuexi.cn/image/1005/process/d73682fd1e8d4c2c853e0c088f51bbd7.jpg', desc: '全26集', period: '晋南北朝', artIds: ['6635019207490556798'] },
    // ----- 隋唐宋 -----
    { name: '千秋诗颂', pic: 'https://boot-img.xuexi.cn/image/1005/process/87e3f266bd9946f4b3ba378621829009.jpg', desc: '全11集', period: '隋唐宋', artIds: ['8432909394850269379'] },
    { name: '少年岳飞', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/97e323ca74b84306ad29984e53ebb09b_crop_new_h_422_w_750_h_422_w_750.jpg', desc: '全1集', period: '隋唐宋', artIds: ['2462806302483100325'] },
    { name: '敦煌的故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/00dfd001cd334a4196493b1f0e42794b.jpg', desc: '全13集', period: '隋唐宋', artIds: ['16588381422921021829'] },
    { name: '杨家将(上)', pic: 'https://boot-img.xuexi.cn/image/1005/process/b3b64bccc583471da068ef067de828bf.jpg', desc: '全6集', period: '隋唐宋', artIds: ['3323720718145398493'] },
    { name: '少年苏东坡', pic: 'https://boot-img.xuexi.cn/image/1005/process/37053f991326439aafefa3d5794364b0.jpg', desc: '全52集', period: '隋唐宋', artIds: ['16464293379283892941'] },

    // ----- 元明清 -----
    { name: '西游记', pic: 'https://boot-img.xuexi.cn/image/1005/process/21d3eebc28164884b6e6b711415ee3a8.jpg', desc: '全52集', period: '元明清', artIds: ['6125097417779881106'] },
    { name: '少年师爷', pic: 'https://boot-img.xuexi.cn/image/1005/process/7de0a98b01d641f99324823f2cd9912c.jpg', desc: '全26集', period: '元明清', artIds: ['2056682991035843311'] },
    { name: '故宫里的大怪兽 洞光宝石的秘密', pic: 'https://boot-img.xuexi.cn/image/1005/process/0a184835891e4ddb953149daaa909900.jpg', desc: '全26集', period: '元明清', artIds: ['9976204589374160998'] },

    // ----- 现代 -----
    { name: '大鸾——周恩来童年读书的故事', pic: 'https://boot-img.xuexi.cn/image/1005/process/996d7a95d0e04a92b55e25fd6767bc36.jpg', desc: '全1集', period: '现代', artIds: ['4606834724344024542'] },
    { name: '翻开这一页', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/c174268cf5664260a6ec597f2217602a_crop_1582088569128_h_422_w_750_1582088569182_h_422_w_750.jpg', desc: '全26集', period: '现代', artIds: ['10590178754709049060'] },
    { name: '鸡毛信', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/ea079c1c21634554885e90668ebb0800_crop_1580975481166_h_422_w_750_1580975481291_h_422_w_750.jpg', desc: '全12集', period: '现代', artIds: ['13355596699438012141'] },
   
    { name: '林海雪原', pic: 'https://boot-img.xuexi.cn/image/1005/process/98bedf46ee8746dbaadd86b3e73bb7a7.jpg', desc: '全50集', period: '现代', artIds: ['11655163781253226496'] },
    { name: '长征先锋', pic: 'https://boot-img.xuexi.cn/image/1005/process/521e22e4b1154a2d9551f6d9fbb4376d.jpg', desc: '全52集', period: '现代', artIds: ['7521238365152978329'] },
    { name: '犟驴小红军', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/5646dcb04b6041abaff2359f45a2c96b_crop_1581052257107_h_422_w_750_1581052257185_h_422_w_750.jpg', desc: '全12集', period: '现代', artIds: ['1439398455075646484'] },
    { name: '寻找英雄 小淘气长征记', pic: 'https://boot-img.xuexi.cn/crawler/imageServer/9652b016cd394ae49590bac4010090e5_crop_new_h_422_w_750_h_422_w_750.jpg', desc: '全26集', period: '现代', artIds: ['783402746357409941'] },
    { name: '那年那兔那些事儿', pic: 'https://boot-img.xuexi.cn/image/1006/process/9a020fdb20104931ad51743d44519c51.jpg', desc: '全3季', period: '现代', artIds: ['32561504674169041'] },
    { name: '四渡赤水', pic: 'https://boot-img.xuexi.cn/image/1005/process/76fb7792312d42be936e04e65fca3325.jpg', desc: '全8集', period: '现代', artIds: ['8374057897549941762'] }
];

// 动画 tab 的 id → 时期 映射
const ANIMATION_PERIODS = {
    ani_yuangu: '远古',
    ani_xia: '夏商周',
    ani_qinhan: '秦汉三国',
    ani_jin: '晋南北朝',
    ani_suitang: '隋唐宋',
    ani_yuanmingqing: '元明清',
    ani_modern: '现代'
};

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
        { name: '远古动画', ext: { id: 'ani_yuangu' }, ui: 1 },
        { name: '夏商周动画', ext: { id: 'ani_xia' }, ui: 1 },
        { name: '秦汉三国动画', ext: { id: 'ani_qinhan' }, ui: 1 },
        { name: '晋南北朝动画', ext: { id: 'ani_jin' }, ui: 1 },
        { name: '隋唐宋动画', ext: { id: 'ani_suitang' }, ui: 1 },
        { name: '元明清动画', ext: { id: 'ani_yuanmingqing' }, ui: 1 },
        { name: '现代动画', ext: { id: 'ani_modern' }, ui: 1 },
        { name: '电影', ext: { id: 'movie' }, ui: 1 },
        { name: '电视剧', ext: { id: 'movie_tv' }, ui: 1 },
        { name: '纪录片', ext: { id: 'movie_doc' }, ui: 1 }
    ]
};

async function getConfig() { return jsonify(appConfig); }

function safeArgsify(ext) {
    if (ext == null) return {};
    if (typeof ext === 'object') return ext;
    try { return argsify(ext); } catch (e) { return {}; }
}

// ==================== 3. 横版海报处理 ====================
function makeLandscape(url) {
    if (!url) return url;
    if (url.indexOf('x-oss-process') !== -1) return url;
    if (url.indexOf('images.weserv.nl') !== -1) return url;

    const m = url.match(/_h_(\d+)_w_(\d+)/);
    if (m && parseInt(m[2], 10) > parseInt(m[1], 10)) return url;

    if (url.indexOf('boot-img.xuexi.cn') !== -1) {
        const sep = url.indexOf('?') === -1 ? '?' : '&';
        return url + sep + 'x-oss-process=image/resize,m_fill,w_750,h_422';
    }

    const clean = url.replace(/^https?:\/\//, '');
    return 'https://images.weserv.nl/?url=' + encodeURIComponent(clean) + '&w=750&h=422&fit=cover&output=jpg';
}

// ==================== 4. 动态获取卡片 ====================
async function getCards(ext) {
    ext = safeArgsify(ext);
    let page = ext.page || 1;
    if (page > 1) return jsonify({ list: [] });

    let id = ext.id || 'ani_yuangu';
    let cards = [];

    // ---------- 动画（按历史时期拆分） ----------
    if (id === 'ani' || ANIMATION_PERIODS[id]) {
        const period = ANIMATION_PERIODS[id];
        const list = period
            ? ANIMATION_LIST.filter(d => d.period === period)
            : ANIMATION_LIST;

        list.forEach(drama => {
            cards.push({
                vod_id: drama.artIds.join(','),
                vod_name: drama.name,
                vod_pic: makeLandscape(drama.pic),
                vod_remarks: drama.desc,
                ext: { type: 'tv_detail', artIds: drama.artIds }
            });
        });
        return jsonify({ list: cards });
    }

    // ---------- 其他频道 ----------
    let listUrl = CHANNEL_LIST[id];
    if (!listUrl) return jsonify({ list: [] });

    try {
        const { data } = await $fetch.get(listUrl, { headers: HEADERS });
        let list = typeof data === 'string' ? argsify(data) : data;
        const addedIds = new Set();

        if (Array.isArray(list)) {
            list.sort((a, b) => {
                let getTime = (item) => {
                    let t = item.publishTime || item.showTime || item.publish_time || item.create_time || item.time || 0;
                    if (typeof t === 'string') {
                        let parsed = Date.parse(t.replace(/-/g, '/'));
                        if (!isNaN(parsed)) return parsed;
                    }
                    return parseInt(t, 10) || 0;
                };
                return getTime(b) - getTime(a);
            });

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
                    vod_pic: makeLandscape(cover || DEFAULT_PIC),
                    vod_remarks: item.showSource || item.publishTime || item.publish_date || '',
                    ext: { type: 'tv_detail', artIds: [itemId] }
                });
            });
        }
    } catch (e) {
        console.log('获取列表失败: ' + e.message);
    }

    return jsonify({ list: cards });
}

// ==================== 5. 解析底层数据 ====================
async function fetchSingleId(id) {
    try {
        const apiUrl = `https://boot-source.xuexi.cn/data/app/${id}.js`;
        const { data } = await $fetch.get(apiUrl, { headers: HEADERS });
        let text = String(data);
        let jsonStr = text;
        const start = text.indexOf('(');
        const end = text.lastIndexOf(')');
        if (start !== -1 && end !== -1) jsonStr = text.substring(start + 1, end);

        let detail = argsify(jsonStr);

        if (detail && detail.sub_items && detail.sub_items.length > 0) return detail.sub_items;
        if (detail && detail.videos && detail.videos.length > 0) {
            return [{ title: detail.title || '正片', videos: detail.videos }];
        }
    } catch (e) {}

    try {
        const specialUrl = `https://article.xuexi.cn/data/special/pc/${id}.js`;
        const { data: sData } = await $fetch.get(specialUrl, { headers: HEADERS });
        let sText = String(sData);
        let sJsonStr = sText;
        const sStart = sText.indexOf('(');
        const sEnd = sText.lastIndexOf(')');
        if (sStart !== -1 && sEnd !== -1) sJsonStr = sText.substring(sStart + 1, sEnd);

        let sDetail = argsify(sJsonStr);

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
            if (info.length > 0) return info[0].normal || info[0].url || '';
        }
    } catch (e) {}
    return '';
}

// ==================== 6. 获取剧集 ====================
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

// ==================== 7. 播放 ====================
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

// ==================== 8. 搜索 ====================
async function search(ext) {
    ext = safeArgsify(ext);
    const keyword = ext.text || ext.wd || '';
    const page = ext.page || 1;
    if (!keyword) return jsonify({ list: [], page });

    const endpoints = [
        `https://so.xuexi.cn/search/api/search.json?keyword=${encodeURIComponent(keyword)}&page=${page}&size=20&sort=default&type=all`,
        `https://so.xuexi.cn/search/api/search.json?keyword=${encodeURIComponent(keyword)}&page=${page}&size=20`,
        `https://www.xuexi.cn/search/api/search.json?keyword=${encodeURIComponent(keyword)}&page=${page}&size=20`
    ];

    const cards = [];
    const added = new Set();

    for (let i = 0; i < endpoints.length; i++) {
        try {
            const { data } = await $fetch.get(endpoints[i], { headers: HEADERS });
            let res = typeof data === 'string' ? argsify(data) : data;
            if (!res) continue;

            let items = null;
            if (res.data && Array.isArray(res.data.list)) items = res.data.list;
            else if (res.data && Array.isArray(res.data.items)) items = res.data.items;
            else if (res.data && Array.isArray(res.data.records)) items = res.data.records;
            else if (Array.isArray(res.list)) items = res.list;
            else if (Array.isArray(res.items)) items = res.items;
            else if (Array.isArray(res.data)) items = res.data;

            if (items && items.length > 0) {
                items.forEach(item => {
                    let itemId = item.itemId || item.id || item.article_id || item.articleId || item.docId || '';
                    if (!itemId && item.url) {
                        const match = String(item.url).match(/\/detail\/(\d+)/);
                        if (match) itemId = match[1];
                    }
                    if (!itemId || added.has(itemId)) return;
                    added.add(itemId);

                    let cover = item.thumbImage || item.image || item.pic || item.cover
                        || item.imageUrl || item.thumbnail || item.thumb || '';
                    if (cover && cover.indexOf('http') !== 0) {
                        cover = cover.indexOf('//') === 0
                            ? 'https:' + cover
                            : SITE + (cover.charAt(0) === '/' ? '' : '/') + cover;
                    }

                    cards.push({
                        vod_id: itemId,
                        vod_name: item.title || item.name || '',
                        vod_pic: makeLandscape(cover || DEFAULT_PIC),
                        vod_remarks: item.showSource || item.publishTime
                            || item.publish_date || item.source || '',
                        ext: { type: 'tv_detail', artIds: [itemId] }
                    });
                });

                if (cards.length > 0) break;
            }
        } catch (e) {
            console.log('search endpoint failed: ' + e.message);
        }
    }

    return jsonify({ list: cards, page });
}
