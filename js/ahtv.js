// 安徽广播电视台
// 数据源：https://mapi.ahtv.cn/api/v1/contents.php

const UA = 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/94.0.4606.71 Safari/537.36';
const PAGE_SIZE = 20;

let appConfig = {
    ver: 1,
    title: '安徽广电',
    site: 'https://www.ahtv.cn',
    tabs: [
        { name: '男生女生向前冲', ext: { id: '4202' } },
        { name: '信仰的力量', ext: { id: '31093' } },
        { name: '科学那么美', ext: { id: '31771' } },
        { name: '抗敌号角', ext: { id: '32118' } },
        { name: '点亮历史的灯火', ext: { id: '31872' } },
        { name: '带着课本去旅行', ext: { id: '31343' } }
    ]
};

async function getConfig() {
    return JSON.stringify(appConfig);
}

// 获取列表
async function getCards(ext) {
    ext = JSON.parse(ext);
    const columnId = ext.id || '4202';
    const page = ext.page || 1;

    const url = `https://mapi.ahtv.cn/api/v1/contents.php?count=${PAGE_SIZE}&offset=${(page - 1) * PAGE_SIZE}&column_id=${columnId}`;

    const headers = {
        'User-Agent': UA,
        'Accept': 'application/json, text/javascript, */*; q=0.01',
        'Referer': 'https://h5.ahtv.cn/'
    };

    let list = [];
    try {
        const { data } = await $fetch.get(url, { headers });
        const json = typeof data === 'string' ? JSON.parse(data) : data;
        const items = Array.isArray(json) ? json : [];

        list = items.map(item => {
            // 优先提取 streams 中的 .mp4 播放地址，兼容性更好
            let playUrl = '';
            if (item.streams && item.streams.length > 0) {
                const stream = item.streams[0];
                playUrl = `https://vod.ahtv.cn/${stream.target_path || ''}${stream.target_filename || ''}`;
            } else if (item.video && item.video.filename) {
                // 如果没有 streams，降级使用 m3u8 地址 (如“带着课本去旅行”等栏目)
                const video = item.video;
                playUrl = `${video.host || 'https://vod.ahtv.cn/'}${video.filepath || ''}${video.filename}`;
            }

            return {
                vod_id: String(item.id),
                vod_name: item.title || '',
                vod_pic: item.index_pic || '',
                vod_remarks: item.format_duration || item.duration_format || '',
                vod_content: item.brief || item.article_brief || '',
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

// 获取播放列表
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
        playUrl = 'https://vod.ahtv.cn' + playUrl;
    }

    return JSON.stringify({
        urls: [playUrl],
        headers: [
            { 'User-Agent': UA },
            { 'Referer': 'https://h5.ahtv.cn/' }
        ]
    });
}

// 搜索（先不做，返回空）
async function search(ext) {
    return JSON.stringify({ list: [] });
}
