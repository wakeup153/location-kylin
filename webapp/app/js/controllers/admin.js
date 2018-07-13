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

KylinApp.controller('AdminCtrl', function ($scope, AdminService, CacheService, TableService, loadingRequest, MessageService, ProjectService, $modal, SweetAlert,kylinConfig,ProjectModel,$window) {
  $scope.configStr = "";
  $scope.envStr = "";

  $scope.isCacheEnabled = function(){
    return kylinConfig.isCacheEnabled();
  }

  $scope.getEnv = function () {
    AdminService.env({}, function (env) {
      $scope.envStr = env.env;
      MessageService.sendMsg('成功获取服务器环境', 'success', {});
//            SweetAlert.swal('Success!', 'Server environment get successfully', 'success');
    }, function (e) {
      if (e.data && e.data.exception) {
        var message = e.data.exception;
        var msg = !!(message) ? message : '获取action失败.';
        SweetAlert.swal('啊哦...', msg, 'error');
      } else {
        SweetAlert.swal('啊哦...', "获取action失败.", 'error');
      }
    });
  }

  $scope.getConfig = function () {
    AdminService.config({}, function (config) {
      $scope.configStr = config.config;
      MessageService.sendMsg('成功获取服务器配置', 'success', {});
    }, function (e) {
      if (e.data && e.data.exception) {
        var message = e.data.exception;
        var msg = !!(message) ? message : '获取acion失败.';
        SweetAlert.swal('啊哦...', msg, 'error');
      } else {
        SweetAlert.swal('啊哦...', "获取acion失败.", 'error');
      }
    });
  }

  $scope.reloadConfig = function () {
    SweetAlert.swal({
      title: '',
      text: '是否重载配置?',
      type: '',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: "Yes",
      closeOnConfirm: true
    }, function (isConfirm) {
      if (isConfirm) {
        CacheService.reloadConfig({}, function () {
          SweetAlert.swal('成功!', '重载配置成功', 'success');
          $scope.getConfig();
        }, function (e) {
          if (e.data && e.data.exception) {
            var message = e.data.exception;
            var msg = !!(message) ? message : '获取acion失败.';
            SweetAlert.swal('阿哦…', msg, 'error');
          } else {
            SweetAlert.swal('阿哦…', "获取acion失败.", 'error');
          }
        });
      }
    });
  }

  $scope.reloadMeta = function () {
    SweetAlert.swal({
      title: '',
      text: '是否重载元数据并清除缓存',
      type: '',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: "Yes",
      closeOnConfirm: true
    }, function (isConfirm) {
      if (isConfirm) {
        CacheService.clean({}, function () {
          SweetAlert.swal('成功!', '重载缓存成功', 'success');
          ProjectService.listReadable({}, function(projects) {
            ProjectModel.setProjects(projects);
          });
        }, function (e) {
          if (e.data && e.data.exception) {
            var message = e.data.exception;
            var msg = !!(message) ? message : '获取acion失败.';
            SweetAlert.swal('阿哦…', msg, 'error');
          } else {
            SweetAlert.swal('阿哦…', "获取acion失败.", 'error');
          }
        });
      }

    });
  }

  $scope.calCardinality = function (tableName) {
    var _project = ProjectModel.selectedProject;
      if (_project == null){
        SweetAlert.swal('', "未选择项目.", 'info');
          return;
        }
    $modal.open({
      templateUrl: 'calCardinality.html',
      controller: CardinalityGenCtrl,
      resolve: {
        tableName: function () {
          return tableName;
        },
        scope: function () {
          return $scope;
        }
      }
    });
  }

  $scope.cleanStorage = function () {
    SweetAlert.swal({
      title: '',
      text: '是否清理未使用的HDFS与HBase空间?',
      type: '',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: "Yes",
      closeOnConfirm: true
    }, function (isConfirm) {
      if (isConfirm) {
        AdminService.cleanStorage({}, function () {
          SweetAlert.swal('Success!', '成功清理内存!', 'success');
        }, function (e) {
          if (e.data && e.data.exception) {
            var message = e.data.exception;
            var msg = !!(message) ? message : '获取acion失败.';
            SweetAlert.swal('阿哦…', msg, 'error');
          } else {
            SweetAlert.swal('阿哦…', "获取acion失败.", 'error');
          }
        });
      }
    });
  }

  $scope.disableCache = function () {
    SweetAlert.swal({
      title: '',
      text: '是否禁用查询缓存?',
      type: '',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: "Yes",
      closeOnConfirm: true
    }, function (isConfirm) {
      if (isConfirm) {
        AdminService.updateConfig({}, {key: 'kylin.query.cache-enabled', value: false}, function () {
          SweetAlert.swal('成功!', '禁用查询缓存成功!', 'success');
          location.reload();
        }, function (e) {
          if (e.data && e.data.exception) {
            var message = e.data.exception;
            var msg = !!(message) ? message : '获取acion失败.';
            SweetAlert.swal('阿哦…', msg, 'error');
          } else {
            SweetAlert.swal('阿哦…', "获取acion失败.", 'error');
          }
        });
      }

    });

  }

  $scope.enableCache = function () {
    SweetAlert.swal({
      title: '',
      text: '是否启用查询缓存?',
      type: '',
      showCancelButton: true,
      confirmButtonColor: '#DD6B55',
      confirmButtonText: "Yes",
      closeOnConfirm: true
    }, function (isConfirm) {
      if (isConfirm) {
        AdminService.updateConfig({}, {key: 'kylin.query.cache-enabled', value: true}, function () {
          SweetAlert.swal('成功!', '成功启用缓存!', 'success');
          location.reload();
        }, function (e) {
          if (e.data && e.data.exception) {
            var message = e.data.exception;
            var msg = !!(message) ? message : '获取acion失败.';
            SweetAlert.swal('阿哦…', msg, 'error');
          } else {
            SweetAlert.swal('阿哦…', "获取acion失败.", 'error');
          }
        });
      }

    });

  }

  $scope.toSetConfig = function () {
    $modal.open({
      templateUrl: 'updateConfig.html',
      controller: updateConfigCtrl,
      scope: $scope,
      resolve: {}
    });
  }

  var CardinalityGenCtrl = function ($scope, $modalInstance, tableName, MessageService) {
    $scope.tableName = tableName;
    $scope.delimiter = 0;
    $scope.format = 0;
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
    $scope.calculate = function () {
      $modalInstance.dismiss();
      loadingRequest.show();
      var _project = ProjectModel.selectedProject;
      if (_project == null){
        SweetAlert.swal('', "未选择项目.", 'info');
        return;
      }
      TableService.genCardinality({tableName: $scope.tableName, pro: _project}, {
        delimiter: $scope.delimiter,
        format: $scope.format
      }, function (result) {
        loadingRequest.hide();
        SweetAlert.swal('成功!', '已成功计算基数任务. . 单击按钮刷新 ...', 'success');
      }, function (e) {
        loadingRequest.hide();
        if (e.data && e.data.exception) {
          var message = e.data.exception;
          var msg = !!(message) ? message : '获取acion失败.';
          SweetAlert.swal('阿哦……', msg, 'error');
        } else {
          SweetAlert.swal('阿哦……', "获取acion失败.", 'error');
        }
      });
    }
  };

  var updateConfigCtrl = function ($scope, $modalInstance, AdminService, MessageService) {
    $scope.state = {
      key: null,
      value: null
    };
    $scope.cancel = function () {
      $modalInstance.dismiss('cancel');
    };
    $scope.update = function () {
      AdminService.updateConfig({}, {key: $scope.state.key, value: $scope.state.value}, function (result) {
        SweetAlert.swal('成功!', '成功更新配置!', 'success');
        $modalInstance.dismiss();
        $scope.getConfig();
      }, function (e) {
        if (e.data && e.data.exception) {
          var message = e.data.exception;
          var msg = !!(message) ? message : '获取acion失败.';
          SweetAlert.swal('阿哦…', msg, 'error');
        } else {
          SweetAlert.swal('阿哦…', "获取acion失败.", 'error');
        }
      });
    }
  };

  $scope.downloadBadQueryFiles = function(){
    var _project = ProjectModel.selectedProject;
    if (_project == null){
      SweetAlert.swal('', "未选择项目.", 'info');
      return;
    }
    var downloadUrl = Config.service.url + 'diag/project/'+_project+'/download';
    $window.open(downloadUrl);
  }


  $scope.getEnv();
  $scope.getConfig();
});
