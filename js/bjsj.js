// 北京时间（btime.com）TVBox源 - 笑动剧场（完美播放版）
const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1';
const HOST = 'https://m.btime.com';
const API_HOST = 'https://app.api.btime.com';
const CID = '505942298cb92ec1e2526b3427a8a229'; // 笑动剧场的 cid

let appConfig = {
    ver: 1,
    title: '北京时间',
    site: 'btime.com',
    tabs: [
        { name: '笑动剧场', ext: { id: CID, apiType: 'list' } }
    ]
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

// 获取列表
async function getCards(ext) {
    ext = JSON.parse(ext);
    const page = ext.page || 1;
    const count = 12;
    const url = `${API_HOST}/news/list?cid=${CID}&is_paging=1&count=${count}&refresh_count=1&refresh_type=1&os_type=h5&ver=110500&last=&device_id=1a1280d7d329ef-0114163195aabca-5162615a-1474560-1a1280d7d331c04&_=${Date.now()}`;
    const headers = { 'User-Agent': UA, 'Referer': 'https://m.btime.com/', 'Accept': '*/*' };

    let list = [];
    try {
        const { data } = await $fetch.get(url, { headers });
        let jsonStr = data;
        const jsonpMatch = data.match(/^[^\(]*\(([\s\S]*)\)[^\)]*$/);
        if (jsonpMatch) jsonStr = jsonpMatch[1];
        const json = JSON.parse(jsonStr);
        const items = (json.data && json.data.data) || [];

        // 只保留 type === 3 的条目（具体视频），过滤掉 type === 21（栏目主页）
        list = items.filter(item => item.type === 3).map(item => {
            const info = item.data || {};
            let vod_pic = '';
            if (info.covers_extends) {
                try {
                    const extendObj = typeof info.covers_extends === 'string' ? JSON.parse(info.covers_extends) : info.covers_extends;
                    vod_pic = extendObj['16:9'] || '';
                } catch (e) {}
            }
            if (!vod_pic && info.covers && info.covers.length > 0) vod_pic = info.covers[0];

            return {
                vod_id: item.gid || item.dupid || '',
                vod_name: info.title || '',
                vod_pic: vod_pic,
                vod_remarks: info.duration || info.pdate_str || '视频',
                vod_content: info.summary || '',
                ext: { id: item.gid, url: '' }
            };
        });
    } catch (e) { console.error('获取列表失败:', e); }

    return JSON.stringify({ list, filter: [] });
}

// 获取播放列表
async function getTracks(ext) {
    ext = JSON.parse(ext);
    return JSON.stringify({
        list: [{ title: '默认线路', tracks: [{ name: '播放', ext: { id: ext.id, url: ext.url } }] }]
    });
}

// 获取播放地址
async function getPlayinfo(ext) {
    ext = JSON.parse(ext);
    if (!ext.id) return JSON.stringify({ urls: [] });

    const headers = {
        'User-Agent': UA,
        'Referer': 'https://m.btime.com/',
        'Accept': '*/*'
    };

    let playUrl = '';
    try {
        // 请求视频真实播放接口
        const playApi = `${API_HOST}/video/play?os_type=h5&id=${ext.id}&_=${Date.now()}&callback=jsonp4`;
        const { data } = await $fetch.get(playApi, { headers });

        // 处理 JSONP 格式
        let jsonStr = data;
        const jsonpMatch = data.match(/^[^\(]*\(([\s\S]*)\)[^\)]*$/);
        if (jsonpMatch) jsonStr = jsonpMatch[1];
        const json = JSON.parse(jsonStr);

        // 提取真实播放地址
        if (json.data && json.data.video_stream && json.data.video_stream.length > 0) {
            playUrl = json.data.video_stream[0].stream_url;
        } else if (json.data && json.data.video_streams && json.data.video_streams.length > 0) {
            playUrl = json.data.video_streams[0][0].stream_url;
        }

        // 强制将 http 转换为 https
        if (playUrl && playUrl.startsWith('http://')) {
            playUrl = playUrl.replace('http://', 'https://');
        }

    } catch (e) {
        console.error('获取播放地址失败:', e);
    }

    if (!playUrl) return JSON.stringify({ urls: [] });

    return JSON.stringify({
        urls: [playUrl],
        headers: [
            { 'User-Agent': UA },
            { 'Referer': 'https://m.btime.com/' }
        ]
    });
}

// 搜索（暂不实现）
async function search(ext) {
    return JSON.stringify({ list: [] });
}
