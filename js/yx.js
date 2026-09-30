const cheerio = createCheerio();

let appConfig = {
    ver: 1,
    title: '一席直链测试',
    site: 'https://www.yixi.tv',
    tabs: [
        { name: '测试', ext: { id: 'test' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

async function getCards(ext) {
    return jsonify({
        list: [{
            vod_id: 'test_video',
            vod_name: '点击测试直链播放',
            vod_pic: 'https://aliimg.yixi.tv/almond/17901505598057_j.jpg',
            vod_remarks: '直链测试',
            ext: { id: 'test_video', type: 0 },
        }],
    });
}

async function getTracks(ext) {
    return jsonify({
        list: [{
            title: '默认分组',
            tracks: [{
                name: '播放',
                pan: '',
                ext: { url: 'https://alicdn.yixi.tv/1789621657336-3.mp4' },
            }],
        }],
    });
}

async function getPlayinfo(ext) {
    ext = argsify(ext);
    const url = ext.url;
    if (!url) return jsonify({ urls: [] });
    return jsonify({
        urls: [url],
        headers: {
            'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X) AppleWebKit/605.1.15',
            'Referer': 'https://www.yixi.tv/',
            'Origin': 'https://www.yixi.tv',
        }
    });
}

async function search(ext) { return jsonify({ list: [] }); }
