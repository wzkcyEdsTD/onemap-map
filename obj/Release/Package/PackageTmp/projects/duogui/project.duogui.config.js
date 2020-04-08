﻿var Project_Paths = {
    "Shapefile": '../library/leaflet/arcgis/shapeFile/leaflet.shpfile',
    "shp": '../library/leaflet/arcgis/shapeFile/shp',
    "controls/spotanalysis": '../controls/controls.spotAnalysis',
    "common/fileload": '../modules/common/common.fileload',
    "analysis/conflict": '../modules/analysis/analysis.conflict'
}

var Project_Shim = {
    "analysis/conflict": { deps: ['css!../../themes/' + Base_ParamConfig.defaultTheme + '/css/analysis.conflict.css'] },
}
/*项目配置*/
var Project_ParamConfig = {
    title: '规划一张图',
    left: {
        visible: true,
        width: 0
    },
    right: {
        visible: true,
        width: 0
    },
    top: {
        visible: true,
        height: 0
    },
    bottom: {
        visible: true,
        height: 0
    },
    center: {
        visible: true
    },
    /*cadserver路径*/
    cadserver: 'http://arcserver/SDCADServer',
    /*默认服务层地址CoreServices*/
    defaultCoreServiceUrl: "http://172.26.40.254/DCIServices",
    /*图片地址*/
    defaultUserImages: "http://172.26.40.254/DCIClient",
    /*转发地址*/
    defaultProxy: "http://172.26.40.254/ServicesAdapter",
    /*是否转发*/
    isProxy: 'false',
    /*规管系统地址*/
    oaSystemUrl:"http://192.168.200.143/DCIWeb4",
    /*控件显示设置*/
    controls: {
        defaultExtentControl: true,
        navigationControl: true,
        scalebarControl: true,
        miniMapControl: true,
        layerSwitchControl: true,
        loadingControl: true,
        panControl: true,
        contextmenu: true,
        fullscreenControl: true,
        layerTabControl: true
    },
    /*投影坐标系*/
    crs: {
        /*代号*/
        code: 'EPSG:2343',
        /*引用*/
        defs: '+proj=tmerc +lat_0=0 +lon_0=105 +k=1 +x_0=500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs'
    },
    ///*投影坐标系*/
    //crs: {
    //    /*代号*/
    //    code: 'EPSG:2384',
    //    /*引用*/
    //    defs: '+proj=tmerc +lat_0=0 +lon_0=117 +k=1 +x_0=500000 +y_0=0 +a=6378140 +b=6356755.288157528 +units=m +no_defs'
    //},
     
    /*底图设置*/
    baseLayer: {
        type: 'tile',//vector-矢量图 tile-切图
        name: '地图',
        img: 'images/controls/grouplayer/map.png',
        url: 'http://arcserver/ArcGIS/rest/services/GAXQ/DT/MapServer',
        origin: [-5123200,10002100],
        fullextent: [588618.226310014,2895350.04527,669954.657989986,2948244.58213],
        tileSize: 512,
        minZoom: 0,
        maxZoom: 11,
        zoom: 0,
        resolutions: [
	    132.291931250529,
            66.1459656252646,
            33.0729828126323,
            16.9333672000677,
            8.46668360003387,
            4.23334180001693,
            2.11667090000847,
            1.05833545000423,
            0.529167725002117,
            0.264583862501058,
            0.132291931250529,
            0.0661459656252646
        ]
    },
    //baseLayer: {
    //    type: 'vector',//vector-矢量图 tile-切图
    //    name: '地图',
    //    img: 'images/controls/grouplayer/map.png',
    //    url: 'http://arcserver/ArcGIS/rest/services/XT/BJT/MapServer',
    //    fullextent: [513406.55402,3075646.305225,553236.98378,3098316.875675]
    //},
    /*底图切换*/
    changeLayers: [
        { id: 'baseLayer-dx', name: '地形图', tiled: false, img: 'images/controls/grouplayer/dixingtu.png', url: 'http://192.168.200.113/ArcGIS/rest/services/JY/DXINDEX/MapServer' },
        { id: 'baseLayer-yx', name: '影像图', tiled: true, img: 'images/controls/grouplayer/yingxiangtu.png', url: 'http://192.168.200.113/ArcGIS/rest/services/JY/YXT/MapServer' }
    ],
    /*专题图*/
    themLayers: [
        { id: 'kgyzt', name: '控规一张图', url: 'http://192.168.200.113/ArcGIS/rest/services/JY/KGYZT/MapServer/' },
        { id: 'phgl', name: '批后管理', url: 'http://192.168.200.113/ArcGIS/rest/services/JY/PHGL/MapServer/' },
        { id: 'sxjd', name: '时限监督', url: 'http://192.168.200.113/ArcGIS/rest/services/JY/SPSX/MapServer/' },
        { id: 'ghbj', name: '规划边界', url: 'http://192.168.200.113/ArcGIS/rest/services/JY/GHFW/MapServer/' },
        { id: 'xmyzt', name: '项目一张图', url: 'http://192.168.200.113/ArcGIS/rest/services/JY/XMYZT/MapServer/' }
    ],
    /*浏览版专题图*/
    bmapLayers: [
        { name: '控规一张图', url: 'http://192.168.200.113/ArcGIS/rest/services/JY/KGYZT2/MapServer', layerIndex: '4' },
        { name: '用地红线', url: 'http://192.168.200.113/ArcGIS/rest/services/JY/YDHX/MapServer', layerIndex: '' }
    ],

    /*查询所需图层序号*/
    layernum: {
        kg: 'visible:10',              //控规图层
        fg: 'visible:12',              //分规图层
        zg: 'visible:14',              //总规图层
        xm: 'visible:2'               //项目一张图
    }
};