/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
*/

'use strict';

KylinApp.controller('CubeCtrl', function ($scope, $rootScope, AccessService, MessageService, CubeService, cubeConfig, TableService, ModelGraphService, UserService,SweetAlert,loadingRequest,modelsManager,$modal,cubesManager, $location) {
    $scope.newAccess = null;
    $scope.state = {jsonEdit: false};

    $scope.modelsManager = modelsManager;
    $scope.cubesManager = cubesManager;
    $scope.isShowCubeplanner = $rootScope.isShowCubeplanner;

    $scope.buildGraph = function (cube) {
       ModelGraphService.buildTree(cube);
    };

    $scope.getCubeSql = function (cube) {
        CubeService.getSql({cubeId: cube.name}, function (sql) {
            cube.sql = sql.sql;
        },function(e){
            if(e.data&& e.data.exception){
                var message =e.data.exception;
                var msg = !!(message) ? message : '获取action失败.';
                SweetAlert.swal('啊哦...', msg, 'error');
            }else{
                SweetAlert.swal('啊哦...', "获取action失败.", 'error');
            }
        });
    };

    $scope.getNotifyListString = function (cube) {
        if (cube.detail.notify_list) {
            cube.notifyListString = cube.detail.notify_list.join(",");
        }
        else {
            cube.notifyListString = "";
        }
    };

    $scope.cleanStatus = function(cube){

        if (!cube)
        {
            return;
        }
        var newCube = jQuery.extend(true, {}, cube);
        delete newCube.project;

        angular.forEach(newCube.dimensions, function(dimension, index){
            delete dimension.status;
        });

        return newCube;
    };

    $scope.updateNotifyList = function (cube) {
        if (cube.notifyListString.length === 0) {
            cube.detail.notify_list = [];
        } else {
            cube.detail.notify_list = cube.notifyListString.split(",");
        }
        CubeService.updateNotifyList({cubeId: cube.name}, cube.detail.notify_list, function () {
            SweetAlert.swal('成功!', '更新通知列表成功!', 'success');
        },function(e){
            if(e.data&& e.data.exception){
                var message =e.data.exception;
                var msg = !!(message) ? message : '获取action失败.';
                SweetAlert.swal('阿哦...', msg, 'error');
            }else{
                SweetAlert.swal('阿哦...', "获取action失败.", 'error');
            }
        });
    };

    $scope.getHbaseInfo = function (cube) {
        if (!cube.hbase) {
            CubeService.getHbaseInfo({cubeId: cube.name, propValue: null, action: null}, function (hbase) {
                cube.hbase = hbase;
                TableService.get({pro:cube.model.project, tableName:cube.model.fact_table},function(table) {
                  if (table && table.source_type == 1) {
                    cube.streaming = true;
                  }
                })

                // Calculate cube total size based on each htable.
                var totalSize = 0;
                hbase.forEach(function(t) {
                    totalSize += t.tableSize;
                });
                cube.totalSize = totalSize;
            },function(e){
                if(e.data&& e.data.exception){
                    var message =e.data.exception;
                    var msg = !!(message) ? message : '获取action失败.';
                    SweetAlert.swal('阿哦...', msg, 'error');
                }else{
                    SweetAlert.swal('阿哦...', "获取action失败.", 'error');
                }
            });
        }
    };

    // cube api to refresh current chart after get recommend data.
    $scope.currentChart = {};

    // click planner tab to get current cuboid chart
    $scope.getCubePlanner = function(cube) {
        $scope.enableRecommend = cube.segments.length > 0 && _.some(cube.segments, function(segment){ return segment.status === 'READY'; });
        if (!cube.currentCuboids) {
            CubeService.getCurrentCuboids({cubeId: cube.name}, function(data) {
                if (data && data.nodeInfos) {
                    $scope.createChart(data, 'current');
                    cube.currentCuboids = data;
                } else {
                    $scope.currentOptions = angular.copy(cubeConfig.chartOptions);
                    $scope.currentData = [];
                }
            }, function(e) {
                SweetAlert.swal('阿哦...', '获取当前cuboid失败.', 'error');
                console.error('current cuboid error', e.data);
            });
        } else {
            $scope.createChart(cube.currentCuboids, 'current');
        }
    };

    // get recommend cuboid chart
    $scope.getRecommendCuboids = function(cube) {
        if (!cube.recommendCuboids) {
            loadingRequest.show();
            CubeService.getRecommendCuboids({cubeId: cube.name}, function(data) {
                loadingRequest.hide();
                if (data && data.nodeInfos) {
                    // recommending
                    if (data.nodeInfos.length === 1 && !data.nodeInfos[0].cuboid_id) {
                         SweetAlert.swal('加载中', '请稍等，服务器正在为您推送', 'success');
                    } else {
                        $scope.createChart(data, 'recommend');
                        cube.recommendCuboids = data;
                        // update current chart mark delete node gray.
                        angular.forEach(cube.currentCuboids.nodeInfos, function(nodeInfo) {
                            var tempNode = _.find(data.nodeInfos, function(o) { return o.cuboid_id == nodeInfo.cuboid_id; });
                            if (!tempNode) {
                                nodeInfo.deleted = true;
                            }
                        });
                        $scope.createChart(cube.currentCuboids, 'current');
                        $scope.currentChart.api.refresh();
                    }
                } else {
                    $scope.currentOptions = angular.copy(cubeConfig.chartOptions);
                    $scope.recommendData = [];
                }
            }, function(e) {
                loadingRequest.hide();
                SweetAlert.swal('阿哦...', '推送cuboid失败.', 'error');
                console.error('recommend cuboid error', e.data);
            });
        } else {
            $scope.createChart(cube.recommendCuboids, 'recommend');
        }
    };

    // optimize cuboid
    $scope.optimizeCuboids = function(cube){
        SweetAlert.swal({
            title: '',
            text: '是否优化多维数据集?',
            type: '',
            showCancelButton: true,
            confirmButtonColor: '#DD6B55',
            confirmButtonText: "Yes",
            closeOnConfirm: true
        }, function(isConfirm) {
              if(isConfirm) {
                var cuboidsRecommendArr = [];
                angular.forEach(cube.recommendCuboids.nodeInfos, function(node) {
                    cuboidsRecommendArr.push(node.cuboid_id);
                });
                loadingRequest.show();
                CubeService.optimize({cubeId: cube.name}, {cuboidsRecommend: cuboidsRecommendArr},
                    function(job){
                        loadingRequest.hide();
                        SweetAlert.swal({
                            title: '成功!',
                            text: '已启动优化多维数据集任务',
                            type: 'success'},
                            function() {
                                $location.path("/jobs");
                            }
                        );
                    }, function(e) {
                        loadingRequest.hide();
                        if (e.status === 400) {
                            SweetAlert.swal('阿哦...', e.data.exception, 'error');
                        } else {
                            SweetAlert.swal('阿哦...', "多维数据集任务优化失败.", 'error');
                            console.error('optimize cube error', e.data);
                        }
                });
            }
        });
    };

    // transform chart data and customized options.
    $scope.createChart = function(data, type) {
        var chartData = data.treeNode;
        if ('current' === type) {
            $scope.currentData = [chartData];
            $scope.currentOptions = angular.copy(cubeConfig.baseChartOptions);
            $scope.currentOptions.caption = angular.copy(cubeConfig.currentCaption);
            if ($scope.cube.recommendCuboids){
                $scope.currentOptions.caption.css['text-align'] = 'right';
                $scope.currentOptions.caption.css['right'] = '-12px';
            }
            $scope.currentOptions.chart.color = function(d) {
                var cuboid = _.find(data.nodeInfos, function(o) { return o.name == d; });
                if (cuboid.deleted) {
                    return d3.scale.category20c().range()[17];
                } else {
                    return getColorByQuery(0, 1/data.nodeInfos.length, cuboid.query_rate);
                }
            };
            $scope.currentOptions.chart.sunburst = getSunburstDispatch();
            $scope.currentOptions.title.text = '当前多维数据集分布';
            $scope.currentOptions.subtitle.text = '[多维数据集数量: ' + data.nodeInfos.length + '] [行数: ' + data.totalRowCount + ']';
        } else if ('recommend' === type) {
            $scope.recommendData = [chartData];
            $scope.recommendOptions = angular.copy(cubeConfig.baseChartOptions);
            $scope.recommendOptions.caption = angular.copy(cubeConfig.recommendCaption);
            $scope.recommendOptions.chart.color = function(d) {
                var cuboid = _.find(data.nodeInfos, function(o) { return o.name == d; });
                if (cuboid.row_count < 0) {
                    return d3.scale.category20c().range()[5];
                } else {
                    var colorIndex = 0;
                    if (!cuboid.existed) {
                        colorIndex = 8;
                    }
                    return getColorByQuery(colorIndex, 1/data.nodeInfos.length, cuboid.query_rate);
                }
            };
            $scope.recommendOptions.chart.sunburst = getSunburstDispatch();
            $scope.recommendOptions.title.text = '多维数据集分布推送';
            $scope.recommendOptions.subtitle.text = '[多维数据集数量: ' + data.nodeInfos.length + '] [Row Count: ' + data.totalRowCount + ']';
        }
    };

    // Hover behavior for highlight dimensions
    function getSunburstDispatch() {
        return {
            dispatch: {
                elementMouseover: function(t, u) {
                    $scope.selectCuboid = t.data.name;
                    $scope.$apply();
                },
                renderEnd: function(t, u) {
                    var chartElements = document.getElementsByClassName('nv-sunburst');
                    angular.element(chartElements).on('mouseleave', function() {
                        $scope.selectCuboid = '0';
                        $scope.$apply();
                    });
                }
            }
        };
    };

    // Different color for chart element by query count
    function getColorByQuery(colorIndex, baseRate, queryRate) {
        if (queryRate > (3 * baseRate)) {
            return d3.scale.category20c().range()[colorIndex];
        } else if (queryRate > (2 * baseRate)) {
            return d3.scale.category20c().range()[colorIndex+1];
        } else if (queryRate > baseRate) {
            return d3.scale.category20c().range()[colorIndex+2];
        } else {
            return d3.scale.category20c().range()[colorIndex+3];
        }
    }
});

