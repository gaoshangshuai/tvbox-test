const cheerio = createCheerio();

const SITE = 'https://www.yixi.tv';
const COVER = 'https://i.gtimg.cn/qqlive/img/jpgcache/files/qqvideo/hori/7/7qm4vff0bszr5m0.jpg';

// ★★★ 你的视频列表 ★★★
const VIDEOS = [
    {
        id: 'v1',
        title: '一席视频1',
        cover: COVER,
        url: 'https://alicdn.yixi.tv/1790749583609-3.mp4',
    },
    {
        id: 'v2',
        title: '一席视频2',
        cover: COVER,
        url: 'https://alicdn.yixi.tv/1790749583609-3.mp4',
    },
    {
        id: 'v3',
        title: '一席视频3',
        cover: COVER,
        url: 'https://alicdn.yixi.tv/1789621657336-3.mp4',
    },
    {
        id: 'v4',
        title: '一席视频4',
        cover: COVER,
        url: 'https://alicdn.yixi.tv/1789621657336-3.mp4',
    },
    {
        id: 'v5',
        title: '一席视频5',
        cover: COVER,
        url: 'https://alicdn.yixi.tv/1789621657336-3.mp4',
    },
];

let appConfig = {
    ver: 1,
    title: '一席',
    site: SITE,
    tabs: [
        { name: '全部', ext: { id: 'all' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

// 列表：返回所有视频
async function getCards(ext) {
    let cards = [];
    VIDEOS.forEach(v => {
        cards.push({
            vod_id: v.id,
            vod_name: v.title,
            vod_pic: v.cover,
            vod_remarks: '',
            ext: { id: v.id, type: 0 },
        });
    });
    return jsonify({ list: cards });
}

// 剧集：返回对应链接
async function getTracks(ext) {
    ext = argsify(ext);
    const id = ext.id;
    const video = VIDEOS.find(v => v.id === id);
    if (!video) return jsonify({ list: [] });

    return jsonify({
        list: [{
            title: '默认分组',
            tracks: [{
                name: '播放',
                pan: '',
                ext: { url: video.url },
            }],
        }],
    });
}

// 播放：直接返回地址，带上 Referer
async function getPlayinfo(ext) {
    ext = argsify(ext);
    const url = ext.url;
    if (!url) return jsonify({ urls: [] });

    return jsonify({
        urls: [url],
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Referer': SITE + '/',
            'Origin': SITE,
        }
    });
}

// 搜索：按标题模糊匹配
async function search(ext) {
    ext = argsify(ext);
    const keyword = (ext.text || ext.wd || '').trim();
    let cards = [];
    VIDEOS.forEach(v => {
        if (!keyword || v.title.includes(keyword)) {
            cards.push({
                vod_id: v.id,
                vod_name: v.title,
                vod_pic: v.cover,
                vod_remarks: '',
                ext: { id: v.id, type: 0 },
            });
        }
    });
    return jsonify({ list: cards });
}
