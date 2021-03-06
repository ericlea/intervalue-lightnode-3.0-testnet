'use strict';

var unsupported, isaosp;
var breadcrumbs = require('intervaluecore/breadcrumbs.js');

if (window && window.navigator) {
  var rxaosp = window.navigator.userAgent.match(/Android.*AppleWebKit\/([\d.]+)/);
  isaosp = (rxaosp && rxaosp[1] < 537);
  if (!window.cordova && isaosp)
    unsupported = true;
  if (unsupported) {
    window.location = '#/unsupported';
  }
}


//Setting up route
angular
  .module('copayApp')
  .config(function (historicLogProvider, $provide, $logProvider, $stateProvider, $urlRouterProvider, $compileProvider, $qProvider) {
    $qProvider.errorOnUnhandledRejections(false);
    $urlRouterProvider.otherwise('/');

    $logProvider.debugEnabled(true);
    $provide.decorator('$log', ['$delegate',
      function ($delegate) {
        var historicLog = historicLogProvider.$get();

        ['debug', 'info', 'warn', 'error', 'log'].forEach(function (level) {

          var orig = $delegate[level];
          $delegate[level] = function () {
            if (level == 'error')
              console.log(arguments);

            var args = [].slice.call(arguments);
            if (!Array.isArray(args)) args = [args];
            args = args.map(function (v) {
              try {
                if (typeof v == 'undefined') v = 'undefined';
                if (!v) v = 'null';
                if (typeof v == 'object') {
                  if (v.message)
                    v = v.message;
                  else
                    v = JSON.stringify(v);
                }
                // Trim output in mobile
                if (window.cordova) {
                  v = v.toString();
                  if (v.length > 1000) {
                    v = v.substr(0, 997) + '...';
                  }
                }
              } catch (e) {
                console.log('Error at log decorator:', e);
                v = 'undefined';
              }
              return v;
            });
            try {
              if (window.cordova)
                console.log(args.join(' '));
              historicLog.add(level, args.join(' '));
              orig.apply(null, args);
            } catch (e) {
              console.log('ERROR (at log decorator):', e, args[0]);
            }
          };
        });
        return $delegate;
      }
    ]);

    // whitelist 'chrome-extension:' for chromeApp to work with image URLs processed by Angular
    // link: http://stackoverflow.com/questions/15606751/angular-changes-urls-to-unsafe-in-extension-page?lq=1
    $compileProvider.imgSrcSanitizationWhitelist(/^\s*((https?|ftp|file|blob|chrome-extension):|data:image\/)/);

    $stateProvider
      .state('splash', {
        url: '/splash',
        needProfile: false,
        views: {
          'main': {
            templateUrl: 'views/splash.html',
          }
        }
      })
        .state('create', {
            url: '/create',
            needProfile: false,
            views: {
                'main': {
                    templateUrl: 'views/create.html'
                }
            }
        })
      .state('addwallet', {
          url: '/addwallet.html',
          needProfile: false,
          views: {
              'main': {
                  templateUrl: 'views/addwallet.html',
              }
          }
      });

    $stateProvider
      .state('walletHome', {
        url: '/',
        walletShouldBeComplete: true,
        needProfile: true,
        deepStateRedirect: true,
        sticky: true,
        views: {
          'main': {
            templateUrl: 'views/walletHome.html',
          }
        }
      })
      .state('unsupported', {
        url: '/unsupported',
        needProfile: false,
        views: {
          'main': {
            templateUrl: 'views/unsupported.html'
          }
        }
      })


      .state('copayers', {
        url: '/copayers',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/copayers.html'
          }
        }
      })
      .state('correspondentDevices', {
        url: '/correspondentDevices',
        walletShouldBeComplete: false,
        needProfile: true,
        deepStateRedirect: true,
        sticky: true,
        views: {
          'chat': {
            templateUrl: 'views/correspondentDevices.html'
          }
        }
      })
      .state('correspondentDevices.correspondentDevice', {
        url: '/device',
        walletShouldBeComplete: false,
        needProfile: true,
        views: {
          'dialog': {
            templateUrl: 'views/correspondentDevice.html'
          }
        }
      })
      .state('correspondentDevices.correspondentDevice.editCorrespondentDevice', {
        url: '/edit',
        walletShouldBeComplete: false,
        needProfile: true,
        views: {
          'dialog@correspondentDevices': {
            templateUrl: 'views/editCorrespondentDevice.html'
          }
        }
      })
      .state('correspondentDevices.addCorrespondentDevice', {
        url: '/add',
        needProfile: true,
        views: {
          'dialog': {
            templateUrl: 'views/addCorrespondentDevice.html'
          }
        }
      })
      .state('correspondentDevices.addCorrespondentDevice.inviteCorrespondentDevice', {
        url: '/invite',
        walletShouldBeComplete: false,
        needProfile: true,
        views: {
          'dialog@correspondentDevices': {
            templateUrl: 'views/inviteCorrespondentDevice.html'
          }
        }
      })
      .state('correspondentDevices.addCorrespondentDevice.acceptCorrespondentInvitation', {
        url: '/acceptCorrespondentInvitation',
        walletShouldBeComplete: false,
        needProfile: true,
        views: {
          'dialog@correspondentDevices': {
            templateUrl: 'views/acceptCorrespondentInvitation.html'
          }
        }
      })
      .state('correspondentDevices.bot', {
        url: '/bot/:id',
        walletShouldBeComplete: false,
        needProfile: true,
        views: {
          'dialog': {
            templateUrl: 'views/bot.html'
          }
        }
      })
      .state('authConfirmation', {
        url: '/authConfirmation',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/authConfirmation.html'
          }
        }
      })
      .state('preferences', {
        url: '/preferences',
        templateUrl: 'views/preferences.html',
        walletShouldBeComplete: true,
        needProfile: true,
        modal: true,
        views: {
          'main': {
            templateUrl: 'views/preferences.html',
          }
        }
      })
      .state('preferences.preferencesColor', {
        url: '/color',
        templateUrl: 'views/preferencesColor.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesColor.html'
          }
        }
      })

      .state('preferences.preferencesAlias', {
        url: '/alias',
        templateUrl: 'views/preferencesAlias.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesAlias.html'
          }

        }
      })
      .state('preferences.preferencesAdvanced', {
        url: '/advanced',
        templateUrl: 'views/preferencesAdvanced.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesAdvanced.html'
          }
        }
      })
      .state('preferences.preferencesAdvanced.preferencesInformation', {
        url: '/information',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesInformation.html'
          }
        }
      })
      .state('preferences.preferencesAdvanced.paperWallet', {
        url: '/paperWallet',
        templateUrl: 'views/paperWallet.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/paperWallet.html'
          }
        }
      })
      .state('preferences.preferencesAdvanced.preferencesDeleteWallet', {
        url: '/delete',
        templateUrl: 'views/preferencesDeleteWallet.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesDeleteWallet.html'
          }
        }
      })
      .state('preferencesGlobal', {
        url: '/preferencesGlobal',
        needProfile: true,
        modal: true,
        views: {
          'main': {
            templateUrl: 'views/preferencesGlobal.html',
          }
        }
      })
      .state('preferencesGlobal.preferencesDeviceName', {
        url: '/deviceName',
        walletShouldBeComplete: false,
        needProfile: false,
        views: {
          'main@': {
            templateUrl: 'views/preferencesDeviceName.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesHub', {
        url: '/hub',
        walletShouldBeComplete: false,
        needProfile: false,
        views: {
          'main@': {
            templateUrl: 'views/preferencesHub.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesTor', {
        url: '/tor',
        templateUrl: 'views/preferencesTor.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesTor.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesLanguage', {
        url: '/language',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesLanguage.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesCurrency', {
          url: '/currency',
          walletShouldBeComplete: true,
          needProfile: true,
          views: {
              'main@': {
                  templateUrl: 'views/preferencesCurrency.html'
              }
          }
      })
      .state('preferencesGlobal.preferencesAttestorAddresses', {
        url: '/attestorAddresses',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesAttestorAddresses.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesAttestorAddresses.preferencesEditAttestorAddress', {
        url: '/edit',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesEditAttestorAddress.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesUnit', {
        url: '/unit',
        templateUrl: 'views/preferencesUnit.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesUnit.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesBbUnit', {
        url: '/bbUnit',
        templateUrl: 'views/preferencesBbUnit.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesBbUnit.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesEmail', {
        url: '/email',
        templateUrl: 'views/preferencesEmail.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesEmail.html'
          }

        }
      })
      .state('preferencesGlobal.preferencesWitnesses', {
        url: '/witnesses',
        templateUrl: 'views/preferencesWitnesses.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesWitnesses.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesWitnesses.preferencesEditWitness', {
        url: '/edit',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesEditWitness.html'
          }
        }
      })
      .state('preferencesGlobal.recoveryFromSeed', {
        url: '/recoveryFromSeed',
        templateUrl: 'views/recoveryFromSeed.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/recoveryFromSeed.html'
          }
        }
      })
      .state('preferencesGlobal.export', {
        url: '/export',
        templateUrl: 'views/export.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/export.html'
          }
        }
      })
      .state('import', {
        url: '/import',
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/import.html'
          }
        }
      })

      .state('preferencesGlobal.preferencesAbout', {
        url: '/about',
        templateUrl: 'views/preferencesAbout.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesAbout.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesAbout.term', {
        url: '/term',
        needProfile: false,
        views: {
          'main@': {
            templateUrl: 'views/term.html',
          }
        }
      })
      .state('disclaimer', {
        url: '/disclaimer',
        needProfile: false,
        views: {
          'main': {
            templateUrl: 'views/disclaimer.html',
          }
        }
      })
      .state('preferencesGlobal.preferencesAbout.translators', {
        url: '/translators',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/translators.html'
          }
        }
      })
      .state('preferencesGlobal.preferencesAbout.preferencesLogs', {
        url: '/logs',
        templateUrl: 'views/preferencesLogs.html',
        walletShouldBeComplete: true,
        needProfile: true,
        views: {
          'main@': {
            templateUrl: 'views/preferencesLogs.html'
          }
        }
      })

      .state('add', {
        url: '/add',
        needProfile: true,
        views: {
          'main': {
            templateUrl: 'views/add.html'
          }
        }
      })

      .state('walletnamea', {
        url: '/walletname?name&addr&ammount&walletId&image&mnemonic&mnemonicEncrypted',
        needProfile: true,
        views: {
            'main@': {
                templateUrl: 'views/walletnamea.html'
            }
        }
      })
      .state('changeWalletPassWord', {
          url: '/changeWalletPassWord?name&addr&ammount&walletId&image&mnemonic&mnemonicEncrypted',
          needProfile: true,
          views: {
              'main@': {
                  templateUrl: 'views/changeWalletPassWord.html'
              }
          }
      })
      .state('importwallet', {
          url: '/importwallet?walletId&name',
          needProfile: true,
          views: {
              'main': {
                  templateUrl: 'views/importwallet.html'
              }
          }
      })

      .state('backup', {
          url: '/backup?name&addr&ammount&walletId&image&mnemonic&mnemonicEncrypted',
          templateUrl: 'views/backup.html',
          walletShouldBeComplete: true,
          needProfile: true,
          views: {
              'main@': {
                  templateUrl: 'views/backup.html'

              }
          }
      })
      .state('receive', {
          url: '/receive',
          templateUrl: 'views/receive.html',
          walletShouldBeComplete: true,
          needProfile: true,
          views: {
              'main@': {
                  templateUrl: 'views/receive.html'

              }
          }
      })

      .state('newsin', {
            url: '/article?id',
            views: {
                'main': {
                    templateUrl: 'views/newsin.html'
                }
            }
      })
      .state('cordova', { // never used
        url: '/cordova/:status/:isHome',
        views: {
          'main': {
            controller: function ($rootScope, $state, $stateParams, $timeout, go, isCordova) {
              console.log('cordova status: ' + $stateParams.status);
              switch ($stateParams.status) {
                case 'resume':
                  $rootScope.$emit('Local/Resume');
                  break;
                case 'backbutton':
                  if (isCordova && $stateParams.isHome == 'true' && !$rootScope.modalOpened)
                    navigator.app.exitApp();
                  else
                    $rootScope.$emit('closeModal');
                  break;
              };
              // why should we go home on resume or backbutton?
              /*
            $timeout(function() {
              $rootScope.$emit('Local/SetTab', 'walletHome', true);
            }, 100);
            go.walletHome();
            */
            }
          }
        },
        needProfile: false
      });
  })
  .run(function ($rootScope, $state, $log, uriHandler, isCordova, profileService, $timeout, nodeWebkit, uxLanguage ,uxCurrency, animationService) {
     FastClick.attach(document.body);
    //字体百分比  开始
      ;(function(win) {
          var doc = win.document;
          var docEl = doc.documentElement;
          var metaEl = doc.querySelector('meta[name="viewport"]');
          var dpr = 0;
          var scale = 0;
          var tid;


          console.warn('将根据已有的meta标签来设置缩放比例');
          var match = metaEl.getAttribute('content').match(/initial\-scale=([\d\.]+)/);
          if (match) {
              scale = parseFloat(match[1]);
              dpr = parseInt(1 / scale);
          }

          if (!dpr && !scale) {
              // var isAndroid = win.navigator.appVersion.match(/android/gi);
              var isIPhone = win.navigator.appVersion.match(/iphone/gi);
              var devicePixelRatio = win.devicePixelRatio;
              if (isIPhone) {
                  // iOS下，对于2和3的屏，用2倍的方案，其余的用1倍方案
                  if (devicePixelRatio >= 3 && (!dpr || dpr >= 3)) {
                      dpr = 3;
                  } else if (devicePixelRatio >= 2 && (!dpr || dpr >= 2)){
                      dpr = 2;
                  } else {
                      dpr = 1;
                  }
              } else {
                  // 其他设备下，仍旧使用1倍的方案
                  dpr = 1;
              }
              scale = 1 / dpr;
          }

          docEl.setAttribute('data-dpr', dpr);
          if (!metaEl) {
              metaEl = doc.createElement('meta');
              metaEl.setAttribute('name', 'viewport');
              metaEl.setAttribute('content', 'initial-scale=' + scale + ', maximum-scale=' + scale + ', minimum-scale=' + scale + ', user-scalable=no');
              if (docEl.firstElementChild) {
                  docEl.firstElementChild.appendChild(metaEl);
              } else {
                  var wrap = doc.createElement('div');
                  wrap.appendChild(metaEl);
                  doc.write(wrap.innerHTML);
              }
          }

          function refreshRem(){

              var width = docEl.getBoundingClientRect().width;
              if(width > 1024) return;
              var rem = (width / 375) * 100;
              docEl.style.fontSize = rem + 'px';
          }

          win.addEventListener('resize', function() {
              clearTimeout(tid);
              tid = setTimeout(refreshRem, 300);
          }, false);
          win.addEventListener('pageshow', function(e) {
              if (e.persisted) {
                  clearTimeout(tid);
                  tid = setTimeout(refreshRem, 300);
              }
          }, false);

          if (doc.readyState === 'complete') {
              doc.body.style.fontSize = 12 * dpr + 'px';
          } else {
              doc.addEventListener('DOMContentLoaded', function(e) {
                  doc.body.style.fontSize = 12 * dpr + 'px';
              }, false);
          }

          refreshRem();
      })(window);

      //字体百分比  结束
    uxLanguage.init();
    uxCurrency.init();
    // Register URI handler, not for mobileApp
    if (!isCordova) {
      uriHandler.register();
    }
    //屏蔽顶部空块
    /*if (nodeWebkit.isDefined()) {
      var gui = require('nw.gui');
      var win = gui.Window.get();
      var nativeMenuBar = new gui.Menu({
        type: "menubar"
      });
      try {
        nativeMenuBar.createMacBuiltin("Intervalue");
      } catch (e) {
        $log.debug('This is not OSX');
      }
      win.menu = nativeMenuBar;
    }*/

    $rootScope.$on('$stateChangeStart', function (event, toState, toParams, fromState, fromParams) {

      if (!profileService.profile && toState.needProfile) {

        // Give us time to open / create the profile
        event.preventDefault();

        if (!profileService.assocVisitedFromStates)
          profileService.assocVisitedFromStates = {};
        breadcrumbs.add('$stateChangeStart no profile from ' + fromState.name + ' to ' + toState.name);
        if (profileService.assocVisitedFromStates[fromState.name] && !fromState.name)
          return breadcrumbs.add("already loading profile, ignoring duplicate $stateChangeStart from " + fromState.name);
        profileService.assocVisitedFromStates[fromState.name] = true;

        // Try to open local profile
        profileService.loadAndBindProfile(function (err) {
          delete profileService.assocVisitedFromStates[fromState.name];
          if (err) {
            if (err.message && err.message.match('NOPROFILE')) {
              $log.debug('No profile... redirecting');
              return $state.transitionTo('create');
            } else if (err.message && err.message.match('NONAGREEDDISCLAIMER')) {
              $log.debug('Display disclaimer... redirecting');
              return $state.transitionTo('disclaimer');
            } else {
              throw new Error(err.message || err); // TODO
            }
          } else {
            $log.debug('Profile loaded ... Starting UX.');
            $rootScope.createdataw = profileService.profile.credentials;
            return $state.transitionTo(toState.name || toState, toParams);
          }
        });
      }

      if (profileService.focusedClient && !profileService.focusedClient.isComplete() && toState.walletShouldBeComplete) {

        $state.transitionTo('copayers');
        event.preventDefault();
      }

      if (!animationService.transitionAnimated(fromState, toState)) {
        event.preventDefault();
        // Time for the backpane to render
        setTimeout(function () {
          $state.transitionTo(toState);
        }, 50);
      }
    });
  });
