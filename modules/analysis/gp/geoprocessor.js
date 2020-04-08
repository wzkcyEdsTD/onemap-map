﻿/*
*geoprocessor实现类
*/
define("analysis/geoprocessor", [
    "leaflet",
    "leaflet/esri",
    "core/dcins",
    "data/ajax"], function (L) {
    L.DCI.Geoprocessor = L.Class.extend({
        options: {},
        url: null,
        ajax: null,
        updateTimers: null,
        updateDelay: 1000,
        processSpatialReference: null,
        outputSpatialReference: null,
        outSpatialReference: null,

        onJobComplete: null,
        onStatusUpdate: null,
        onJobError: null,
        /* 
        * 方法：初始化
        * 参数:
        */
        initialize: function (url) {
            this.url = url;
            this.ajax = new L.DCI.Ajax();
            this.updateTimers = [];
            $.proxy(this, this.getJobStatus);
        },
        setUpdateDelay: function (delay) {
            this.updateDelay = delay;
        },
        setProcessSpatialReference: function (sr) {
            this.processSpatialReference = sr;
        },
        setOutputSpatialReference: function (sr) {
            this.setOutSR(sr);
        },
        setOutSpatialReference: function (sr) {
            this.setOutSR(sr);
        },
        setOutSR: function (sr) {
            this.outSpatialReference = this.outputSpatialReference = sr;
        },
        getOutSR: function () {
            return this.outSpatialReference || this.outputSpatialReference;
        },
        gpEncode: function (parameters) {
            var i;
            for (i in parameters) {
                var param = parameters[i];
                if ($.isArray(param)) { //判断是否为数组
                    parameters[i] = JSON.stringify(param.map(
                        function (item) {
                            return this.gpEncode({
                                item: item
                            },
                                true).item;
                        },
                        this));
                } else {
                    if (param instanceof Date) { //判断是否日期类型
                        parameters[i] = param.getTime();
                    }
                }
            }
            return this.encode(parameters);
        },
        encode: function (parameters) {
            var param,
                type,
                obj = {},
                i,
                p,
                pl;
            for (i in parameters) {
                if (i === "declaredClass") {
                    continue;
                }
                param = parameters[i];
                type = typeof param;
                if (param !== null && param !== undefined && type !== "function") {
                    if ($.isArray(param)) {
                        obj[i] = [];
                        pl = param.length;
                        for (p = 0; p < pl; p++) {
                            obj[i][p] = this.encode(param[p]);
                        }
                    } else {
                        if (type === "object") {
                            if (param.toJson) { //判断是否有转换Json方法
                                var json = param.toJson();
                                obj[i] = JSON.stringify(json);
                            }
                        } else {
                            obj[i] = param;
                        }
                    }
                }
            }
            return obj;
        },
        decode: function (obj) {
            var objType = obj.dataType;
            var typeArray = ["GPBoolean", "GPDouble", "GPLong", "GPString"];
            var date = null;
            if (typeArray.indexOf(objType) !== -1) {
                return obj;
            }
            if (objType === "GPLinearUnit") {
                obj.value = new L.DCI.LinearUnit(obj.value);
            } else {
                if (objType === "GPFeatureRecordSetLayer" || objType === "GPRecordSet") {
                    obj.value = new L.DCI.FeatureSet(obj.value);
                } else {
                    if (objType === "GPDataFile") {
                        obj.value = new L.DCI.DataFile(obj.value);
                    }
                }
            }
            return obj;
        },

        //同步请求
        jobUpdateHandler: function (jobInfo) {
            if (this.options.async == true) {
                if (jobInfo.error) {
                    L.dci.app.util.dialog.alert("温馨提示", " Message: " + jobInfo.error.message);
                } else {
                    this._jobUpdateHandler(jobInfo);
                }
                
            } else {
                this.onJobComplete(jobInfo, this.onJobComplete.gp, this.onJobComplete.outParameters, this.onJobComplete.resultDataHandler, this.onJobComplete.resultImageLayerHandler);
            }
        },

        _jobUpdateHandler: function (jobInfo) {
            var jobId = jobInfo.jobId;
            this.onStatusUpdate(jobInfo);
            clearTimeout(this.updateTimers[jobId]);
            this.updateTimers[jobId] = null;
            switch (jobInfo.jobStatus.toUpperCase()) {
                case "ESRIJOBSUBMITTED":
                case "ESRIJOBEXECUTING":
                case "ESRIJOBWAITING":
                case "ESRIJOBNEW":
                    var jStatus = this.getJobStatus;
                    var ts = this;
                    this.updateTimers[jobId] = setTimeout(function () {
                        jStatus.call(ts, jobId);
                    }, this.updateDelay, this);
                    break;
                default:
                    this.onJobComplete(jobInfo, this.onJobComplete.gp, this.onJobComplete.outParameters, this.onJobComplete.resultDataHandler, this.onJobComplete.resultImageLayerHandler);
            }
        },
        getJobStatus: function (jobId) {
            this.ajax.post(
                this.url + "/jobs/" + jobId,
                {
                    f: "json"
                },
                true,
                this,
                this.jobUpdateHandler,
                this.onJobError
            );
        },
        getResultData: function (jobId, name, callback, error) {
            this.ajax.post(
                this.url + "/jobs/" + jobId + "/results/" + name,
                {
                    f: "json",
                    returnType: "data"
                },
                true,
                this,
                function (r, i) {
                    r = this.decode(r);
                    callback(r);
                },
                function (r) {
                    error();
                }
            );
        },
        //GPRecordSet格式的结果
        getResultData2: function (jobId, name, callback, error) {
            this.ajax.post(
                this.url + "/jobs/" + jobId + "/results/" + name,
                {
                    f: "json",
                    returnType: "data"
                },
                true,
                this,
                function (r, i) {
                    callback(r);
                },
                function (r) {
                    error();
                }
            );
        },

        //同步请求，GP请求完成后不用获取结果
        _getResultData: function (jobInfo, callback) {
            callback(jobInfo);
        },

        getResultImage: function () { },
        getResultImageLayer: function (jobId, name, params, callback, error) {
            var url = this.url + "/jobs/" + jobId + "/results/" + name;
            var imageLayer = new L.DCI.GPResultImageLayer(url, {
                imageParameters: params
            }, true);
            if (callback)
                callback(imageLayer);
            return imageLayer;
        },
        //callback ???
        _getResultImageLayer: function (jobId, name, params, callback, error) {
            callback(jobId);
        },

        submitJob: function (parameters, onStatusUpdate, onJobComplete, onJobError) {
            if (!this.options.path) {
                if (Project_ParamConfig.defaultAjaxProxy)
                    this._service = L.esri.Services.service(Project_ParamConfig.defaultAjaxProxy + "?" + this.url);
                else
                    this._service = L.esri.Services.service(this.url);
                this._service.metadata(function (error, results) {
                    if (!error) {
                        if (results.executionType === 'esriExecutionTypeSynchronous') {
                            this.options.async = false;
                            this.options.path = 'execute';
                        } else {
                            this.options.async = true;
                            this.options.path = 'submitJob';
                        }
                    } else {
                        this.options.async = false;
                        this.options.path = 'execute';
                        return;
                    }
                    this._submitJob(parameters, onStatusUpdate, onJobComplete, onJobError);
                }, this);
            } else {
                this._submitJob(parameters, onStatusUpdate, onJobComplete, onJobError);
            }

            //this._submitJob(parameters, onStatusUpdate, onJobComplete, onJobError)
        },
        _submitJob: function (parameters, onStatusUpdate, onJobComplete, onJobError) {
            this.onStatusUpdate = onStatusUpdate;
            this.onJobComplete = onJobComplete;
            this.onJobError = onJobError;
            var p = this.gpEncode(parameters);
            p.f = "json";
            this.ajax.post(
                this.url + "/" + this.options.path,
                p,
                true,
                this,
                this.jobUpdateHandler,
                this.onJobError
            );
        },
    });

    L.DCI.LinearUnit = L.Class.extend({
        declaredClass: "esri.tasks.LinearUnit",
        initialize: function (json) {
            $.extend(this, json);
        },
        distance: 0,
        units: null,
        toJson: function () {
            var json = {};
            if (this.distance) {
                json.distance = this.distance;
            }
            if (this.units) {
                json.units = this.units;
            }
            return json;
        }
    });
    L.DCI.DataFile = L.Class.extend({
        declaredClass: "esri.tasks.DataFile",
        initialize: function (json) {
            if (json) {
                $.extend(this, json);
            }
        },
        url: null,
        itemID: null,
        toJson: function () {
            var json = {};
            if (this.url) {
                json.url = this.url;
            }
            if (this.itemID) {
                json.itemID = this.itemID;
            }
            return json;
        }
    });
    L.DCI.GPResultImageLayer = L.esri.Layers.DynamicMapLayer.extend({
        initialize: function (url, params) {
            //$.extend(this, L.esri.dynamicMapLayer);
            this.layerType = 4;
            this.url = url;
            this._service = { options: { token: null } };
        },
        _requestExport: function () {
            var map = L.dci.app.pool.get("map");
            //var code = map.map.options["crsNum"];
            var crs = map.options["crs"];
            var code = crs.code.split(":")[1];
            var size = map.map.getSize();
            var bounds = map.map.getBounds();
            var ne = this._map.options.crs.project(bounds._northEast);
            var sw = this._map.options.crs.project(bounds._southWest);
            var paramas = {
                f: "image",
                bbox: [sw.x, sw.y, ne.x, ne.y].join(','),
                bboxSR: code,
                imageSR: code,
                dpi: 96,
                format: "png24",
                transparent: true,
                size: size.x + "," + size.y
            };
            this._renderImage(this.url + L.Util.getParamString(paramas), map.map.getBounds());
        }
    });
    L.DCI.FeatureSet = L.Class.extend({
        declaredClass: "esri.tasks.FeatureSet",
        features: null,
        displayFieldName: null,
        geometryType: null,
        spatialReference: null,
        fieldAliases: null,
        initialize: function (json) {
            var map = L.dci.app.pool.get("map");
            //var code = map.map.options["crsNum"];
            var crs = map.options["crs"];
            var code = crs.code.split(":")[1];
            if (json) {
                this.geometryType = json.geometryType;
                if (json.fields) {
                    this.fields = json.fields;
                }
                var fun = this.convertHandler();
                var me = this;
                this.features = [];
                $.each(json.features, function (i, feature) {
                    me.features.push(fun(feature));
                });
            } else {
                this.features = [];
            }
            this.spatialReference = { wkid: parseInt(code), latestWkid: parseInt(code) };
        },
        convertHandler: function (type) {
            switch (this.geometryType) {
                case "esriGeometryPoint":
                    return function (feature) {
                        var map = L.dci.app.pool.get("map");
                        var latLng = map.options.crs.projection.unproject(L.point(feature.geometry["x"], feature.geometry["y"]));
                        var mark = L.marker(latLng);
                        if (feature.attributes) {
                            mark.attributes = feature.attributes;
                        }
                        return mark;
                    }
                    break;
                case "esriGeometryPolyline":
                    return function (feature) {
                        var map = L.dci.app.pool.get("map");
                        var paths = feature.geometry.paths;
                        var latLngs = [];
                        $.each(paths, function (i, path) {
                            $.each(path, function (j, point) {
                                var latLng = map.options.crs.projection.unproject(L.point(point[0], point[1]));
                                latLngs.push(latLng);
                            });
                        });
                        var polyLine = L.polyline(latLngs, { color: "red" });
                        if (feature.attributes) {
                            polyLine.attributes = feature.attributes;
                        }
                        return polyLine;
                    }
                    break;
                case "esriGeometryPolygon":
                    return function (feature) {
                        var map = L.dci.app.pool.get("map");
                        var rings = feature.geometry.rings;
                        var latLngs = [];
                        $.each(rings, function (i, ring) {
                            $.each(ring, function (j, point) {
                                var latLng = map.options.crs.projection.unproject(L.point(point[0], point[1]));
                                latLngs.push(latLng);
                            });
                        });
                        var polygon = L.polygon(latLngs);
                        if (feature.attributes) {
                            polygon.attributes = feature.attributes;
                        }
                        return polygon;
                    }
                    break;
                case "esriGeometryEnvelope":
                    break;
                default:
            }
        },
        toJson: function () {
            var json = {};
            if (this.displayFieldName) {
                json.displayFieldName = this.displayFieldName;
            }
            if (this.spatialReference) {
                json.spatialReference = this.spatialReference;
            }
            if (this.features[0]) {
                json.geometryType = this.getJsonType();
                json.features = this.encodeGraphics();

            }
            return json;
        },
        getJsonType: function () {
            if (this.features.length > 0) {
                if (this.features[0] instanceof L.LatLng) {
                    return "esriGeometryPoint";
                }
                var geometryObj = this.features[0].toGeoJSON();
                var type = geometryObj.geometry.type.toLowerCase();
                if (type == "point") {
                    return "esriGeometryPoint";
                } else {
                    if (type == "linestring") {
                        return "esriGeometryPolyline";
                    } else {
                        if (type == "polygon") {
                            return "esriGeometryPolygon";
                        } else if (type == "Rectangle") {
                            return "esriGeometryEnvelope";
                        }
                    }
                }
            }
            return "undefined";
        },
        encodeGraphics: function () {
            var geometry = [],
                enc;
            for (var i = 0; i < this.features.length; i++) {
                var geometryObj = this.features[i].toGeoJSON();
                enc = {};
                enc.geometry = this.geometryToJson(geometryObj.geometry);
                geometry[i] = enc;
            }
            return geometry;
        },
        geometryToJson: function (geometry) {
            var map = L.dci.app.pool.get("map");
            var type = geometry.type.toLowerCase();
            var json = {};
            if (type == "point") {
                //point = L.point(geometry.coordinates[0], geometry.coordinates[1]);
                json.x = map.options.crs.projection.project(L.latLng(geometry.coordinates[0], geometry.coordinates[1])).x;//平面坐标
                json.y = map.options.crs.projection.project(L.latLng(geometry.coordinates[0], geometry.coordinates[1])).y;
                //json.x = 421383;
                //json.y = 2530468;
            } else {
                if (type == "linestring") {
                    json.paths = [convertLatLng(geometry.coordinates[0])];
                } else {
                    if (type == "polygon") {
                        if (this.features[0]._parts) {
                            json.rings = [convertLatLng(geometry.coordinates[0])];
                        } else {
                            json.rings = [convertLatLng_2(geometry.coordinates[0])];
                        }
                    } else if (type == "Rectangle") {
                        return "esriGeometryEnvelope";
                    }
                }
            }
            //var code = map.map.options["crsNum"];
            var crs = map.options["crs"];
            var code = crs.code.split(":")[1];
            json.spatialReference = { wkid: parseInt(code), latest: parseInt(code) };
            return json;

            function convertLatLng(coordinates) {
                for (var i = 0; i < coordinates.length; i++) {
                    var lng = coordinates[i][0];
                    var lat = coordinates[i][1];
                    var point = map.options.crs.projection.project(L.latLng(lat, lng));
                    coordinates[i] = [point.x, point.y];                    
                    //coordinates[i] = [coordinates[i][1], coordinates[i][0]];
                }
                return coordinates;
            }
            function convertLatLng_2(coordinates) {
                for (var i = 0; i < coordinates.length; i++) {
                    var lng = coordinates[i][0];
                    var lat = coordinates[i][1];
                    coordinates[i] = [lat, lng];
                    //coordinates[i] = [coordinates[i][1], coordinates[i][0]];
                }
                return coordinates;
            }
        }
    });

    return L.DCI.geoprocessor;
});