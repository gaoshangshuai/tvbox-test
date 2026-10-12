// 齐鲁网纪录片 TVBox 解析
// 列表接口：https://sdxw.iqilu.com/v2/app/documentary
// 详情接口：https://sdxw.iqilu.com/v2/app/documentary/detail

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const PAGE_SIZE = 15;
const BASE_URL = 'https://sdxw.iqilu.com';
const IMG_BASE = 'https://img11.iqilu.com';

let appConfig = {
    ver: 1,
    title: '齐鲁网纪录片',
    site: BASE_URL,
    // 【修改点1】按你的要求，只保留自然、历史、人文三个分类
    tabs: [
        { name: '自然', ext: { id: '17' } },
        { name: '历史', ext: { id: '21' } },
        { name: '人文', ext: { id: '19' } }
    ]
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

// 获取列表（使用新的分类接口，自动聚合系列）
async function getCards(ext) {
    ext = JSON.parse(ext);
    const page = ext.page || 1;
    const cateId = ext.id;

    // 【修改点2】使用你提供的分类接口
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
            // 聚合系列（按 doc_id 去重）
            const seriesMap = new Map();

            json.data.infos.forEach(item => {
                const docId = item.id; // 分类接口返回的 id 就是系列 docid
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
                    ext: {
                        docid: docId,
                        id: item.id
                    }
                });
            });

            list = Array.from(seriesMap.values());
        }
    } catch (e) {
        console.error('获取列表失败:', e);
    }

    return JSON.stringify({ list, filter: [] });
}

// 获取分集列表（根据 docid 请求详情页，合并 info 和 relateInfo）
async function getTracks(ext) {
    ext = JSON.parse(ext);
    const docId = ext.docid;
    const episodeId = ext.id;

    if (!docId && !episodeId) {
        return JSON.stringify({ list: [{ title: '默认线路', tracks: [{ name: '播放', ext: { id: ext.id, docid: '', episodeId: '' } }] }] });
    }

    const detailUrl = `${BASE_URL}/v2/app/documentary/detail?orgid=21&docid=${docId || ''}${episodeId ? `&id=${episodeId}` : ''}`;
    const headers = {
        'User-Agent': UA,
        'Referer': `https://sdxw.iqilu.com/w/documentary_detail/ZG9jLTIxLTE1OA==.html`,
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

            // 当前集
            if (info.id && info.title) {
                allEpisodes.push({ id: info.id, name: info.title });
            }

            // 关联集
            relate.forEach(item => {
                if (item.id && item.title) {
                    allEpisodes.push({ id: item.id, name: item.title });
                }
            });

            // 去重
            const seen = new Set();
            const uniqueEpisodes = allEpisodes.filter(ep => {
                if (seen.has(ep.id)) return false;
                seen.add(ep.id);
                return true;
            });

            // 按 id 排序
            uniqueEpisodes.sort((a, b) => parseInt(a.id) - parseInt(b.id));

            tracks = uniqueEpisodes.map(ep => ({
                name: ep.name,
                ext: { id: ep.id, docid: docId, episodeId: '' }
            }));
        }
    } catch (e) {
        console.error('获取分集失败:', e);
    }

    if (tracks.length === 0) {
        tracks = [{ name: '播放', ext: { id: episodeId || ext.id, docid: docId, episodeId: episodeId || '' } }];
    }

    return JSON.stringify({ list: [{ title: '默认线路', tracks }] });
}

// 获取播放地址
async function getPlayinfo(ext) {
    ext = JSON.parse(ext);
    const episodeId = ext.id || ext.episodeId;
    const docId = ext.docid;

    if (!episodeId && !docId) return JSON.stringify({ urls: [] });

    let detailUrl = `${BASE_URL}/v2/app/documentary/detail?orgid=21&docid=${docId || ''}`;
    if (episodeId) {
        detailUrl += `&id=${episodeId}`;
    }

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
            if (mediaList.length > 0) {
                playUrl = mediaList[0].url || '';
            }
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
