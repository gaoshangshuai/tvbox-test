// 齐鲁网 TVBox 解析（完整版）
// 列表接口：https://sdxw.iqilu.com/v2/app/documentary
// 视频列表接口：https://sdxw.iqilu.com/v1/app/article/common/json
// 详情接口：https://sdxw.iqilu.com/v2/app/documentary/detail

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const PAGE_SIZE = 15;
const BASE_URL = 'https://sdxw.iqilu.com';
const IMG_BASE = 'https://img11.iqilu.com';

let appConfig = {
    ver: 1,
    title: '齐鲁网',
    site: BASE_URL,
    tabs: [
        { name: '视频', ext: { id: 'video' } },
        { name: '影视', ext: { id: 'movie' } },
        { name: '动画', ext: { id: 'haier' } },
        { name: '自然', ext: { id: '17' } },
        { name: '历史', ext: { id: '21' } },
        { name: '人文', ext: { id: '19' } }
    ]
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

// ---------- 中文数字转换 ----------
function chineseToNumber(chinese) {
    const map = {
        '零': 0, '一': 1, '二': 2, '三': 3, '四': 4,
        '五': 5, '六': 6, '七': 7, '八': 8, '九': 9,
        '十': 10, '百': 100, '千': 1000
    };
    if (!chinese) return NaN;
    if (/^\d+$/.test(chinese)) return parseInt(chinese);

    let result = 0, temp = 0, hasDigit = false;
    for (let i = 0; i < chinese.length; i++) {
        const char = chinese[i];
        const num = map[char];
        if (num === undefined) return NaN;
        if (num === 10 || num === 100 || num === 1000) {
            if (temp === 0) temp = 1;
            result += temp * num;
            temp = 0;
        } else {
            temp = num;
        }
        hasDigit = true;
    }
    if (!hasDigit) return NaN;
    return result + temp;
}

// 从标题中提取集数，用于排序
function extractEpisodeNumber(title) {
    if (!title) return 99999;

    // 匹配 "第X集" 等，X 可以是阿拉伯数字或中文数字
    const match = title.match(/第\s*([0-9]+|[零一二三四五六七八九十百千]+)\s*[集话期]/);
    if (match && match[1]) {
        const num = chineseToNumber(match[1]);
        if (!isNaN(num)) return num;
    }

    // 匹配 "-第X集"
    const match2 = title.match(/[\-:：]\s*第\s*([0-9]+|[零一二三四五六七八九十百千]+)/);
    if (match2 && match2[1]) {
        const num = chineseToNumber(match2[1]);
        if (!isNaN(num)) return num;
    }

    // 匹配末尾的阿拉伯数字
    const match3 = title.match(/(\d+)\s*$/);
    if (match3 && match3[1]) return parseInt(match3[1]);

    return 99999;
}

// ---------- 获取列表 ----------
async function getCards(ext) {
    ext = JSON.parse(ext);
    const page = ext.page || 1;
    const cateId = ext.id || '237919';

    // ========== 视频分类 ==========
    if (cateId === 'video') {
        const url = `${BASE_URL}/v1/app/article/common/json?cateid=101736&page=${page}&_orgid_=21`;
        const headers = {
            'User-Agent': UA,
            'Accept': '*/*',
            'Referer': 'https://sdxw.iqilu.com/'
        };

        let list = [];
        try {
            const { data } = await $fetch.get(url, { headers });
            let json;
            if (typeof data === 'string') {
                const match = data.match(/^[^(]+\((.*)\)$/s);
                json = match ? JSON.parse(match[1]) : JSON.parse(data);
            } else {
                json = data;
            }

            if (json.code === 1 && json.data && json.data.infos) {
                list = json.data.infos.map(item => {
                    let picUrl = item.thumbnail || '';
                    if (picUrl && !picUrl.startsWith('http')) {
                        picUrl = IMG_BASE + (picUrl.startsWith('/') ? '' : '/') + picUrl;
                    }
                    return {
                        vod_id: item.id,
                        vod_name: item.title || '',
                        vod_pic: picUrl,
                        vod_remarks: item.publish_at || '',
                        vod_content: item.desc || '',
                        ext: { id: item.id, docid: '' }
                    };
                });
            }
        } catch (e) {
            console.error('获取视频列表失败:', e);
        }
        return JSON.stringify({ list, filter: [] });
    }

    // ========== 影视分类（锁死） ==========
    if (cateId === 'movie') {
        if (page > 1) return JSON.stringify({ list: [], filter: [] });

        const list = [
            { vod_id: '209', vod_name: '铁道游击队', vod_pic: 'https://img11.iqilu.com/21/2025/01/04/bebce4615f384787ed03096543600a39.jpg', vod_remarks: '影视', vod_content: '', ext: { docid: '209', id: '' } },
            { vod_id: '206', vod_name: '三毛流浪记', vod_pic: 'https://img11.iqilu.com/21/2025/01/04/249db72225a9c7e94767e52c97b55abe.jpeg', vod_remarks: '影视', vod_content: '', ext: { docid: '206', id: '' } },
            { vod_id: '205', vod_name: '小兵张嘎', vod_pic: 'https://img11.iqilu.com/21/2025/01/04/ceb45f85f6c89041aaeadfe90293d3ec.jpeg', vod_remarks: '影视', vod_content: '', ext: { docid: '205', id: '' } },
            { vod_id: '165', vod_name: '人世间', vod_pic: 'https://img11.iqilu.com/21/2025/01/02/1e932f8522c84c52a29ad9a535abb3e2.jpg', vod_remarks: '影视', vod_content: '', ext: { docid: '165', id: '' } },
            { vod_id: '164', vod_name: '八仙过海', vod_pic: 'https://img11.iqilu.com/21/2025/01/02/f33cf4293def43eb3ee0b974afebb561.jpg', vod_remarks: '影视', vod_content: '', ext: { docid: '164', id: '' } },
            { vod_id: '160', vod_name: '地下交通站', vod_pic: 'https://img11.iqilu.com/21/2025/01/02/ad1d5bc358a6a1ad051fafbb2387046f.jpg', vod_remarks: '影视', vod_content: '', ext: { docid: '160', id: '' } },
            { vod_id: '256', vod_name: '洋女婿的中国年', vod_pic: 'https://img11.iqilu.com/21/2025/01/26/7b0eabc19db606d0ec1f263fda1fe89f.png', vod_remarks: '影视', vod_content: '', ext: { docid: '256', id: '' } },
            { vod_id: '212', vod_name: '2024颜回新传', vod_pic: 'https://img11.iqilu.com/21/2025/01/13/06e4009f6887678651e7dc014c131a74.jpg', vod_remarks: '影视', vod_content: '', ext: { docid: '212', id: '' } },
            { vod_id: '166', vod_name: '绘梦潍坊', vod_pic: 'https://img11.iqilu.com/21/2025/01/03/acbb6422397d55b476e3427668114058.jpg', vod_remarks: '影视', vod_content: '', ext: { docid: '166', id: '' } }
        ];
        return JSON.stringify({ list, filter: [] });
    }

    // ========== 动画分类（锁死） ==========
    if (cateId === 'haier') {
        if (page > 1) return JSON.stringify({ list: [], filter: [] });

        const list = [
            { vod_id: '303', vod_name: '剑来', vod_pic: 'https://img8.iqilu.com/vmsimgs/2025/11/07/6123631_794688fd865f4316a3390e626922a45c.png', vod_remarks: '动画', vod_content: '', ext: { docid: '303', id: '' } },
            { vod_id: '301', vod_name: '恰同学少年', vod_pic: 'https://img8.iqilu.com/vmsimgs/2025/11/06/6133057_a3f4d37b377548c786e0edf5fd165374.jpg', vod_remarks: '动画', vod_content: '', ext: { docid: '301', id: '' } },
            { vod_id: '302', vod_name: '宠物旅店', vod_pic: 'https://img11.litenews.cn/21/2025/11/07/79a32654ac824ee9aa9b467c14eb3e72.jpg', vod_remarks: '动画', vod_content: '', ext: { docid: '302', id: '' } },
            { vod_id: '300', vod_name: '大山里的“梦之队”', vod_pic: 'https://img8.iqilu.com/vmsimgs/2025/11/06/6100756_008fd4e66ad848a8aa6061b454977951.png', vod_remarks: '动画', vod_content: '', ext: { docid: '300', id: '' } },
            { vod_id: '299', vod_name: '故宫里的大怪兽之月光迷宫', vod_pic: 'https://img8.iqilu.com/vmsimgs/2025/11/06/6102117_e3dcf1fefda04855a3e150a101180c38.jpg', vod_remarks: '动画', vod_content: '', ext: { docid: '299', id: '' } },
            { vod_id: '298', vod_name: '下姜村的共同富裕梦', vod_pic: 'https://img8.iqilu.com/vmsimgs/2025/11/06/6133754_e7651ea5299c45d5a084da837832580e.jpg', vod_remarks: '动画', vod_content: '', ext: { docid: '298', id: '' } },
            { vod_id: '297', vod_name: '家有灶君', vod_pic: 'https://img8.iqilu.com/vmsimgs/2025/11/06/6114530_0af75c6a1f664250a203f00a8184ac8c.png', vod_remarks: '动画', vod_content: '', ext: { docid: '297', id: '' } },
            { vod_id: '277', vod_name: '海尔兄弟', vod_pic: 'https://img11.iqilu.com/21/2025/03/31/f7bbc695ef3945a06ae998095166db30.jpg', vod_remarks: '动画', vod_content: '经典动画', ext: { docid: '277', id: '' } }
        ];
        return JSON.stringify({ list, filter: [] });
    }

    // ========== 其它纪录片分类（自然/历史/人文） ==========
    const url = `${BASE_URL}/v2/app/documentary?orgid=21&cateid=${cateId}&year=&pagesize=${PAGE_SIZE}&page=${page}`;
    const headers = {
        'User-Agent': UA,
        'Accept': '*/*',
        'Referer': 'https://sdxw.iqilu.com/w/documentary_lib.html?4&237919'
    };

    let list = [];
    try {
        const { data } = await $fetch.get(url, { headers });
        const json = typeof data === 'string' ? JSON.parse(data) : data;

        if (json.code === 1 && json.data && json.data.infos) {
            const seriesMap = new Map();
            json.data.infos.forEach(item => {
                const docId = item.id;
                if (!docId || seriesMap.has(docId)) return;

                let picUrl = item.image || item.thumbnail || '';
                if (picUrl && !picUrl.startsWith('http')) {
                    picUrl = IMG_BASE + (picUrl.startsWith('/') ? '' : '/') + picUrl;
                }

                seriesMap.set(docId, {
                    vod_id: docId,
                    vod_name: item.title || '',
                    vod_pic: picUrl,
                    vod_remarks: item.year || '',
                    vod_content: item.desc || '',
                    ext: { docid: docId, id: item.id }
                });
            });
            list = Array.from(seriesMap.values());
        }
    } catch (e) {
        console.error('获取列表失败:', e);
    }

    return JSON.stringify({ list, filter: [] });
}

// ---------- 获取分集列表（带集数排序） ----------
async function getTracks(ext) {
    ext = JSON.parse(ext);
    const docId = ext.docid;
    const episodeId = ext.id;

    // 单集视频
    if (!docId && episodeId) {
        return JSON.stringify({
            list: [{ title: '默认线路', tracks: [{ name: '播放', ext: { id: episodeId, episodeId: episodeId } }] }]
        });
    }

    if (!docId && !episodeId) {
        return JSON.stringify({
            list: [{ title: '默认线路', tracks: [{ name: '播放', ext: { id: ext.id, episodeId: '' } }] }]
        });
    }

    // 系列：请求详情页获取所有分集
    const detailUrl = `${BASE_URL}/v2/app/documentary/detail?orgid=21&docid=${docId}`;
    const headers = {
        'User-Agent': UA,
        'Referer': 'https://sdxw.iqilu.com/w/documentary_detail/ZG9jLTIxLTE1OA==.html',
        'Orgid': '21',
        'X-Requested-With': 'XMLHttpRequest'
    };

    let tracks = [];
    try {
        const { data } = await $fetch.get(detailUrl, { headers });
        const json = typeof data === 'string' ? JSON.parse(data) : data;

        if (json.code === 1 && json.data) {
            const info = json.data.info || {};
            const relate = json.data.relateInfo || [];

            let allEpisodes = [];
            if (info.id && info.title) allEpisodes.push({ id: info.id, name: info.title });
            relate.forEach(item => {
                if (item.id && item.title) allEpisodes.push({ id: item.id, name: item.title });
            });

            // 去重
            const seen = new Set();
            const uniqueEpisodes = allEpisodes.filter(ep => {
                if (seen.has(ep.id)) return false;
                seen.add(ep.id);
                return true;
            });

            // 按集数排序（支持中文数字）
            uniqueEpisodes.sort((a, b) => {
                const numA = extractEpisodeNumber(a.name);
                const numB = extractEpisodeNumber(b.name);
                if (numA !== numB) return numA - numB;
                return parseInt(a.id) - parseInt(b.id);
            });

            tracks = uniqueEpisodes.map(ep => ({
                name: ep.name,
                ext: { id: ep.id, episodeId: ep.id }
            }));
        }
    } catch (e) {
        console.error('获取分集失败:', e);
    }

    if (tracks.length === 0) {
        tracks = [{ name: '播放', ext: { id: episodeId || ext.id, episodeId: episodeId || '' } }];
    }

    return JSON.stringify({ list: [{ title: '默认线路', tracks }] });
}

// ---------- 获取播放地址（只用 id 参数） ----------
async function getPlayinfo(ext) {
    ext = JSON.parse(ext);
    const episodeId = ext.id || ext.episodeId;
    if (!episodeId) return JSON.stringify({ urls: [] });

    const detailUrl = `${BASE_URL}/v2/app/documentary/detail?id=${episodeId}&orgid=21`;
    const headers = {
        'User-Agent': UA,
        'Referer': 'https://sdxw.iqilu.com/w/documentary_detail/ZG9jLTIxLTE1OA==.html',
        'Orgid': '21',
        'X-Requested-With': 'XMLHttpRequest'
    };

    let playUrl = '';
    try {
        const { data } = await $fetch.get(detailUrl, { headers });
        const json = typeof data === 'string' ? JSON.parse(data) : data;

        if (json.code === 1 && json.data && json.data.info && json.data.info.media) {
            const mediaList = json.data.info.media;
            if (mediaList.length > 0) playUrl = mediaList[0].url || '';
        }
    } catch (e) {
        console.error('获取播放地址失败:', e);
    }

    if (!playUrl) return JSON.stringify({ urls: [] });

    return JSON.stringify({
        urls: [playUrl],
        headers: [
            { 'User-Agent': UA },
            { 'Referer': 'https://sdxw.iqilu.com/' }
        ]
    });
}

async function search(ext) {
    return JSON.stringify({ list: [] });
}
