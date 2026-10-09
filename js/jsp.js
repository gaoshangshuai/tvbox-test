// 江西广播电视台“今视频”
// 数据源：https://share.jxgdw.com/api/tv/program/page

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const PAGE_SIZE = 10;

let appConfig = {
    ver: 1,
    title: '今视频',
    site: 'https://share.jxgdw.com',
    tabs: [
        { name: '传奇故事',        ext: { id: '104' } },
        { name: '经典传奇',        ext: { id: '101' } },
        { name: '杂志天下',        ext: { id: '100' } },
        { name: '读书廖理',        ext: { id: '136' } },
        { name: '新闻联播',        ext: { id: '147' } },
        { name: '史说江西',        ext: { id: '388' } },
        { name: '沿着长江遇见她',  ext: { id: '462' } },
        { name: '了不起的江西名人', ext: { id: '418' } }
    ]
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

// 获取列表
async function getCards(ext) {
    ext = JSON.parse(ext);
    const columnId = ext.id || '104';
    const page = ext.page || 1;

    const url = `https://share.jxgdw.com/api/tv/program/page?columnId=${columnId}&pageNum=${page}&pageSize=${PAGE_SIZE}`;

    const headers = {
        'User-Agent': UA,
        'Accept': 'application/json, text/plain, */*',
        'Referer': 'https://share.jxgdw.com/'
    };

    let list = [];
    try {
        const { data } = await $fetch.get(url, { headers });
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const items = (json.result && json.result.list) || [];

        list = items.map(item => {
            const playUrl = (item.mediaUrls && item.mediaUrls[0]) || '';
            return {
                vod_id: String(item.id),
                vod_name: item.title || '',
                vod_pic: item.coverUrl || (item.coverImage && item.coverImage.url) || '',
                vod_remarks: item.playTime || '',
                vod_content: item.description || '',
                ext: {
                    id: item.id,
                    url: playUrl
                }
            };
        });
    } catch (e) {
        console.error('获取列表失败:', e);
    }

    return JSON.stringify({ list, filter: [] });
}

// 获取播放列表（每个视频就是一集）
async function getTracks(ext) {
    ext = JSON.parse(ext);
    const tracks = [{
        name: '播放',
        ext: {
            id: ext.id,
            url: ext.url
        }
    }];
    return JSON.stringify({ list: [{ title: '默认线路', tracks }] });
}

// 获取播放地址
async function getPlayinfo(ext) {
    ext = JSON.parse(ext);
    if (!ext.url) return JSON.stringify({ urls: [] });

    // 相对路径补全
    let playUrl = ext.url;
    if (playUrl.startsWith('//')) {
        playUrl = 'https:' + playUrl;
    } else if (playUrl.startsWith('/')) {
        playUrl = 'https://share.jxgdw.com' + playUrl;
    }

    return JSON.stringify({
        urls: [playUrl],
        headers: [
            { 'User-Agent': UA },
            { 'Referer': 'https://share.jxgdw.com/' }
        ]
    });
}

// 搜索（先不做，返回空）
async function search(ext) {
    return JSON.stringify({ list: [] });
}
