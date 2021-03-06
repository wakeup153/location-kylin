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

KylinApp.controller('CubesCtrl', function ($scope, $q, $routeParams, $location, $modal, MessageService, CubeDescService, CubeService, JobService, UserService, ProjectService, SweetAlert, loadingRequest, $log, cubeConfig, ProjectModel, ModelService, MetaModel, CubeList,modelsManager,TableService, kylinConfig) {

    $scope.cubeConfig = cubeConfig;
    $scope.cubeList = CubeList;

    $scope.modelsManager = modelsManager;
    $scope.listParams = {
      cubeName: $routeParams.cubeName,
      projectName: $routeParams.projectName
    };
    if ($routeParams.projectName) {
      $scope.projectModel.setSelectedProject($routeParams.projectName);
    }
    CubeList.removeAll();
    $scope.loading = false;
    $scope.action = {};

    $scope.state = {
      filterAttr: 'create_time_utc', filterReverse: true, reverseColumn: 'create_time_utc',
      dimensionFilter: '', measureFilter: ''
    };

    $scope.refreshCube = function(cube){
      var queryParam = {
        cubeName: cube.name,
        projectName: $scope.projectModel.selectedProject
      };
      var defer = $q.defer();
      CubeService.list(queryParam, function(cubes){
        for(var index in cubes){
          if(cube.name === cubes[index].name){
            defer.resolve(cubes[index]);
            break;
          }
        }
        defer.resolve([]);
      },function(e){
        defer.resolve([]);
      })
      return defer.promise;
    }

    $scope.list = function (offset, limit) {
      var defer = $q.defer();
      if (!$scope.projectModel.projects.length) {
        defer.resolve([]);
        return defer.promise;
      }
      offset = (!!offset) ? offset : 0;
      limit = (!!limit) ? limit : 20;

      var queryParam = {offset: offset, limit: limit};
      if ($scope.listParams.cubeName) {
        queryParam.cubeName = $scope.listParams.cubeName;
      }
      queryParam.projectName = $scope.projectModel.selectedProject;

      $scope.loading = true;

      return CubeList.list(queryParam).then(function (resp) {
        angular.forEach($scope.cubeList.cubes,function(cube,index){
        })

        $scope.loading = false;
        defer.resolve(resp);
        return defer.promise;

      },function(resp){
        $scope.loading = false;
        defer.resolve([]);
        SweetAlert.swal('啊哦...', resp, 'error');
        return defer.promise;
      });
    };

    $scope.$watch('projectModel.selectedProject', function (newValue, oldValue) {
      if (newValue != oldValue || newValue == null) {
        CubeList.removeAll();
        $scope.reload();
      }

    });
    $scope.reload = function () {
      // trigger reload action in pagination directive
      $scope.action.reload = !$scope.action.reload;
    };

    $scope.loadDetail = function (cube) {
      var defer = $q.defer();
      if (cube.detail) {
        defer.resolve(cube.detail);
      } else {
        CubeDescService.query({cube_name: cube.name}, {}, function (detail) {
          if (detail.length > 0 && detail[0].hasOwnProperty("name")) {
            cube.detail = detail[0];
            cube.model = modelsManager.getModel(cube.detail.model_name);
              defer.resolve(cube.detail);

          } else {
            SweetAlert.swal('阿哦...', "未加载多维数据集详细信息.", 'error');
          }
        }, function (e) {
          if (e.data && e.data.exception) {
            var message = e.data.exception;
            var msg = !!(message) ? message : '获取action失败.';
            SweetAlert.swal('阿哦...', msg, 'error');
          } else {
            SweetAlert.swal('阿哦...', "获取action失败.", 'error');
          }
        });
      }

      return defer.promise;
    };

    $scope.getTotalSize = function (cubes) {
      var size = 0;
      if (!cubes) {
        return 0;
      }
      else {
        for (var i = 0; i < cubes.length; i++) {
          size += cubes[i].size_kb;
        }
        return $scope.dataSize(size * 1024);
      }
    };

//    Cube Action
    $scope.enable = function (cube) {
      SweetAlert.swal({
        title: '',
        text: '是否确实要启用多维数据集？请注意: 如果多维数据集架构在禁用期间发生更改, 则由于数据和架构不匹配, 多维数据集的所有段都将被丢弃。.',
        type: '',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
//                confirmButtonText: "Yes",
        closeOnConfirm: true
      }, function(isConfirm) {
        if(isConfirm){

          loadingRequest.show();
          CubeService.enable({cubeId: cube.name}, {}, function (result) {

            loadingRequest.hide();
            $scope.refreshCube(cube).then(function(_cube){
              if(_cube && _cube.name){
                $scope.cubeList.cubes[$scope.cubeList.cubes.indexOf(cube)] = _cube;
              }
            });
            SweetAlert.swal('成功!', '成功提交启动任务', 'success');
          },function(e){

            loadingRequest.hide();
            if(e.data&& e.data.exception){
              var message =e.data.exception;
              var msg = !!(message) ? message : '获取action失败.';
              SweetAlert.swal('阿哦...', msg, 'error');
            }else{
              SweetAlert.swal('阿哦...', "获取action失败.", 'error');
            }
          });
        }
      });
    };

    $scope.purge = function (cube) {
      SweetAlert.swal({
        title: '',
        text: '是否清除多维数据集? ',
        type: '',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: "Yes",
        closeOnConfirm: true
      }, function(isConfirm) {
        if(isConfirm){

          loadingRequest.show();
          CubeService.purge({cubeId: cube.name}, {}, function (result) {

            loadingRequest.hide();
            $scope.refreshCube(cube).then(function(_cube){
             if(_cube && _cube.name){
                $scope.cubeList.cubes[$scope.cubeList.cubes.indexOf(cube)] = _cube;
             }
            });
            SweetAlert.swal('成功!', '成功提交清除任务', 'success');
          },function(e){
            loadingRequest.hide();
            if(e.data&& e.data.exception){
              var message =e.data.exception;
              var msg = !!(message) ? message : '获取action失败.';
              SweetAlert.swal('阿哦...', msg, 'error');
            }else{
              SweetAlert.swal('阿哦...', "获取action失败.", 'error');
            }
          });
        }
      });
    }

    $scope.disable = function (cube) {

      SweetAlert.swal({
        title: '',
        text: '是否禁用多维数据集? ',
        type: '',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: "Yes",
        closeOnConfirm: true
      }, function(isConfirm) {
        if(isConfirm){

          loadingRequest.show();
          CubeService.disable({cubeId: cube.name}, {}, function (result) {

            loadingRequest.hide();
            $scope.refreshCube(cube).then(function(_cube){
              if(_cube && _cube.name){
                $scope.cubeList.cubes[$scope.cubeList.cubes.indexOf(cube)] = _cube;
              }
            });
            SweetAlert.swal('成功!', '成功禁用多维数据集', 'success');
          },function(e){

            loadingRequest.hide();
            if(e.data&& e.data.exception){
              var message =e.data.exception;
              var msg = !!(message) ? message : '获取action失败.';
              SweetAlert.swal('阿哦...', msg, 'error');
            }else{
              SweetAlert.swal('阿哦...', "获取action失败.", 'error');
            }
          });
        }

      });
    };

    $scope.dropCube = function (cube) {

      SweetAlert.swal({
        title: '',
        text: " 一旦删除, 多维数据集的元数据和数据将被清理, 无法恢复。 ",
        type: '',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: "Yes",
        closeOnConfirm: true
      }, function(isConfirm) {
        if(isConfirm){

          loadingRequest.show();
          CubeService.drop({cubeId: cube.name}, {}, function (result) {
            loadingRequest.hide();
            SweetAlert.swal('成功!', '成功删除多维数据集', 'success');
            $scope.cubeList.cubes.splice($scope.cubeList.cubes.indexOf(cube),1);
          },function(e){

            loadingRequest.hide();
            if(e.data&& e.data.exception){
              var message =e.data.exception;
              var msg = !!(message) ? message : '获取action失败.';
              SweetAlert.swal('阿哦...', msg, 'error');
            }else{
              SweetAlert.swal('阿哦...', "获取action失败.", 'error');
            }
          });
        }

      });
    };

    $scope.isAutoMigrateCubeEnabled = function(){
      return kylinConfig.isAutoMigrateCubeEnabled();
    };

    $scope.migrateCube = function (cube) {
      SweetAlert.swal({
        title: '',
        text: "多维数据集将覆盖相同的多维数据集," +
        "\n迁移多维数据集将经过几分钟," +
        "\n请稍等.",
        type: '',
        showCancelButton: true,
        confirmButtonColor: '#DD6B55',
        confirmButtonText: "Yes",
        closeOnConfirm: true
      }, function(isConfirm) {
        if(isConfirm){
          loadingRequest.show();
          CubeService.autoMigrate({cubeId: cube.name, propName: $scope.projectModel.selectedProject}, {}, function (result) {
            loadingRequest.hide();
            SweetAlert.swal('成功!', cube.name + ' 迁移成功!', 'success');
          },function(e){
            loadingRequest.hide();
            SweetAlert.swal('迁移失败', "请联系管理员.", 'error');
          });
        }
      });
    };

    $scope.startJobSubmit = function (cube) {

      $scope.loadDetail(cube).then(function () {
        $scope.metaModel={
          model:cube.model
        };

        TableService.get({pro:cube.model.project, tableName:$scope.metaModel.model.fact_table},function(table){
          if(table && table.source_type == 1){
            cube.streaming = true;
          }
          // for streaming cube build tip
          if(cube.streaming){
            SweetAlert.swal({
              title: '',
              text: "是否开始创建?",
              type: '',
              showCancelButton: true,
              confirmButtonColor: '#DD6B55',
              confirmButtonText: "Yes",
              closeOnConfirm: true
            }, function(isConfirm) {
              if(isConfirm){
                loadingRequest.show();
                CubeService.rebuildStreamingCube(
                  {
                    cubeId: cube.name
                  },
                  {
                    sourceOffsetStart:0,
                    sourceOffsetEnd:'9223372036854775807',
                    buildType:'BUILD'
                  }, function (job) {
                    loadingRequest.hide();
                    SweetAlert.swal('成功!', '成功提交创建任务', 'success');
                  },function(e){

                    loadingRequest.hide();
                    if(e.data&& e.data.exception){
                      var message =e.data.exception;
                      var msg = !!(message) ? message : '获取action失败.';
                      SweetAlert.swal('阿哦...', msg, 'error');
                    }else{
                      SweetAlert.swal('阿哦...', "获取action失败.", 'error');
                    }
                  });
              }
            })
            return;
          }

          //for batch cube build tip
          if ($scope.metaModel.model.name) {

            //for partition cube build tip
            if ($scope.metaModel.model.partition_desc.partition_date_column) {
              $modal.open({
                templateUrl: 'jobSubmit.html',
                controller: jobSubmitCtrl,
                resolve: {
                  cube: function () {
                    return cube;
                  },
                  metaModel:function(){
                    return $scope.metaModel;
                  },
                  buildType: function () {
                    return 'BUILD';
                  },
                  scope:function(){
                    return $scope;
                  }
                }
              });
            }

            //for not partition cube build tip
            else {
              SweetAlert.swal({
                title: '',
                text: "是否开始创建?",
                type: '',
                showCancelButton: true,
                confirmButtonColor: '#DD6B55',
                confirmButtonText: "Yes",
                closeOnConfirm: true
              }, function(isConfirm) {
                if(isConfirm){

                  loadingRequest.show();
                  CubeService.rebuildCube(
                    {
                      cubeId: cube.name
                    },
                    {
                      buildType: 'BUILD',
                      startTime: 0,
                      endTime: 0
                    }, function (job) {

                      loadingRequest.hide();
                      SweetAlert.swal('成功!', '成功提交创建任务', 'success');
                    },function(e){

                      loadingRequest.hide();
                      if(e.data&& e.data.exception){
                        var message =e.data.exception;
                        var msg = !!(message) ? message : '获取action失败.';
                        SweetAlert.swal('阿哦...', msg, 'error');
                      }else{
                        SweetAlert.swal('阿哦...', "获取action失败.", 'error');
                      }
                    });
                }

              });
            }
          }
        })
      })

    };

    $scope.startRefresh = function (cube) {

      $scope.loadDetail(cube).then(function () {
        $scope.metaModel={
          model:cube.model
        };
        $modal.open({
          templateUrl: 'jobRefresh.html',
          controller: jobSubmitCtrl,
          resolve: {
            cube: function () {
              return cube;
            },
            metaModel:function(){
              return $scope.metaModel;
            },
            buildType: function () {
              return 'REFRESH';
            },
            scope:function(){
              return $scope;
            }
          }
        });
        }
      )

    };

    $scope.cloneCube = function(cube){
      if(!$scope.projectModel.selectedProject){
        SweetAlert.swal('阿哦...', "请在克隆前选择项目.", 'info');
        return;
      }

      $scope.loadDetail(cube).then(function () {
        $modal.open({
          templateUrl: 'cubeClone.html',
          controller: cubeCloneCtrl,
          windowClass:"clone-cube-window",
          resolve: {
            cube: function () {
              return cube;
            }
          }
        });
      });
    }
    $scope.cubeEdit = function (cube) {
      $location.path("cubes/edit/" + cube.name);
    }
    $scope.startMerge = function (cube) {
      $scope.loadDetail(cube).then(function () {
        $scope.metaModel={
          model:cube.model
        };
        $modal.open({
          templateUrl: 'jobMerge.html',
          controller: jobSubmitCtrl,
          resolve: {
            cube: function () {
              return cube;
            },
            metaModel:function(){
              return $scope.metaModel;
            },
            buildType: function () {
              return 'MERGE';
            },
            scope:function(){
              return $scope;
            }
          }
        });
      })
    };

     $scope.startDeleteSegment = function (cube) {
       $scope.loadDetail(cube).then(function () {
         $scope.metaModel={
           model:modelsManager.getModelByCube(cube.name)
         };
         $modal.open({
           templateUrl: 'deleteSegment.html',
           controller: deleteSegmentCtrl,
           resolve: {
             cube: function () {
               return cube;
             },
             scope: function() {
               return $scope;
             }
           }
         });
       });
     };

    $scope.startLookupRefresh = function(cube) {
      $scope.loadDetail(cube).then(function () {
        $scope.metaModel={
          model:cube.model
        };
        $modal.open({
          templateUrl: 'lookupRefresh.html',
          controller: lookupRefreshCtrl,
          resolve: {
            cube: function () {
              return cube;
            },
            scope:function(){
              return $scope;
            }
          }
        });
        }
      );
    };

  });


var cubeCloneCtrl = function ($scope, $modalInstance, CubeService, MessageService, $location, cube, MetaModel, SweetAlert,ProjectModel, loadingRequest) {
  $scope.projectModel = ProjectModel;

  $scope.targetObj={
    cubeName:cube.descriptor+"_clone",
    targetProject:$scope.projectModel.selectedProject
  }

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.cloneCube = function(){

    if(!$scope.targetObj.targetProject){
      SweetAlert.swal('阿哦...', "请选择目标项目.", 'info');
      return;
    }

    $scope.cubeRequest = {
      cubeName:$scope.targetObj.cubeName,
      project:$scope.targetObj.targetProject
    }

    SweetAlert.swal({
      title: '',
      text: '是否克隆多维数据集? ',
      type: '',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: "Yes",
      closeOnConfirm: true
    }, function (isConfirm) {
      if (isConfirm) {

        loadingRequest.show();
        CubeService.clone({cubeId: cube.name}, $scope.cubeRequest, function (result) {
          loadingRequest.hide();
          SweetAlert.swal('成功!', '克隆成功', 'success');
          location.reload();
        }, function (e) {
          loadingRequest.hide();
          if (e.data && e.data.exception) {
            var message = e.data.exception;
            var msg = !!(message) ? message : '获取action失败.';
            SweetAlert.swal('阿哦...', msg, 'error');
          } else {
            SweetAlert.swal('阿哦...', "获取action失败.", 'error');
          }
        });
      }
    });
  }

}


var jobSubmitCtrl = function ($scope, $modalInstance, CubeService, MessageService, $location, cube, metaModel, buildType, SweetAlert, loadingRequest, scope, CubeList,$filter) {
  $scope.cubeList = CubeList;
  $scope.cube = cube;
  $scope.metaModel = metaModel;
  $scope.jobBuildRequest = {
    buildType: buildType,
    startTime: 0,
    endTime: 0
  };
  $scope.message = "";
  var startTime;
  if(cube.segments.length == 0){
    startTime = (!!cube.detail.partition_date_start)?cube.detail.partition_date_start:0;
  }else{
    startTime = cube.segments[cube.segments.length-1].date_range_end;
  }
  $scope.jobBuildRequest.startTime=startTime;
  $scope.rebuild = function () {

    $scope.message = null;

    if ($scope.jobBuildRequest.startTime >= $scope.jobBuildRequest.endTime) {
      $scope.message = "警告: 结束时间应晚于开始时间.";

      return;
    }

    loadingRequest.show();
    CubeService.rebuildCube({cubeId: cube.name}, $scope.jobBuildRequest, function (job) {

      loadingRequest.hide();
      $modalInstance.dismiss('cancel');
      SweetAlert.swal('成功!', '成功提交创建任务', 'success');
      scope.refreshCube(cube).then(function(_cube){
          $scope.cubeList.cubes[$scope.cubeList.cubes.indexOf(cube)] = _cube;
        });
    }, function (e) {


      loadingRequest.hide();
      if (e.data && e.data.exception) {
        var message = e.data.exception;

        if(message.indexOf("Empty cube segment found")!=-1){
          var _segment = message.substring(message.indexOf(":")+1,message.length-1);
          SweetAlert.swal({
            title:'',
            type:'info',
            text: '找到空的多维数据集段'+':'+_segment+', 是否强制合并数据段?',
            showCancelButton: true,
            confirmButtonColor: '#DD6B55',
            closeOnConfirm: true
          }, function (isConfirm) {
            if (isConfirm) {
              $scope.jobBuildRequest.forceMergeEmptySegment = true;
              $scope.rebuild();
              delete $scope.jobBuildRequest.forceMergeEmptySegment;
            }
          });
          return;
        }

        if(message.indexOf("Merging segments must not have gaps between")!=-1){
          SweetAlert.swal({
            title:'',
            type:'info',
            text: '有差距数据段, 是否强制合并段 ?',
            showCancelButton: true,
            confirmButtonColor: '#DD6B55',
            closeOnConfirm: true
          }, function (isConfirm) {
            if (isConfirm) {
              $scope.jobBuildRequest.forceMergeEmptySegment = true;
              $scope.rebuild();
              delete $scope.jobBuildRequest.forceMergeEmptySegment;
            }
          });
          return;
        }
        var msg = !!(message) ? message : '获取action失败.';
        SweetAlert.swal('阿哦...', msg, 'error');
      } else {
        SweetAlert.swal('阿哦...', "获取action失败.", 'error');
      }
    });
  };

  // used by cube segment refresh
  $scope.segmentSelected = function (selectedSegment) {
    $scope.jobBuildRequest.startTime = 0;
    $scope.jobBuildRequest.endTime = 0;

    if (selectedSegment.date_range_start) {
      $scope.jobBuildRequest.startTime = selectedSegment.date_range_start;
    }

    if (selectedSegment.date_range_end) {
      $scope.jobBuildRequest.endTime = selectedSegment.date_range_end;
    }
  };

  // used by cube segments merge
  $scope.mergeStartSelected = function (mergeStartSeg) {
    $scope.jobBuildRequest.startTime = 0;

    if (mergeStartSeg.date_range_start) {
      $scope.jobBuildRequest.startTime = mergeStartSeg.date_range_start;
    }
  };

  $scope.mergeEndSelected = function (mergeEndSeg) {
    $scope.jobBuildRequest.endTime = 0;

    if (mergeEndSeg.date_range_end) {
      $scope.jobBuildRequest.endTime = mergeEndSeg.date_range_end;
    }
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
};


var streamingBuildCtrl = function ($scope, $modalInstance,kylinConfig) {
  $scope.kylinConfig = kylinConfig;
  var streamingGuildeUrl = kylinConfig.getProperty("kylin.web.link-streaming-guide");
  $scope.streamingBuildUrl = streamingGuildeUrl?streamingGuildeUrl:"http://kylin.apache.org/";

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };
};

var deleteSegmentCtrl = function($scope, $modalInstance, CubeService, SweetAlert, loadingRequest, cube, scope) {
  $scope.cube = cube;
  $scope.deleteSegments = [];
  $scope.segment = {};

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.deleteSegment = function() {
    SweetAlert.swal({
      title: '',
      text: '是否删除数据段 ['+$scope.segment.selected.name+']? ',
      type: '',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: "Yes",
      closeOnConfirm: true
    }, function(isConfirm) {
      if(isConfirm){
        loadingRequest.show();
        CubeService.deleteSegment({cubeId: cube.name, propValue: $scope.segment.selected.name}, {}, function (result) {
          loadingRequest.hide();
          $modalInstance.dismiss('cancel');
          scope.refreshCube(cube).then(function(_cube){
           if(_cube && _cube.name){
              scope.cubeList.cubes[scope.cubeList.cubes.indexOf(cube)] = _cube;
           }
          });
          SweetAlert.swal('成功!', '成功删除数据段', 'success');
        },function(e){
          loadingRequest.hide();
          if(e.data&& e.data.exception){
            var message =e.data.exception;
            var msg = !!(message) ? message : '删除数据段失败.';
            SweetAlert.swal('阿哦...', msg, 'error');
          }else{
            SweetAlert.swal('阿哦...', '删除数据段失败.', 'error');
          }
        });
      }
    });
  };
};

var lookupRefreshCtrl = function($scope, scope, CubeList, $modalInstance, CubeService, cube, SweetAlert, loadingRequest) {
  $scope.cubeList = CubeList;
  $scope.cube = cube;
  $scope.dispalySegment = false;

  $scope.getLookups = function() {
    var modelLookups = cube.model ? cube.model.lookups : [];
    var cubeLookups = [];
    angular.forEach(modelLookups, function(modelLookup, index) {
      var dimensionTables = _.find(cube.detail.dimensions, function(dimension){ return dimension.table === modelLookup.alias;});
      if (!!dimensionTables) {
        if (cubeLookups.indexOf(modelLookup.table) === -1) {
          cubeLookups.push(modelLookup.table);
        }
      }
    });
    return cubeLookups;
  };

  $scope.cubeLookups = $scope.getLookups();

  $scope.lookup = {
    select: {}
  };

  $scope.getReadySegment = function(segment) {
    return segment.status === 'READY';
  };

  $scope.cancel = function () {
    $modalInstance.dismiss('cancel');
  };

  $scope.updateLookupTable = function(tableName) {
    var lookupTable = _.find(cube.detail.snapshot_table_desc_list, function(table){ return table.table_name == tableName});
    if (!!lookupTable && lookupTable.global) {
      $scope.dispalySegment = false;
      $scope.lookup.select.segments = [];
    } else {
      $scope.dispalySegment = true;
    }
  };

  $scope.selectAllSegments = function(allSegments) {
    if (allSegments) {
      $scope.lookup.select.segments = $scope.cube.segments;
    } else {
      $scope.lookup.select.segments = [];
    }
  };

  $scope.refresh = function() {
    if (!$scope.lookup.select.table_name) {
      SweetAlert.swal('警告', '查阅表格不应为空', 'warning');
      return;
    }

    // cube advance lookup table
    var lookupTable = _.find(cube.detail.snapshot_table_desc_list, function(table){ return table.table_name == $scope.lookup.select.table_name});
    if (!!lookupTable) {
      if (!lookupTable.global && $scope.lookup.select.segments.length == 0) {
        SweetAlert.swal('警告', '数据段不应为空', 'warning');
        return;
      }
    } else {
      // cube lookup table
      lookupTable = _.find($scope.cubeLookups, function(table){ return table == $scope.lookup.select.table_name});
      if (!lookupTable) {
        SweetAlert.swal('警告', '多维数据集中不存在查阅表', 'warning');
        return;
      } else {
        if ($scope.lookup.select.segments.length == 0) {
          SweetAlert.swal('警告', '数据段不应为空', 'warning');
          return;
        }
      }
    }

    var lookupSnapshotBuildRequest = {
      lookupTableName: $scope.lookup.select.table_name,
      segmentIDs: _.map($scope.lookup.select.segments, function(segment){ return segment.uuid})
    };

    loadingRequest.show();
    CubeService.lookupRefresh({cubeId: cube.name}, lookupSnapshotBuildRequest, function (job) {
      loadingRequest.hide();
      $modalInstance.dismiss('cancel');
      SweetAlert.swal('成功!', '成功提交刷新任务', 'success');
      scope.refreshCube(cube).then(function(_cube){
          $scope.cubeList.cubes[$scope.cubeList.cubes.indexOf(cube)] = _cube;
        });
    }, function (e) {
       loadingRequest.hide();
      if (e.data && e.data.exception) {
        var message = e.data.exception;

        var msg = !!(message) ? message : '获取action失败.';
        SweetAlert.swal('阿哦...', msg, 'error');
      } else {
        SweetAlert.swal('阿哦...', "获取action失败.", 'error');
      }
    });
  };

};
