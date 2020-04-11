/**
*市政设施统计分析模块类
*@module modules.analysis
*@class DCI.ProvisionalLabel
*@constructor initialize
*@extends Class
*/

var ResultsBuffers = []

define("analysis/provisionalLabel", [
    "leaflet",
    'rqtext!../../components/provisionalLabel.html',
    "core/dcins",
    "plugins/scrollbar",
    "analysis/gpHandler"


], function (L, plTemplate) {
    L.DCI.ProvisionalLabel = L.Class.extend({

        /**
        *类ID
        *@property id
        *@type {String}
        */
        id: 'ProvisionalLabel',
        _drawList : [],
        _mousedown: null,
        _mouseup: null,
        _drawType: null,
        _tolance: 1,
        /**
        *查询结果集
        *@property _results
        *@type {Arrat}
        *@private
        */
        _results: [],
        _forceLabelId : null,
        /**
        *初始化
        *@method initialize
        */
        initialize: function () {
            this.getServiceList();
        },
        /**
        *获取服务列表
        *@method getServiceList
        **/
        getServiceList: function () {
            L.dci.app.services.baseService.getFeatures({
                context: this,
                userId: L.dci.app.util.user.getCurUser().id,
                success: function (res) {
                    if (res == null || res.length == 0) {
                        L.dci.app.util.dialog.alert("提示", "没有专题访问权限");
                        return;
                    }
                    L.DCI.App.pool.get('LeftContentPanel').show(this, this.buildPanel(this));
                },
                error: function () {
                    L.dci.app.util.dialog.alert("温馨提示", "图层列表信息获取失败，请检查该服务。");
                }
            });
        },
        /**
        *构建面板
        *@method buildPanel
        **/
        buildPanel: function (obj) {
            var _this = obj;
            $(".leftcontentpanel-title>span:first").html("地图临时标注");         //标题
            this.dom = $(".leftcontentpanel-body");
            this.dom.html('');
            this.dom.append(plTemplate);
            //  getLabelList
            _this.fetchLabelList();
            //  labelEvent
            $("body").on('click', '.singleLabel', function (e) {    //  点击单个标注
                const id = $(this).attr("data-id");
                const row = _this._results.filter(item => item[0] == id);
                if (row.length) {
                    _this._forceLabelId = id;
                    $(".labelImg img").remove();
                    row[0][3] && $(".labelImg").append(`<img src='${Project_ParamConfig.devNodeHost}/upload/${row[0][3]}' width=400px>`); 
                    $("#plForm").show();
                    $("#plForm .labelText").val(row[0][2]);
                    $("#plForm .labelDate").val(new Date(row[0][6]).toLocaleString());
                    $("#plForm .form-date").show();
                    $("#plForm .form-maplabel").hide();
                    //  panto
                    const map = L.DCI.App.pool.get('MultiMap').getActiveMap();
                    const geometry = JSON.parse(row[0][4]);
                    const type = row[0][7];
                    const _geometry = type == "dxfw" || type == "xxfw" ? geometry[geometry.length-1] : {
                        lat: (geometry[0].lat + geometry[geometry.length-1].lat) / 2,
                        lng: (geometry[0].lng + geometry[geometry.length-1].lng) / 2,
                    }
                    map.map.panTo(_geometry);
                    L.popup({ maxWidth: 80, className: 'popupLittleUp' })
                        .setLatLng(_geometry)
                        .setContent(row[0][2])
                        .openOn(map.map);
                    // map.map.setZoom(geometry.drawType == 'dxfw' ? 12 : 10);
                }
            })
            $("body").on('click', '.doDelete', function (e) {
                e.stopPropagation();
                const id = $(this).attr("data-id");
                $.ajax({
                    url: `${Project_ParamConfig.devNodeHost}/deletePl`,
                    type: 'post',
                    data: { id , userid: L.dci.app.util.user.getCurUser().id },
                    success: ({ data }) => {
                        L.dci.app.util.dialog.alert("温馨提示", "删除标注成功");
                        _this.fetchLabelList();
                    }
                })
            })
            $("#inputfile").on('change', function (e) { //  图片选择
                $(".labelImg img").remove();
                $(".labelImg").append("<img src='" + URL.createObjectURL($(e.target)[0].files[0]) + "' width=400px>");  
            })
            $("body").on('click', '.addLabel', () => {
                _this._forceLabelId = null;
                $(".labelImg img").remove();
                $("#plForm").show();
                $("#plForm .labelText").val('');
                $("#plForm .form-date").hide();
                $("#plForm .form-maplabel").show();
            })
            $("body").on('click', '.uploadLabel', () => {
                if (!_this._drawType && !_this._forceLabelId) return L.dci.app.util.dialog.alert("温馨提示", "请在地图上添加标注");
                const formData = new FormData();
                formData.append('plImg', $("#plForm #inputfile")[0].files[0]);
                formData.append('info', $("#plForm .labelText").val() || '');
                formData.append('userid', L.dci.app.util.user.getCurUser().id);
                formData.append('type', _this._drawType);
                formData.append('geometry', JSON.stringify(this._drawList));
                _this._forceLabelId && formData.append('id', _this._forceLabelId);
                $.ajax({
                    url: `${Project_ParamConfig.devNodeHost}/updatePl`,
                    type: 'post',
                    data: formData,
                    cache: false,
                    processData: false,
                    contentType: false,
                    success: function (data) {
                        if (data.status == 200) {
                            L.dci.app.util.dialog.alert("温馨提示", "标注保存成功");
                            _this.fetchLabelList();
                        } else {
                            L.dci.app.util.dialog.alert("温馨提示", data.data);
                        }
                        $("#menu_Translation").click();
                    }
                })
            })
            /*鼠标点击下去的时候，决定是否选中*/
            $("input[name='drawType']").bind("mousedown", function (event) {
                var radioChecked = $(this).prop("checked");
                $(this).prop('checked', !radioChecked);
                var drawType = $("input[name='drawType']:checked").val();
                _this._drawType = drawType;
                var map = L.DCI.App.pool.get('MultiMap').getActiveMap();
                if (!radioChecked) {//选中
                    $(".option-content").hide();
                    $("#" + this.id + "-content").show();
                }
                else {
                    $(".option-content").hide();
                    map.deactivate();
                }
                return false;
            });

            /*阻止click事件默认行为*/
            $("input[name='drawType']").click(function (event) {
                return false;
            });

            $("#drawGeo").click(function () {
                _this._drawType = $("input[name='drawType']:checked").val() || null;
                _this._drawList = [];
                var map = L.DCI.App.pool.get('MultiMap').getActiveMap();
                var hlLayer = map.getLabelLayer();
                hlLayer.clearLayers();
                if (_this._drawType) {
                    const type = {
                        dxfw: L.DCI.Map.StatusType.POINT_SELECT,
                        kxfw: L.DCI.Map.StatusType.RECT_SELECT,
                        xxfw: L.DCI.Map.StatusType.POLYLINE_SELECT
                    }
                    map.activate(type[_this._drawType], _this._callback, _this.precall, _this);
                }
                else {
                    L.dci.app.util.dialog.alert("温馨提示", "请选择绘制范围类型");
                    return false;
                }
            });

            //滚动条
            $(".alPanel").mCustomScrollbar({
                theme: "minimal-dark"
            });

        },
        /**
         * 获取标注列表
         * @param {any} fn 回调函数
         */
        fetchLabelList: function (fn) {
            $.ajax({
                url: `${Project_ParamConfig.devNodeHost}/fetchPl`,
                type: 'post',
                data: { userid: L.dci.app.util.user.getCurUser().id},
                success: ({ data }) => {
                    this._results = data.rows;
                    this.drawDomMap && this.drawDomMap(data.rows);
                }
            })
        },
        drawDomMap: function (data) {
            //  dom
            const _dom_ = $(".labelList");
            _dom_.empty();
            _dom_.html(data.map(([id, userid, info, img, geometry, prod, time,type]) => {
                return `<div class="singleLabel" data-id="${id}">
                    <span>备注: ${info}</span>
                    <span class="icon-close1 doDelete" data-id="${id}"></span>
                    <span>${new Date(time).toLocaleString()}</span>
                </div>`
            }).join(''));
            //  map
            var map = L.DCI.App.pool.get('MultiMap').getActiveMap();
            var hlLayer = map.getLabelLayer();
            hlLayer.clearLayers();
            data.filter(item => item[7]).map(item => {
                const geometry = JSON.parse(item[4]);
                const type = item[7];
                // map draw
                if (type == "dxfw") {   //如果为点选
                    new L.marker(geometry[0]).addTo(hlLayer);
                } else if (type == 'kxfw') {   //如果为框选
                    var bounds = L.latLngBounds(geometry[0], geometry[1]);
                   new L.Rectangle(bounds).addTo(hlLayer);;
                } else if (type == 'xxfw') {
                    new L.polyline(geometry, { color: 'red' }).addTo(hlLayer);;
                }
            })
        },
        _callback: function (evt) {
            if (this._drawType == 'dxfw' || this._drawType == 'kxfw') {
                if (evt.type == "mousedown") {
                    this._drawList.push(evt.latlng);
                } else if (evt.type == "mouseup") {
                    this._drawList.push(evt.latlng);
                    var map = L.DCI.App.pool.get('MultiMap').getActiveMap();
                    var _this = this;
                    if (_this._drawType == "dxfw") {
                        var hlLayer = map.getLabelLayer();
                        hlLayer.clearLayers();
                        L.marker(this._drawList[0]).addTo(hlLayer);
                    }
                    else {
                        var bounds = L.latLngBounds(this._drawList[0], this._drawList[1]);
                        var lay = new L.Rectangle(bounds);
                        var hlLayer = map.getLabelLayer();
                        hlLayer.clearLayers();
                        hlLayer.addLayer(lay);
                    }
                    map.deactivate();
                }
            } else if (this._drawType == 'xxfw') {
                if (evt.type == "mouseup") {
                    this._drawList.push(evt.latlng);
                    const length = this._drawList.length;
                    if (length > 1 && evt.latlng.lat == this._drawList[length - 2].lat && evt.latlng.lng == this._drawList[length - 2].lng) {
                        const line = new L.polyline(this._drawList, { color: 'red' });
                        var map = L.DCI.App.pool.get('MultiMap').getActiveMap();
                        var hlLayer = map.getLabelLayer();
                        hlLayer.clearLayers();
                        hlLayer.addLayer(line);
                        map.deactivate();
                    }
                }
            }
        },
        /**
        *关闭
        *@method leftClose
        */
        leftClose: function () {
            this._alReset();
            L.dci.app.pool.remove('ProvisionalLabel');
        },
        _alReset: function () {
            //选址前清空上一次选址结果
            this._results = [];
            this._tolance = null;
            this._drawType = null;
            $("#plresult").empty();
            var map = L.DCI.App.pool.get('MultiMap').getActiveMap();
            $(".option-content").hide();
            var hlLayer = map.getLabelLayer();
            hlLayer.clearLayers();
        }
    });
    return L.DCI.ProvisionalLabel;
});