'use strict';

angular.module('copayApp.controllers').controller('walletnameaController',
    function($rootScope, $scope, $timeout, profileService, go, gettext, gettextCatalog, $state, $stateParams, isCordova, notification, storageService,lodash,$log) {

        var self = this;
        self.showconfirm = false;
        var delete_msg = gettextCatalog.getString('Are you sure you want to delete this wallet?');
        var accept_msg = gettextCatalog.getString('Accept');
        var cancel_msg = gettextCatalog.getString('Cancel');
        var confirm_msg = gettextCatalog.getString('Confirm');
        self.walletId = $stateParams.walletId;
        self.name = $stateParams.name;
        self.image = $stateParams.image;
        self.addr = $stateParams.addr;
        self.ammount = $stateParams.ammount;
        self.mnemonic = $stateParams.mnemonic;
        self.mnemonicEncrypted = $stateParams.mnemonicEncrypted;

        self.gobackup = function (walletId, addr, name, image, ammount, mnemonic, mnemonicEncrypted) {
            $state.go('backup', { walletId: walletId, addr: addr, name: name, image: image, ammount:ammount, mnemonic: mnemonic, mnemonicEncrypted: mnemonicEncrypted});
        };
        self.goChangeWalletpassWord = function ( walletId, addr, name, image, ammount, mnemonic, mnemonicEncrypted) {
            $state.go('changeWalletPassWord', {  walletId: walletId, addr: addr, name: name, image: image, ammount:ammount, mnemonic: mnemonic, mnemonicEncrypted: mnemonicEncrypted});
        };

        /**
         * 修改对应钱包名称
         * @param walletId
         */
        self.changeWalletName = function (walletId) {
            var form = $scope.changeName;
            var newWalletName = form.name.$modelValue;
            profileService.setAndStoreFocus(walletId, function() {
                storageService.getProfile(function (err, profile) {
                    if (err) {
                        $rootScope.$emit('Local/DeviceError', err);
                        return;
                    }
                    if (!profile) {
                        breadcrumbs.add('no profile');
                        return cb(new Error('NOPROFILE: No profile'));
                    } else {
                        var profile = profile;
                        for (let item in profile.credentials) {
                            if (profile.credentials[item].walletId == walletId) {
                                profile.credentials[item].walletName = newWalletName;
                                break;
                            }
                        }
                        profileService.unlockFC(null, function (err) {
                            if (err) {
                                $rootScope.$emit('Local/ShowErrorAlert', gettextCatalog.getString('Wrong password'));
                                return;
                            }
                            storageService.storeProfile(profile, function (err) {
                                if (err)
                                    $rootScope.$emit('Local/ShowErrorAlert', +walletId + ":    " + err);
                                profileService.bindProfileOld(profile, function () {

                                });
                                /*profileService.setAndStoreFocus(walletId, function () {

                                })*/
                                //});
                            });
                        });
                    }
                });

            });
            $scope.index.updateTxHistory(3);
        }

        //开始删除钱包
        self.deleteWallet = function(walletId,name) {
            if (profileService.profile.credentials.length === 1 || profileService.getWallets().length === 1)
                return $rootScope.$emit('Local/ShowErrorAlert', gettextCatalog.getString("Can't delete the last remaining wallet"));
            self.showconfirm = true;

        };

        self.truedeleteWallet = function(walletId,name) {
            var walletName = name;
            profileService.setAndStoreFocus(walletId, function () {
                let wc = profileService.walletClients;
                for(let item in wc){
                    if(walletId == item){
                        if(wc[item].credentials.xPrivKeyEncrypted && !wc[item].credentials.xPrivKey){
                            profileService.unlockFC(null, function (err) {
                                if (err) {
                                    $rootScope.$emit('Local/ShowErrorAlert', gettextCatalog.getString('Wrong password'));
                                    return;
                                };
                                profileService.deleteWallet(walletId,name, function(err) {
                                    if (err) {
                                        self.error = err.message || err;
                                    } else {
                                        notification.success(gettextCatalog.getString('Success'), gettextCatalog.getString('The wallet "{{walletName}}" was deleted', {
                                            walletName: walletName
                                        }));
                                        $scope.index.updateTxHistory(3);
                                    }
                                });
                            });
                        }else {
                            profileService.deleteWallet(walletId,name, function(err) {
                                if (err) {
                                    self.error = err.message || err;
                                } else {
                                    notification.success(gettextCatalog.getString('Success'), gettextCatalog.getString('The wallet "{{walletName}}" was deleted', {
                                        walletName: walletName
                                    }));
                                    $scope.index.updateTxHistory(3);
                                }
                            });
                        }
                    }
                }
            });
        };
    });
