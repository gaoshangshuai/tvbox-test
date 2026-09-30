const cheerio = createCheerio();

let appConfig = {
    ver: 1,
    title: '一席测试',
    site: 'https://www.yixi.tv',
    tabs: [
        { name: '测试', ext: { id: 'test' } },
    ],
};

async function getConfig() {
    return jsonify(appConfig);
}

async function getCards(ext) {
    // 硬编码，不请求网络
    let cards = [
        {
            vod_id: 'test1',
            vod_name: '测试卡片1：如果你看到这张卡片，说明XPTV能正常调用getCards',
            vod_pic: 'https://aliimg.yixi.tv/almond/17901505598057_j.jpg',
            vod_remarks: '硬编码数据',
            ext: { id: 'test1', type: 0 },
        },
        {
            vod_id: 'test2',
            vod_name: '测试卡片2：如果这张也能看到，说明代码加载没问题',
            vod_pic: 'https://aliimg.yixi.tv/almond/17896242683935_j.jpg',
            vod_remarks: '硬编码数据',
            ext: { id: 'test2', type: 0 },
        },
    ];
    return jsonify({ list: cards });
}

async function getTracks(ext) { return jsonify({ list: [] }); }
async function getPlayinfo(ext) { return jsonify({ urls: [] }); }
async function search(ext) { return jsonify({ list: [] }); }
