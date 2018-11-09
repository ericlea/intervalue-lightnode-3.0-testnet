'use strict';

var constants = require('intervaluecore/constants.js');
var eventBus = require('intervaluecore/event_bus.js');
var breadcrumbs = require('intervaluecore/breadcrumbs.js');
var ValidationUtils = require('intervaluecore/validation_utils.js');

angular.module('copayApp.controllers')
	.controller('walletHomeController', function($http, $scope, $rootScope, $timeout, $window, $state, $stateParams, $filter, $modal, $log, notification, isCordova, profileService, lodash, configService, storageService, gettext, gettextCatalog, nodeWebkit, addressService, confirmDialog, animationService, addressbookService, correspondentListService, newVersion, autoUpdatingWitnessesList, go, aliasValidationService) {
		var self = this;
		var home = this;
        self.infinite_isCmp = false;
        self.showselectwt = false;
		var conf = require('intervaluecore/conf.js');
		//todo delete
		// var chatStorage = require('intervaluecore/chat_storage.js');
		this.protocol = conf.program;
		$rootScope.hideMenuBar = false;
		$rootScope.wpInputFocused = false;
		var config = configService.getSync();
		var configWallet = config.wallet;
		var indexScope = $scope.index;
		$scope.currentSpendUnconfirmed = configWallet.spendUnconfirmed;
		var network = require('intervaluecore/network.js');

		// INIT
		var walletSettings = configWallet.settings;
		this.unitValue = walletSettings.unitValue;
		this.bbUnitValue = walletSettings.bbUnitValue;
		this.unitName = walletSettings.unitName;
		this.bbUnitName = walletSettings.bbUnitName;
		this.unitDecimals = walletSettings.unitDecimals;
		this.isCordova = isCordova;
		this.addresses = [];
		this.isMobile = isMobile.any();
		this.isWindowsPhoneApp = isMobile.Windows() && isCordova;
		this.blockUx = false;
		this.showScanner = false;
		this.isMobile = isMobile.any();
		this.addr = {};
		this.isTestnet = constants.version.match(/t$/);
		this.testnetName = (constants.alt === '2') ? '[NEW TESTNET]' : '[TESTNET]';
		this.exchangeRates = network.exchangeRates;
		self.chat = false;
        self.chatAddress = false;
        self.deviceAddress = '';
		$scope.index.tab = 'walletHome'; // for some reason, current tab state is tracked in index and survives re-instatiations of walletHome.js

		var disablePaymentRequestListener = $rootScope.$on('paymentRequest', function(event, address, amount, asset, recipient_device_address,chat) {
			if(chat){
                self.chat = true;
                self.deviceAddress = recipient_device_address;
			}
			let fc  = profileService.profile;
            if(fc.credentials.length != 1 && chat){
            	self.chatAddress = true;
            }
			console.log('paymentRequest event ' + address + ', ' + amount);
			$rootScope.$emit('Local/SetTab', 'send');
			self.setForm(address, amount, null, asset, recipient_device_address);

			/*var form = $scope.sendPaymentForm;
			if (form.address && form.address.$invalid && !self.blockUx) {
				console.log("invalid address, resetting form");
				self.resetForm();
				self.error = gettext('Could not recognize a valid Intervalue QR Code');
			}*/
		});

		var disablePaymentUriListener = $rootScope.$on('paymentUri', function(event, uri) {
			$timeout(function() {
				$rootScope.$emit('Local/SetTab', 'send');
				self.setForm(uri);
			}, 100);
		});

		var disableAddrListener = $rootScope.$on('Local/NeedNewAddress', function() {
			self.setAddress(true);
		});

		var disableFocusListener = $rootScope.$on('Local/NewFocusedWallet', function() {
			self.addr = {};
			self.resetForm();
		});

		var disableResumeListener = $rootScope.$on('Local/Resume', function() {
			// This is needed then the apps go to sleep
			// looks like it already works ok without rebinding touch events after every resume
			//self.bindTouchDown();
		});

		var disableTabListener = $rootScope.$on('Local/TabChanged', function(e, tab) {
			// This will slow down switch, do not add things here!
			//console.log("tab changed " + tab);
            self.resetForm();
			switch (tab) {
				case 'receive':
					// just to be sure we have an address
					self.setAddress();
					break;
				case 'history':
					$rootScope.$emit('Local/NeedFreshHistory');
					break;
				case 'send':
					self.resetError();
			};
		});

		var disableOngoingProcessListener = $rootScope.$on('Addon/OngoingProcess', function(e, name) {
			self.setOngoingProcess(name);
		});

		function onNewWalletAddress(new_address) {
			console.log("==== NEW ADDRESSS " + new_address);
			self.addr = {};
			self.setAddress();
		}

		eventBus.on("new_wallet_address", onNewWalletAddress);

		$scope.$on('$destroy', function() {
			console.log("walletHome $destroy");
			disableAddrListener();
			disablePaymentRequestListener();
			disablePaymentUriListener();
			disableTabListener();
			disableFocusListener();
			disableResumeListener();
			disableOngoingProcessListener();
			disableClaimTextcoinListener();
			$rootScope.hideMenuBar = false;
			eventBus.removeListener("new_wallet_address", onNewWalletAddress);
		});

		//$rootScope.$apply();


		var accept_msg = gettextCatalog.getString('Accept');
		var cancel_msg = gettextCatalog.getString('Cancel');
		var confirm_msg = gettextCatalog.getString('Confirm');

		$scope.openDestinationAddressModal = function(wallets, address) {
			$rootScope.modalOpened = true;
			var fc = profileService.focusedClient;
			//self.resetForm();

			var ModalInstanceCtrl = function($scope, $modalInstance) {
				$scope.wallets = wallets;
				$scope.editAddressbook = false;
				$scope.addAddressbookEntry = false;
				$scope.selectedAddressbook = {};
				$scope.newAddress = address;
				$scope.addressbook = {
					'address': ($scope.newAddress || ''),
					'label': ''
				};
				$scope.color = fc.backgroundColor;
				$scope.bAllowAddressbook = self.canSendExternalPayment();

				$scope.beforeQrCodeScann = function() {
					$scope.error = null;
					$scope.addAddressbookEntry = true;
					$scope.editAddressbook = false;
				};

				$scope.onQrCodeScanned = function(data, addressbookForm) {
					$timeout(function() {
						var form = addressbookForm;
						if (data && form) {
							data = data.replace(self.protocol + ':', '');
							form.address.$setViewValue(data);
							form.address.$isValid = true;
							form.address.$render();
						}
						$timeout(function () {
                          if(!$rootScope.$$phase) $scope.$apply();
                        },1);

					}, 100);
				};

				$scope.selectAddressbook = function(addr) {
					$modalInstance.close(addr);
				};

				$scope.toggleEditAddressbook = function() {
					$scope.editAddressbook = !$scope.editAddressbook;
					$scope.selectedAddressbook = {};
					$scope.addAddressbookEntry = false;
				};

				$scope.toggleSelectAddressbook = function(addr) {
					$scope.selectedAddressbook[addr] = $scope.selectedAddressbook[addr] ? false : true;
				};

				$scope.toggleAddAddressbookEntry = function() {
					$scope.error = null;
					$scope.addressbook = {
						'address': ($scope.newAddress || ''),
						'label': ''
					};
					$scope.addAddressbookEntry = !$scope.addAddressbookEntry;
				};

				$scope.listEntries = function() {
					$scope.error = null;
                        addressbookService.list(function(err, ab) {
                            if (err) {
                                $scope.error = err;
                                return;
                            }
                            $scope.list = ab;
                            $timeout(function(){
                                $scope.$apply();
                            },100)
                        });

				};

                $scope.add = lodash.debounce(function(addressbook) {
					$scope.error = null;
						addressbookService.add(addressbook, function(err, ab) {
							if (err) {
								$timeout(function () {
                                    $scope.error = err;
                                });
								return;
							}
							$rootScope.$emit('Local/AddressbookUpdated', ab);
							$scope.list = ab;
							$scope.editAddressbook = true;
							$scope.toggleEditAddressbook();
							$timeout(function () {
                                if(!$rootScope.$$phase) $scope.$apply();
                            },1);
						});
				},1000);

				$scope.remove = function(addr) {
					$scope.error = null;
					$timeout(function() {
						addressbookService.remove(addr, function(err, ab) {
							if (err) {
								$scope.error = err;
								return;
							}
							$rootScope.$emit('Local/AddressbookUpdated', ab);
							$scope.list = ab;
							$timeout(function () {
                                if(!$rootScope.$$phase) $scope.$apply();
                            },1);

						});
					}, 100);
				};

				$scope.cancel = function() {
					breadcrumbs.add('openDestinationAddressModal cancel');
					$modalInstance.dismiss('cancel');
				};

				$scope.selectWallet = function(walletId, walletName) {
					//$scope.gettingAddress = true; // this caused a weird hang under cordova if used after pulling "..." drop-up menu in chat
					$scope.selectedWalletName = walletName;
					//$timeout(function() { // seems useless
					//  $scope.$apply();
					//});
					addressService.getAddress(walletId, false, function onGotAddress(err, addr) {
						$scope.gettingAddress = false;

						if (err) {
							self.error = err;
							breadcrumbs.add('openDestinationAddressModal getAddress err: ' + err);
							$modalInstance.dismiss('cancel');
							return;
						}

						$modalInstance.close(addr);
					});
				};
			};

			var modalInstance = $modal.open({
				templateUrl: 'views/modals/destination-address.html',
				windowClass: animationService.modalAnimated.slideUp,
				controller: ModalInstanceCtrl,
			});

			var disableCloseModal = $rootScope.$on('closeModal', function() {
				breadcrumbs.add('openDestinationAddressModal on closeModal');
				modalInstance.dismiss('cancel');
			});

			modalInstance.result.finally(function() {
				$rootScope.modalOpened = false;
				disableCloseModal();
				var m = angular.element(document.getElementsByClassName('reveal-modal'));
				m.addClass(animationService.modalAnimated.slideOutDown);
			});

			modalInstance.result.then(function onDestModalDone(addr) {
				if (addr) {
					self.setToAddress(addr);
				}
			});
		};

		$scope.openSharedAddressDefinitionModal = function(address) {
			$rootScope.modalOpened = true;
			var fc = profileService.focusedClient;

			var ModalInstanceCtrl = function($scope, $modalInstance) {
				$scope.color = fc.backgroundColor;
				$scope.address = address;
				$scope.shared_address_cosigners = indexScope.shared_address_cosigners;

				var walletGeneral = require('intervaluecore/wallet_general.js');
				var walletDefinedByAddresses = require('intervaluecore/wallet_defined_by_addresses.js');
				walletGeneral.readMyAddresses(function(arrMyAddresses) {
					//todo delete
					// walletDefinedByAddresses.readSharedAddressDefinition(address, function(arrDefinition, creation_ts) {
						// walletDefinedByAddresses.readSharedAddressPeerAddresses(address, function(arrPeerAddresses) {
						// 	$scope.humanReadableDefinition = correspondentListService.getHumanReadableDefinition(arrDefinition, arrMyAddresses, [], arrPeerAddresses, true);
						// 	$scope.creation_ts = creation_ts;
						// 	$timeout(function() {
						// 		$scope.$apply();
						// 	});
						// });
					// });
				});

				// clicked a link in the definition
				$scope.sendPayment = function(address, amount, asset) {
					if (asset && indexScope.arrBalances.filter(function(balance) {
							return (balance.asset === asset);
						})
						.length === 0)
						return console.log("i do not own anything of asset " + asset);
					$modalInstance.dismiss('done');
					$timeout(function() {
						indexScope.shared_address = null;
						indexScope.updateAll();
						indexScope.updateTxHistory();
						$rootScope.$emit('paymentRequest', address, amount, asset);
					});
				};

				$scope.cancel = function() {
					breadcrumbs.add('openSharedAddressDefinitionModal cancel');
					$modalInstance.dismiss('cancel');
				};

			};

			var modalInstance = $modal.open({
				templateUrl: 'views/modals/address-definition.html',
				windowClass: animationService.modalAnimated.slideUp,
				controller: ModalInstanceCtrl,
			});

			var disableCloseModal = $rootScope.$on('closeModal', function() {
				breadcrumbs.add('openSharedAddressDefinitionModal on closeModal');
				modalInstance.dismiss('cancel');
			});

			modalInstance.result.finally(function() {
				$rootScope.modalOpened = false;
				disableCloseModal();
				var m = angular.element(document.getElementsByClassName('reveal-modal'));
				m.addClass(animationService.modalAnimated.slideOutDown);
			});

		};

		this.openTxpModal = function(tx, copayers) {
			// deleted, maybe restore from copay sometime later
			// actually, nothing to display here that was not already shown
		};

		this.setAddress = function(forceNew) {
			self.addrError = null;
			var fc = profileService.focusedClient;
			if (!fc)
				return;

			// Address already set?
			if (!forceNew && self.addr[fc.credentials.walletId])
				return;

			if (indexScope.shared_address && forceNew)
				throw Error('attempt to generate for shared address');

			if (fc.isSingleAddress && forceNew)
				throw Error('attempt to generate for single address wallets');

			self.generatingAddress = true;
			$timeout(function() {
				addressService.getAddress(fc.credentials.walletId, forceNew, function(err, addr) {
					self.generatingAddress = false;

					if (err) {
						self.addrError = err;
					}
					else {
						if (addr)
							self.addr[fc.credentials.walletId] = addr;
					}

					$timeout(function() {
                        if(!$rootScope.$$phase) $scope.$apply();
					},1);
				});
			});
		};

		this.copyAddress = function(addr) {
			if (isCordova) {
				window.cordova.plugins.clipboard.copy(addr);
				window.plugins.toast.showShortCenter(gettextCatalog.getString('Copied to clipboard'));
			}
			else if (nodeWebkit.isDefined()) {
				nodeWebkit.writeToClipboard(addr);
			}
		};

		this.shareAddress = function(addr) {
			if (isCordova) {
				if (isMobile.Android() || isMobile.Windows()) {
					window.ignoreMobilePause = true;
				}
				window.plugins.socialsharing.shareWithOptions({message: "My intervalue address " + self.protocol +  ':' + addr, subject: "My intervalue address"/*, url: self.protocol +  ':' + addr*/}, function(){}, function(){});
			}
		};

		this.openCustomizedAmountModal = function(addr) {
			$rootScope.modalOpened = true;
			var self = this;
			var fc = profileService.focusedClient;
			var ModalInstanceCtrl = function($scope, $modalInstance) {
				$scope.addr = addr;
				$scope.color = fc.backgroundColor;
				$scope.unitName = self.unitName;
				$scope.unitValue = self.unitValue;
				$scope.unitDecimals = self.unitDecimals;
				$scope.bbUnitValue = walletSettings.bbUnitValue;
				$scope.bbUnitName = walletSettings.bbUnitName;
				$scope.isCordova = isCordova;
				$scope.buttonLabel = gettextCatalog.getString('Generate QR Code');
				$scope.protocol = conf.program;

				Object.defineProperty($scope, "_customAmount", {
					get: function() {
						return $scope.customAmount;
					},
					set: function(newValue) {
						$scope.customAmount = newValue;
					},
					enumerable: true,
					configurable: true
				});

				$scope.submitForm = function(form) {
					if ($scope.index.arrBalances.length === 0)
						return console.log('openCustomizedAmountModal: no balances yet');
					var amount = form.amount.$modelValue;
					var assetInfo = $scope.index.arrBalances[$scope.index.assetIndex];
					var asset = assetInfo.asset;
					if (!asset)
						throw Error("no asset");
					var amountInSmallestUnits = profileService.getAmountInSmallestUnits(amount, asset);
					$timeout(function() {
						$scope.customizedAmountUnit =
							amount + ' ' + ((asset === 'base') ? $scope.unitName : (asset === constants.BLACKBYTES_ASSET ? $scope.bbUnitName : (assetInfo.name || 'of ' + asset)));
						$scope.amountInSmallestUnits = amountInSmallestUnits;
						$scope.asset_param = (asset === 'base') ? '' : '&asset=' + encodeURIComponent(asset);
					}, 1);
				};

				$scope.shareAddress = function(uri) {
					if (isCordova) {
						if (isMobile.Android() || isMobile.Windows())
							window.ignoreMobilePause = true;
						window.plugins.socialsharing.share(uri, null, null, null);
					}
				};

				$scope.cancel = function() {
					breadcrumbs.add('openCustomizedAmountModal: cancel');
					$modalInstance.dismiss('cancel');
				};
			};

			var modalInstance = $modal.open({
				templateUrl: 'views/modals/customized-amount.html',
				windowClass: animationService.modalAnimated.slideUp,
				controller: ModalInstanceCtrl,
				scope: $scope
			});

			var disableCloseModal = $rootScope.$on('closeModal', function() {
				breadcrumbs.add('openCustomizedAmountModal: on closeModal');
				modalInstance.dismiss('cancel');
			});

			modalInstance.result.finally(function() {
				$rootScope.modalOpened = false;
				disableCloseModal();
				var m = angular.element(document.getElementsByClassName('reveal-modal'));
				m.addClass(animationService.modalAnimated.slideOutDown);
			});
		};

		this.openClaimTextcoinModal = function(addr) {
			$rootScope.modalOpened = true;
			var fc = profileService.focusedClient;
			var ModalInstanceCtrl = function($scope, $modalInstance) {
				$scope.color = fc.backgroundColor;
				$scope.buttonLabel = gettextCatalog.getString('Claim funds');

				$scope.submitForm = function(form) {
					$modalInstance.close(form.mnemonic.$modelValue);
				};

				$scope.cancel = function() {
					breadcrumbs.add('openCustomizedAmountModal: cancel');
					$modalInstance.dismiss('cancel');
				};
			};

			var modalInstance = $modal.open({
				templateUrl: 'views/modals/claim-textcoin.html',
				windowClass: animationService.modalAnimated.slideUp,
				controller: ModalInstanceCtrl,
				scope: $scope
			});

			var disableCloseModal = $rootScope.$on('closeModal', function() {
				breadcrumbs.add('openClaimTextcoinModal: on closeModal');
				modalInstance.dismiss('cancel');
			});

			modalInstance.result.finally(function(val) {
				$rootScope.modalOpened = false;
				disableCloseModal();
				var m = angular.element(document.getElementsByClassName('reveal-modal'));
				m.addClass(animationService.modalAnimated.slideOutDown);
			});

			modalInstance.result.then(function(mnemonic) {
				if (mnemonic) {
					claimTextCoin(mnemonic, addr);
				}
			});
		};

		function claimTextCoin(mnemonic, addr) {
			var wallet = require('intervaluecore/wallet.js');
			$rootScope.$emit('process_status_change', 'claiming', true);
			//todo delete
			// wallet.receiveTextCoin(mnemonic, addr, function(err, unit, asset) {
			// 	$timeout(function() {
			// 		$rootScope.$emit('closeModal');
			// 		if (err) {
			// 			if (err.indexOf("not confirmed") !== -1) {
			// 				store_mnemonic_back();
			// 			}
			// 			$rootScope.$emit('process_status_change', 'claiming', false);
			// 			return $rootScope.$emit('Local/ShowErrorAlert', err);
			// 		}
			// 		if (asset) {
			// 			var disableBalanceListener = $rootScope.$on('Local/BalanceUpdated', function(assocBalances) {
			// 				var assetIndex = lodash.findIndex(indexScope.arrBalances, {
			// 					asset: asset
			// 				});
			// 				indexScope.assetIndex = assetIndex;
			// 				indexScope.updateTxHistory();
			// 				$rootScope.$emit('Local/SetTab', 'history', null, true);
			// 				disableBalanceListener();
			// 			});
			// 			indexScope.updateAll();
			// 		} else {
			// 			indexScope.assetIndex = 0;
			// 			indexScope.updateAll({triggerTxUpdate: true});
			// 			$rootScope.$emit('Local/SetTab', 'history', null, true);
			// 		}
			// 		$scope.$apply();
			// 		$rootScope.$emit('process_status_change', 'claiming', false);
			// 	});
			// });
		}
	
		var disableClaimTextcoinListener = $rootScope.$on('claimTextcoin', function(event, mnemonic) {
			breadcrumbs.add("received claimTextcoin event with mnemonic: " + mnemonic.substr(0, 10) + "...");
			var addr = self.addr[profileService.focusedClient.credentials.walletId];
			if (addr) {
				claimTextCoin(mnemonic, addr);
			} else {
				addressService.getAddress(profileService.focusedClient.credentials.walletId, false, function(err, addr) {
					if (addr) {
						self.addr[profileService.focusedClient.credentials.walletId] = addr;
						claimTextCoin(mnemonic, addr);
					}

					$timeout(function() {
                        if(!$rootScope.$$phase) $scope.$apply();
					},1);
				});
			}
		});

		// Send 

		var unwatchSpendUnconfirmed = $scope.$watch('currentSpendUnconfirmed', function(newVal, oldVal) {
			if (newVal == oldVal) return;
			$scope.currentSpendUnconfirmed = newVal;
		});

		$scope.$on('$destroy', function() {
			unwatchSpendUnconfirmed();
		});

		this.resetError = function() {
			this.error = this.success = null;
		};

		this.bindTouchDown = function(tries) {
			var self = this;
			tries = tries || 0;
			if (tries > 5) return;
			var e = document.getElementById('menu-walletHome');
			if (!e) return $timeout(function() {
				self.bindTouchDown(++tries);
			}, 500);

			// on touchdown elements
			$log.debug('Binding touchstart elements...');
			['hamburger', 'menu-walletHome', 'menu-send', 'menu-receive', 'menu-history'].forEach(function(id) {
				var e = document.getElementById(id);
				if (e) e.addEventListener('touchstart', function() {
					try {
						event.preventDefault();
					}
					catch (e) {};
					$timeout(function(){
						angular.element(e).triggerHandler('click');
					});
				}, true);
			});
		}

		this.hideMenuBar = lodash.debounce(function(hide) {
			if (hide) {
				$rootScope.hideMenuBar = true;
				this.bindTouchDown();
			}
			else {
				$rootScope.hideMenuBar = false;
			}
			$timeout(function(){
                if(!$rootScope.$$phase) $rootScope.$apply();
			},1);
		}, 100);

		this.formFocus = function(what) {
			if (isCordova && !this.isWindowsPhoneApp) {
				this.hideMenuBar(what);
			}
			if (!this.isWindowsPhoneApp) return

			if (!what) {
				this.hideAddress = false;
				this.hideAmount = false;

			}
			else {
				if (what == 'amount') {
					this.hideAddress = true;
				}
				else if (what == 'msg') {
					this.hideAddress = true;
					this.hideAmount = true;
				}
			}
			$timeout(function() {
                if(!$rootScope.$$phase) $rootScope.$apply();
			}, 1);
		};

		this.setSendPaymentFormInputs = function() {
			/**
			 * Setting the two related amounts as properties prevents an infinite
			 * recursion for watches while preserving the original angular updates
			 *
			 */
			Object.defineProperty($scope,
				"_amount", {
					get: function() {
						return $scope.__amount;
					},
					set: function(newValue) {
						$scope.__amount = newValue;
						self.resetError();
					},
					enumerable: true,
					configurable: true
				});

			Object.defineProperty($scope,
				"_address", {
					get: function() {
						return $scope.__address;
					},
					set: function(newValue) {
						$scope.__address = self.onAddressChange(newValue);
					},
					enumerable: true,
					configurable: true
				});

			var fc = profileService.focusedClient;
			// ToDo: use a credential's (or fc's) function for this
			this.hideNote = true;
		};

		this.setSendError = function(err) {
			var fc = profileService.focusedClient;
			var prefix =
				fc.credentials.m > 1 ? gettextCatalog.getString('Could not create payment proposal') : gettextCatalog.getString('Could not send payment');

			this.error = prefix + ": " + err;
			console.log(this.error);

			$timeout(function() {
                if(!$rootScope.$$phase) $scope.$apply();
			}, 1);
		};

		this.setOngoingProcess = function(name) {
			var self = this;
			self.blockUx = !!name;

			if (isCordova) {
				if (name) {
					window.plugins.spinnerDialog.hide();
					window.plugins.spinnerDialog.show(null, name + '...', true);
				}
				else {
					window.plugins.spinnerDialog.hide();
				}
			}
			else {
				self.onGoingProcess = name;
				$timeout(function() {
                    if(!$rootScope.$$phase) $rootScope.$apply();
				},1);
			};
		};

		function getShareMessage(amount, mnemonic, asset) {
			var usd_amount_str = "";
			var is_private = (asset == constants.BLACKBYTES_ASSET);
			if (!asset || asset == "base" || asset == constants.BLACKBYTES_ASSET) {
				var pair = asset == constants.BLACKBYTES_ASSET ? "GBB_USD" : "GBYTE_USD";
				if (network.exchangeRates[pair]) {
					usd_amount_str = " (≈" + ((amount/1e9)*network.exchangeRates[pair]).toLocaleString([], {maximumFractionDigits: 2}) + " USD)";
				}
				amount = (amount/1e9).toLocaleString([], {maximumFractionDigits: 9});
				asset = asset == constants.BLACKBYTES_ASSET ? "GBB" : "GB";
			} else {
				//indexScope.arrBalances[$scope.index.assetIndex]
				var assetInfo = lodash.find(indexScope.arrBalances, function(balance){return balance.asset == asset});
				if (assetInfo && assetInfo.name) {
					asset = assetInfo.name;
					amount /= Math.pow(10, assetInfo.decimals);
				}
				if (assetInfo)
					is_private = assetInfo.is_private;
			}
			return {
				message: "Here is your " + (is_private ? "file" : "link") + " to receive " + amount + " " + asset + usd_amount_str + (is_private ? ".  If you don't have a Intervalue wallet yet, install it from https://intervalue.org." : (": https://intervalue.org/#textcoin?" + mnemonic)),
				subject: "Intervalue user beamed you money"
			}
		}

		this.openShareTextcoinModal = function(addr, mnemonic, amount, asset, isResend, filePath) {
			if (!addr && isCordova) {
				if (isMobile.Android() || isMobile.Windows()) {
					window.ignoreMobilePause = true;
				}
				var removeFile = function() {

				}
				window.plugins.socialsharing.shareWithOptions(lodash.assign(getShareMessage(amount, mnemonic, asset), {files: [filePath]}), removeFile, removeFile);
				return;
			}
			if (filePath)
				return;
			var msg = getShareMessage(amount, mnemonic, asset);
			var text = msg.message;
			var subject = msg.subject;
			$rootScope.modalOpened = true;
			var fc = profileService.focusedClient;
			var ModalInstanceCtrl = function($scope, $modalInstance) {
				$scope.color = fc.backgroundColor;
				$scope.buttonLabel = gettextCatalog.getString((isResend ? 're' : '' ) + 'send email');
				$scope.isCordova = isCordova;
				$scope.address = addr;
				$scope.mnemonic = mnemonic;
				$scope.text = text;
				$scope.subject = subject;
				$scope.isResend = isResend;
				$scope.filePath = filePath;

				$scope.shareToEmail = function() {
					window.plugins.socialsharing.shareViaEmail(text, subject, [addr]);
					$modalInstance.close();
				};

				$scope.cancel = function() {
					breadcrumbs.add('openShareTextcoinModal: cancel');
					$modalInstance.dismiss('cancel');
				};
			};

			var modalInstance = $modal.open({
				templateUrl: 'views/modals/share.html',
				windowClass: animationService.modalAnimated.slideUp,
				controller: ModalInstanceCtrl,
				scope: $scope
			});

			var disableCloseModal = $rootScope.$on('closeModal', function() {
				breadcrumbs.add('openShareTextcoinModal: on closeModal');
				modalInstance.dismiss('cancel');
			});

			modalInstance.result.finally(function(val) {
				$rootScope.modalOpened = false;
				disableCloseModal();
				var m = angular.element(document.getElementsByClassName('reveal-modal'));
				m.addClass(animationService.modalAnimated.slideOutDown);
			});
		};

		//开始发送交易
		this.submitPayment = function(chat,deviceAddress) {
			 self.chat = chat ;
			 self.deviceAddress = deviceAddress;
            var form = $scope.sendPaymentForm;
            //var obj = JSON.parse(form.$$element[0][0].value);
			if ($scope.index.arrBalances.length === 0)
				return console.log('send payment: no balances yet');
			var fc = profileService.focusedClient;
			var unitValue = this.unitValue;
			var bbUnitValue = this.bbUnitValue;
			if (isCordova && this.isWindowsPhoneApp) {
				this.hideAddress = false;
				this.hideAmount = false;
			}


			var isMultipleSend = !!form.addresses;
			if (!form)
				return console.log('form is gone');
			if (self.bSendAll)
				form.amount.$setValidity('validAmount', true);

			var resetAddressValidation = function(){};
                if ($scope.mtab == 2 && !isMultipleSend && !form.address.$modelValue) { // clicked 'share via message' button
                    resetAddressValidation = function() {
                        if (form && form.address)
                            form.address.$setValidity('validAddressOrAccount', false);
                    }

                }
			form.address.$setValidity('validAddressOrAccount', true);

			if (form.$invalid) {
				this.error = gettext('Unable to send transaction proposal');
				return;
			}
			//通过聊天跳转付款，选择地址后，需要判断
            	if(self.from_walletId != fc.credentials.walletId && typeof self.from_walletId != "undefined" && self.from_walletId != ''){
                    profileService.setAndStoreFocusToPayment(self.from_walletId,function () {
                        if (fc.isPrivKeyEncrypted()) {
                            profileService.unlockFC(null, function (err) {
                                if (err)
                                    return self.setSendError(err.message);
                                return self.submitPayment(self.chat,self.deviceAddress);
                            });
                            return;
                        }
                    });

				}else{
                    if (fc.isPrivKeyEncrypted()) {
                        profileService.unlockFC(null, function(err) {
                            if (err)
                                return self.setSendError(err.message);
                            return self.submitPayment(self.chat,self.deviceAddress);
                        });
                        return;
                    }
				}


			// if (fc.isPrivKeyEncrypted()) {
			// 	profileService.unlockFC(null, function(err) {
			// 		if (err)
			// 			return self.setSendError(err.message);
			// 		return self.submitPayment();
			// 	});
			// 	return;
			// }
/*
			var comment = form.comment.$modelValue;

			// ToDo: use a credential's (or fc's) function for this
			if (comment) {
				var msg = 'Could not add message to imported wallet without shared encrypting key';
				$log.warn(msg);
				return self.setSendError(gettext(msg));
			}*/

			var wallet = require('intervaluecore/wallet.js');
			var assetInfo = $scope.index.arrBalances[$scope.index.assetIndex];
			var asset = assetInfo.asset ? assetInfo.asset : 'base';
			console.log("asset " + asset);
                if (isMultipleSend) {
                    if (assetInfo.is_private)
                        return self.setSendError("private assets can not be sent to multiple addresses");
                    var outputs = [];
                    form.addresses.$modelValue.split('\n').forEach(function(line){
                        var tokens = line.trim().split(/[\s,;]/);
                        var address = tokens[0];
                        var amount = tokens.pop();
                        if (asset === "base")
                            amount *= unitValue;
                        else if (assetInfo.decimals)
                            amount *= Math.pow(10, assetInfo.decimals);
                        amount = Math.round(amount);
                        outputs.push({address: address, amount: +amount});
                    });
                    var current_payment_key = form.addresses.$modelValue.replace(/[^a-zA-Z0-9]/g, '');
                } else {
                    var address = form.address.$modelValue;
                    var recipient_device_address = assocDeviceAddressesByPaymentAddress[address];
                    var amount = form.amount.$modelValue;
                    // address can be [bytreball_addr, email, account, empty => social sharing]
                    var accountValidationResult = aliasValidationService.validate(address);
                    var isEmail = ValidationUtils.isValidEmail(address);
                    var isTextcoin = (isEmail || !address);

                    var original_address;  // might be sent to email if the email address is attested
                    if (isTextcoin)
                        address = "textcoin:" + (address ? address : (Date.now() + "-" + amount));
                    if (asset === "base")
                        amount *= unitValue;
                    else if (asset === constants.BLACKBYTES_ASSET)
                        amount *= bbUnitValue;
                    else if (assetInfo.decimals)
                        amount *= Math.pow(10, assetInfo.decimals);
                    amount = Math.round(amount);

                    var current_payment_key = '' + asset + address + amount;
                }
                var merkle_proof = '';
                if (form.merkle_proof && form.merkle_proof.$modelValue)
                    merkle_proof = form.merkle_proof.$modelValue.trim();

                if (current_payment_key === self.current_payment_key)
                    return $rootScope.$emit('Local/ShowErrorAlert', "This payment is already under way");
                self.current_payment_key = current_payment_key;

			//indexScope.setOngoingProcess(gettext('sending'), true);
			$timeout(function() {
                if (!isMultipleSend && accountValidationResult.isValid) { // try to replace validation result with attested BB address
                    var attestorKey = accountValidationResult.attestorKey;
                    var account = accountValidationResult.account;
                    var bb_address = aliasValidationService.getBbAddress(
                        attestorKey,
                        account
                    );
                    console.log('attestorKey=' + attestorKey + ' : account=' + account + ' : bb_address=' + bb_address);

                    if (!bb_address) {
                        return aliasValidationService.resolveValueToBbAddress(
                            attestorKey,
                            account,
                            function () {
                                // assocBbAddresses in aliasValidationService is now filled
                                delete self.current_payment_key;
                                self.submitPayment();
                            }
                        );
                    }

                    if (!isEmail) {

                        if (bb_address === 'unknown' || bb_address === 'none') {
                            if (bb_address === 'unknown') {
                                aliasValidationService.deleteAssocBbAddress(
                                    attestorKey,
                                    account
                                );
                            }

                            delete self.current_payment_key;
                            //indexScope.setOngoingProcess(gettext('sending'), false);
                            return self.setSendError('Attested account not found');
                        } else if (ValidationUtils.isValidAddress(bb_address)) {
                            original_address = address;
                            address = bb_address;
                            isEmail = false;
                            isTextcoin = false;
                        } else {
                            throw Error("unrecognized bb_address: " + bb_address);
                        }

                    } else {

                        if (bb_address === 'unknown') {
                            aliasValidationService.deleteAssocBbAddress(
                                attestorKey,
                                account
                            ); // send textcoin now but retry next time
                        } else if (bb_address === 'none') {
                            // go on to send textcoin
                        } else if (ValidationUtils.isValidAddress(bb_address)) {
                            original_address = account;
                            address = bb_address;
                            isEmail = false;
                            isTextcoin = false;
                        } else {
                            throw Error("unrecognized bb_address: " + bb_address);
                        }

                    }
                }
				profileService.requestTouchid(function(err) {
					if (err) {
						profileService.lockFC();
						//indexScope.setOngoingProcess(gettext('sending'), false);
						self.error = err;
						$timeout(function() {
							delete self.current_payment_key;
                            if(!$rootScope.$$phase) $scope.$apply();
						}, 1);
						return;
					}

					if (self.binding) {
						if (isTextcoin) {
							delete self.current_payment_key;
							//indexScope.setOngoingProcess(gettext('sending'), false);
							return self.setSendError("you can send bound payments to intervalue adresses only");
						}
						if (!recipient_device_address)
							throw Error('recipient device address not known');
					}
					else
						composeAndSend(address);

					// compose and send
                    var from_address ;
					function composeAndSend(to_address) {
                        var arrSigningDeviceAddresses = []; // empty list means that all signatures are required (such as 2-of-2)
                        if (fc.credentials.m < fc.credentials.n)
                            $scope.index.copayers.forEach(function (copayer) {
                                if (copayer.me || copayer.signs)
                                    arrSigningDeviceAddresses.push(copayer.device_address);
                            });
                        else if (indexScope.shared_address)
                            arrSigningDeviceAddresses = indexScope.copayers.map(function (copayer) {
                                return copayer.device_address;
                            });
                        breadcrumbs.add('sending payment in ' + asset);
                        profileService.bKeepUnlocked = true;
                        var isHot = fc.credentials.xPrivKey ? 0 : 1;//判断冷热钱包,0为普通钱包，1为热钱包

						 require('intervaluecore/wallet').readAddressByWallet(fc.credentials.walletId,function (cb) {
                                from_address = cb;
                             var opts = {
                                 shared_address: from_address ? from_address: '',
                                 merkle_proof: merkle_proof,
                                 asset: asset,
                                 do_not_email: true,
                                 send_all: self.bSendAll,
                                 arrSigningDeviceAddresses: arrSigningDeviceAddresses,
                                 recipient_device_address: recipient_device_address,
                                 isHot: isHot,
                                 xPrivKey: fc.credentials.xPrivKey,
								 walletId: fc.credentials.walletId,
								 deviceAddress : self.deviceAddress ? self.deviceAddress: ''
                             };
                             if (!isMultipleSend) {
                                 opts.to_address = to_address;
                                 opts.amount = amount;
                             } else {
                                 if (asset !== "base")
                                     opts.asset_outputs = outputs;
                                 else
                                     opts.base_outputs = outputs;
                             }
                             var filePath;
                             if (assetInfo.is_private) {
                                 opts.getPrivateAssetPayloadSavePath = function (cb) {
                                     self.getPrivatePayloadSavePath(function (fullPath, cordovaPathObj) {
                                         filePath = fullPath ? fullPath : (cordovaPathObj ? cordovaPathObj.root + cordovaPathObj.path + '/' + cordovaPathObj.fileName : null);
                                         cb(fullPath, cordovaPathObj);
                                     });
                                 };
                             }
                             if (opts.isHot == 1 ) {//热钱包
                                 //生成未签名的交易信息
                                 var wallet = require('intervaluecore/wallet.js');
                                 wallet.readAddressByWallet(fc.credentials.walletId, function (objAddr) {
                                     opts.change_address = objAddr;
                                     var shadowWallet = require('intervaluecore/shadowWallet');
                                     shadowWallet.getTradingUnit(opts, function (obj) {
                                         if(typeof obj == "object"){
                                             $rootScope.$emit('Local/unsignedTransactionIfo', obj);
                                         }else {
                                             console.log("error: "+obj);
                                             return self.setSendError(gettextCatalog.getString(obj));
                                         }

                                     });
                                     $timeout(function () {
                                         delete self.current_payment_key;
                                         resetAddressValidation();
                                         profileService.bKeepUnlocked = false;
                                         self.resetForm();
                                     },1000);

                                 });
                                 return;
                             }

                             fc.sendMultiPayment(opts, function(err, unit, mnemonics) {
                                 // if multisig, it might take very long before the callback is called
                                 //indexScope.setOngoingProcess(gettext('sending'), false);
                                 breadcrumbs.add('done payment in ' + asset + ', err=' + err);
                                 delete self.current_payment_key;
                                 resetAddressValidation();
                                 profileService.bKeepUnlocked = false;
                                 if (err) {
                                    if (typeof err === 'object') {
                                         err = JSON.stringify(err);
                                         eventBus.emit('nonfatal_error', "error object from sendMultiPayment: " + err, new Error());
                                     }
                                    else if (err.match(/device address/))
                                         err = "This is a private asset, please send it only by clicking links from chat";
                                    else if (err.match(/no funded/))
                                         err = gettextCatalog.getString("Not enough spendable funds, make sure all your funds are confirmed");
                                    else if (err.match(/authentifier verification failed/))
                                         err = "Check that smart contract conditions are satisfied and signatures are correct";
									else if (err.match(/precommit/))
										 err = err.replace('precommit callback failed: ', '');
									else if (err.match(/is same/))
                                         err = gettextCatalog.getString("to_address and from_address is same");
                                    else if (err.match(/network error/))
                                        err = gettextCatalog.getString("network error,please try again.");
                                    else if (err.match(/not enough spendable/))
                                        err = gettextCatalog.getString("not enough spendable");
                                     return self.setSendError(err);
                                 }
                                 var binding = self.binding;
                                 if(self.chat){
                                      let tranMessage = gettextCatalog.getString('Transferred: ')+form.amount.$modelValue+' INVE';
                                      $rootScope.$emit('Local/paymentDoneAndSendMessage',self.deviceAddress,tranMessage);

                                 }else {
                                     $rootScope.$emit('Local/paymentDone');
								 }
                                 //  eventBus.on("chat_transfer_notification",function (deviceAddress,transactionId) {
								 // 		alert(deviceAddress);
                                 //      	alert(transactionId);
                                 // });
                                 self.resetForm();


                                 //$rootScope.$emit('Local/WalletImported', fc.credentials.walletId);
                                 //$rootScope.$emit('Local/TabChanged', 'history');
                             });
						 });
					}

				});
			}, 100);
		};

		setInterval(function () {
			let light = require('intervaluecore/light');
            let device = require('intervaluecore/device');
             light.findPendingWithChat().then(function (resolve,reject) {
                 for(let item in  resolve){
                 	if(resolve[item].result == 'good'){
                        let tranMessage = gettextCatalog.getString('Successfully transferred: ') + resolve[item].amount/1000000 + ' INVE';
                        //$rootScope.$emit('Local/paymentDoneAndSendMessage', resolve[item].device, tranMessage);
						//$rootScope.sendMessage(resolve[item].device, tranMessage);
						let deviceAddress = resolve[item].device;
                            $scope.message = tranMessage;
                            //alert($scope.message);
                            var message = lodash.clone($scope.message); // save in var as $scope.message may disappear while we are sending the message over the network
                            $scope.message = '';
                            //alert(correspondent.device_address);
                            let device_address = deviceAddress;
                            let chatType = deviceAddress ? 'transaction':'text';
                            device.sendMessageToDevice(device_address, chatType, message, {
                                //device.sendMessageToDevice('0DOJDKCO6CD2JGWMFEWNHJSFXPQQLRSXW', "text", message, {
                                ifOk: function(){
                                    //$scope.messageEvents.push({bIncoming: false, message: $sce.trustAsHtml($scope.message)});
                                    $scope.autoScrollEnabled = true;
                                    var msg_obj = {
                                        bIncoming: false,
                                        //message: correspondentListService.formatOutgoingMessage(message),
                                        message: correspondentListService.formatOutgoingMessage(message),
                                        timestamp: Math.floor(Date.now() / 1000)
                                    };
                                    correspondentListService.checkAndInsertDate($scope.messageEvents, msg_obj);
                                    $scope.message = '';
                                    $timeout(function(){
                                        $scope.$apply();
                                    });
                                },
                                ifError: function(error){
                                    setOngoingProcess();
                                    setError(error);
                                }
                            });
						device.delDeviceChatTran(resolve[item].id);
                        break;
					}
				 }
             });

        },2 * 1000);

        function setError(error){
            console.log("send error:", error);
            $scope.error = error;
        }


        // setInterval(function () {
        //     let light = require('intervaluecore/light');
        //     let tranId = light.findTranInfoById(key);
        // }, 1 * 1000);

		//---发送交易结束

		$scope.$watch('index.assetIndex', function(newVal, oldVal) {
			$scope.assetIndexSelectorValue = newVal;
			self.switchForms();
		});
		this.switchForms = function() {
			 this.bSendAll = false;
			 if (this.send_multiple && $scope.index.arrBalances[$scope.index.assetIndex] && $scope.index.arrBalances[$scope.index.assetIndex].is_private)
			 	this.lockAmount = this.send_multiple = false;
			if ($scope.assetIndexSelectorValue < 0) {
				this.shownForm = 'data';
			}
			else {
				$scope.index.assetIndex = $scope.assetIndexSelectorValue;
				this.shownForm = 'payment';
			}
			$scope.mtab = $scope.index.arrBalances[$scope.index.assetIndex] && $scope.index.arrBalances[$scope.index.assetIndex].is_private && !this.lockAddress ? 2 : 1;
		}

		this.submitData = function() {
			var objectHash = require('intervaluecore/object_hash.js');
			var fc = profileService.focusedClient;
			var value = {};
			var app;
			switch ($scope.assetIndexSelectorValue) {
				case -1:
					app = "data_feed";
					break;
				case -2:
					app = "attestation";
					break;
				case -3:
					app = "profile";
					break;
				case -4:
					app = "data";
					break;
				default:
					throw new Error("invalid asset selected");
					break;
			}
			var errored = false;
			$scope.home.feedvaluespairs.forEach(function(pair) {
				if (value[pair.name]) {
					self.setSendError("All keys must be unique");
					errored = true;
					return;
				}
				value[pair.name] = pair.value;
			});
			if (errored) return;
			if (Object.keys(value)
				.length === 0) {
				self.setSendError("Provide at least one value");
				return;
			}

			if (fc.isPrivKeyEncrypted()) {
				profileService.unlockFC(null, function(err) {
					if (err)
						return self.setSendError(err.message);
					return self.submitData();
				});
				return;
			}

			profileService.requestTouchid(function(err) {
				if (err) {
					profileService.lockFC();
					indexScope.setOngoingProcess(gettext('sending'), false);
					self.error = err;
					$timeout(function() {
                        if(!$rootScope.$$phase) $scope.$apply();
					}, 1);
					return;
				}

				if (app == "attestation") {
					value = {
						address: $scope.home.attested_address,
						profile: value
					};
				}
				var objMessage = {
					app: app,
					payload_location: "inline",
					payload_hash: objectHash.getBase64Hash(value),
					payload: value
				};
				var arrSigningDeviceAddresses = []; // empty list means that all signatures are required (such as 2-of-2)
				if (fc.credentials.m < fc.credentials.n)
					indexScope.copayers.forEach(function(copayer) {
						if (copayer.me || copayer.signs)
							arrSigningDeviceAddresses.push(copayer.device_address);
					});
				else if (indexScope.shared_address)
					arrSigningDeviceAddresses = indexScope.copayers.map(function(copayer) {
						return copayer.device_address;
					});

				indexScope.setOngoingProcess(gettext('sending'), true);

				fc.sendMultiPayment({
					arrSigningDeviceAddresses: arrSigningDeviceAddresses,
					shared_address: indexScope.shared_address,
					messages: [objMessage]
				}, function(err) { // can take long if multisig
					indexScope.setOngoingProcess(gettext('sending'), false);
					if (err) {
						self.setSendError(err);
						return;
					}
					breadcrumbs.add('done submitting data into feeds ' + Object.keys(value)
						.join(','));
					self.resetDataForm();
					$rootScope.$emit('Local/SetTab', 'history');
				});
			});
		}

		this.resetDataForm = function() {
			this.resetError();
			$scope.home.feedvaluespairs = [{}];
			$timeout(function() {
                if(!$rootScope.$$phase) $rootScope.$apply();
			}, 1);
		};

		var assocDeviceAddressesByPaymentAddress = {};

		this.canSendExternalPayment = function() {
			if ($scope.index.arrBalances.length === 0 || $scope.index.assetIndex < 0) // no balances yet, assume can send
				return true;
			if (!$scope.index.arrBalances[$scope.index.assetIndex]) // no balances yet, assume can send
			 	return true;
			if (!$scope.index.arrBalances[$scope.index.assetIndex].is_private)
			 	return true;
			var form = $scope.sendPaymentForm;
			if (!form || !form.address) // disappeared
				return true;
			var address = form.address.$modelValue;
			var recipient_device_address = assocDeviceAddressesByPaymentAddress[address];
			return !!recipient_device_address;
		};

		this.deviceAddressIsKnown = function() {
			//	return true;
			if ($scope.index.arrBalances.length === 0) // no balances yet
				return false;
			var form = $scope.sendPaymentForm;
			if (!form || !form.address) // disappeared
				return false;
			var address = form.address.$modelValue;
			var recipient_device_address = assocDeviceAddressesByPaymentAddress[address];
			return !!recipient_device_address;
		};

		this.openBindModal = function() {
			$rootScope.modalOpened = true;
			var fc = profileService.focusedClient;
			var form = $scope.sendPaymentForm;
			if (!form || !form.address) // disappeared
				return;
			var address = form.address;

			var ModalInstanceCtrl = function($scope, $modalInstance) {
				$scope.color = fc.backgroundColor;
				$scope.arrPublicAssetInfos = indexScope.arrBalances.filter(function(b) {
						return !b.is_private;
					})
					.map(function(b) {
						var info = {
							asset: b.asset
						};
						if (b.asset === 'base')
							info.displayName = self.unitName;
						else if (b.asset === constants.BLACKBYTES_ASSET)
							info.displayName = self.bbUnitName;
						else if (profileService.assetMetadata[b.asset])
							info.displayName = profileService.assetMetadata[b.asset].name;
						else
							info.displayName = 'of ' + b.asset.substr(0, 4);
						return info;
					});
				$scope.binding = { // defaults
					type: fc.isSingleAddress ? 'data' : 'reverse_payment',
					timeout: 4,
					reverseAsset: 'base',
					feed_type: 'either'
				};
				if (self.binding) {
					$scope.binding.type = self.binding.type;
					$scope.binding.timeout = self.binding.timeout;
					if (self.binding.type === 'reverse_payment') {
						$scope.binding.reverseAsset = self.binding.reverseAsset;
						$scope.binding.reverseAmount = profileService.getAmountInDisplayUnits(self.binding.reverseAmount, self.binding.reverseAsset);
					}
					else {
						$scope.binding.oracle_address = self.binding.oracle_address;
						$scope.binding.feed_name = self.binding.feed_name;
						$scope.binding.feed_value = self.binding.feed_value;
						$scope.binding.feed_type = self.binding.feed_type;
					}
				}
				$scope.oracles = configService.oracles;
				$scope.isSingleAddress = fc.isSingleAddress;

				$scope.cancel = function() {
					$modalInstance.dismiss('cancel');
				};

				$scope.bind = function() {
					var binding = {
						type: $scope.binding.type
					};
					if (binding.type === 'reverse_payment') {
						binding.reverseAsset = $scope.binding.reverseAsset;
						binding.reverseAmount = profileService.getAmountInSmallestUnits($scope.binding.reverseAmount, $scope.binding.reverseAsset);
					}
					else {
						binding.oracle_address = $scope.binding.oracle_address;
						binding.feed_name = $scope.binding.feed_name;
						binding.feed_value = $scope.binding.feed_value;
						binding.feed_type = $scope.binding.feed_type;
					}
					binding.timeout = $scope.binding.timeout;
					self.binding = binding;
					$modalInstance.dismiss('done');
				};

			};

			var modalInstance = $modal.open({
				templateUrl: 'views/modals/bind.html',
				windowClass: animationService.modalAnimated.slideUp,
				controller: ModalInstanceCtrl,
			});

			var disableCloseModal = $rootScope.$on('closeModal', function() {
				modalInstance.dismiss('cancel');
			});

			modalInstance.result.finally(function() {
				$rootScope.modalOpened = false;
				disableCloseModal();
				var m = angular.element(document.getElementsByClassName('reveal-modal'));
				m.addClass(animationService.modalAnimated.slideOutDown);
			});

		};

		this.setToAddress = function(to) {
			var form = $scope.sendPaymentForm;
			if (!form || !form.address) // disappeared?
				return console.log('form.address has disappeared');
			form.address.$setViewValue(to);
			form.address.$isValid = true;
			form.address.$render();
		}

		this.setForm = function(to, amount, comment, asset, recipient_device_address) {
			this.resetError();
			$timeout((function() {
				delete this.binding;
				var form = $scope.sendPaymentForm;
				if (!form || !form.address) // disappeared?
					return console.log('form.address has disappeared');
				if (to) {
					form.address.$setViewValue(to);
					form.address.$isValid = true;
					form.address.$render();
					this.lockAddress = true;
					$scope.mtab = 1;
					if (recipient_device_address) // must be already paired
						assocDeviceAddressesByPaymentAddress[to] = recipient_device_address;
				}

				if (amount) {
					//	form.amount.$setViewValue("" + amount);
					//	form.amount.$isValid = true;
					this.lockAmount = true;
					$timeout(function() {
						form.amount.$setViewValue("" + profileService.getAmountInDisplayUnits(amount, asset));
						form.amount.$isValid = true;
						form.amount.$render();
					});
				}
				else {
					this.lockAmount = false;
					form.amount.$pristine = true;
					form.amount.$setViewValue('');
					form.amount.$render();
				}
				//	form.amount.$render();

				if (form.merkle_proof) {
					form.merkle_proof.$setViewValue('');
					form.merkle_proof.$render();
				}
				if (comment) {
					form.comment.$setViewValue(comment);
					form.comment.$isValid = true;
					form.comment.$render();
				}

				if (asset) {
					var assetIndex = lodash.findIndex($scope.index.arrBalances, {
						asset: asset
					});
					if (assetIndex < 0)
						throw Error("failed to find asset index of asset " + asset);
					$scope.index.assetIndex = assetIndex;
					this.lockAsset = true;
				}
				else
					this.lockAsset = false;
			}).bind(this), 1);
		};

		this.resetForm = function() {
            var self = this;
			this.resetError();
			delete this.binding;

			this.lockAsset = false;
			this.lockAddress = false;
			this.lockAmount = false;
			this.hideAdvSend = true;
			this.send_multiple = false;
			this.current_payment_key = '';
			self.chat = false;
            self.chatAddress = false;
			self.from_walletId = '';
			self.from_image = '';
			self.from_stables = '';
            self.deviceAddress = '';
			$scope.currentSpendUnconfirmed = configService.getSync()
				.wallet.spendUnconfirmed;

			this._amount = this._address = null;
			this.bSendAll = false;

			var form = $scope.sendPaymentForm;


			$timeout(function() {
				if (form && form.amount) {
					form.amount.$pristine = true;
					form.amount.$setViewValue('');
					if (form.amount)
						form.amount.$render();

					if (form.merkle_proof) {
						form.merkle_proof.$setViewValue('');
						form.merkle_proof.$render();
					}
					if (form.comment) {
						form.comment.$setViewValue('');
						form.comment.$render();
					}
					form.$setPristine();

					if (form.address) {
						form.address.$setPristine();
						form.address.$setViewValue('');
						form.address.$render();
					}
				}
				self.switchForms();
				/*$timeout(function() {
					$rootScope.$apply();
				}, 1);*/
				$timeout(function () {
                    if(!$rootScope.$$phase) $rootScope.$apply();
                },1);

			});
		};

		this.setSendAll = function() {
			var form = $scope.sendPaymentForm;
			if (!form || !form.amount) // disappeared?
				return console.log('form.amount has disappeared');
			var assetInfo = indexScope.arrBalances[indexScope.assetIndex];

				var full_amount = indexScope.ammountTatol.replace(/,/g,'');
				form.amount.$setViewValue('' + full_amount);
				form.amount.$render();

			//console.log('done setsendall')
			/*$timeout(function() {
				$rootScope.$apply();
				console.log('-- amount invalid? '+form.amount.$invalid);
				console.log('-- form invalid? '+form.$invalid);
			}, 1);*/
		};

		this.setFromUri = function(uri) {
			var objRequest;
			require('intervaluecore/uri.js')
				.parseUri(uri, {
					ifError: function(err) {},
					ifOk: function(_objRequest) {
						objRequest = _objRequest; // the callback is called synchronously
					}
				});

			if (!objRequest) // failed to parse
				return uri;
			if (objRequest.amount) {
				// setForm() cares about units conversion
				//var amount = (objRequest.amount / this.unitValue).toFixed(this.unitDecimals);
				this.setForm(objRequest.address, objRequest.amount);
			}
			return objRequest.address;
		};

		this.onAddressChange = function(value) {
			this.resetError();
			if (!value) return '';

			if (value.indexOf(self.protocol + ':') === 0)
				return this.setFromUri(value);
			else
				return value;
		};

		// History 

		function strip(number) {
			return (parseFloat(number.toPrecision(12)));
		}

		this.getUnitName = function() {
			return this.unitName;
		};

		this.getPrivatePayloadSavePath = function(cb) {
			var fileName = 'IntervaluePayment-' + $filter('date')(Date.now(), 'yyyy-MM-dd-HH-mm-ss') + '.' + configService.privateTextcoinExt;
			if (!isCordova) {
				var inputFile = document.createElement("input"); 
				inputFile.type = "file";
				inputFile.setAttribute("nwsaveas", fileName);
				inputFile.click();
				var wasCalled = false;
				inputFile.onchange = function() {
					if (wasCalled) return;
					wasCalled = true;
					$timeout(function() {
						cb(inputFile.value ? inputFile.value : null);
						window.removeEventListener('focus', inputFile.onchange, true);
					}, 1000);
				};
				window.addEventListener('focus', inputFile.onchange, true);
			}
			else {
				var root = window.cordova.file.cacheDirectory;//isMobile.iOS() ? window.cordova.file.documentsDirectory : window.cordova.file.externalRootDirectory;
				var path = 'Intervalue';
				cb(null, {root: root, path: path, fileName: fileName});
			}
		};

		this.openTxModal = function(btx) {
			$rootScope.modalOpened = true;
			var self = this;
			var fc = profileService.focusedClient;
			var ModalInstanceCtrl = function($scope, $modalInstance) {
				$scope.btx = btx;
				var assetIndex = lodash.findIndex(indexScope.arrBalances, {
					asset: btx.asset
				});
				$scope.isPrivate = indexScope.arrBalances[assetIndex].is_private;
				$scope.settings = walletSettings;
				$scope.color = fc.backgroundColor;
				$scope.n = fc.credentials.n;
				$scope.exchangeRates = network.exchangeRates;
				$scope.BLACKBYTES_ASSET = constants.BLACKBYTES_ASSET;

				$scope.shareAgain = function() {
					if ($scope.isPrivate) {
						// var indivisible_asset = require('intervaluecore/indivisible_asset');
						var wallet = require('intervaluecore/wallet.js');
						//todo delete
						// indivisible_asset.restorePrivateChains(btx.asset, btx.unit, btx.addressTo, function(arrRecipientChains, arrCosignerChains){
						// 	self.getPrivatePayloadSavePath(function(fullPath, cordovaPathObj){
						// 		if (!fullPath && !cordovaPathObj)
						// 			return;
						// 		var filePath = fullPath ? fullPath : (cordovaPathObj.root + cordovaPathObj.path + '/' + cordovaPathObj.fileName);
						// 		wallet.storePrivateAssetPayload(fullPath, cordovaPathObj, btx.mnemonic, arrRecipientChains, function(err) {
						// 			if (err)
						// 				throw Error(err);
						// 			self.openShareTextcoinModal(btx.textAddress, btx.mnemonic, btx.amount, btx.asset, true, filePath);
						// 		});
						// 	});
						// });
					} else
						self.openShareTextcoinModal(btx.textAddress, btx.mnemonic, btx.amount, btx.asset, true);
				}

				$scope.eraseTextcoin = function() {
					(function(){
						var wallet = require('intervaluecore/wallet.js');
						var ModalInstanceCtrl = function($scope, $modalInstance, $sce) {
							$scope.title = $sce.trustAsHtml(gettextCatalog.getString('Deleting the textcoin will remove the ability to claim it back or resend'));
							$scope.cancel_button_class = 'light-gray outline';
							$scope.loading = false;
							$scope.confirm_label = gettextCatalog.getString('Confirm');

							$scope.ok = function() {
								$scope.loading = true;
								$modalInstance.close(gettextCatalog.getString('Confirm'));

								//todo delete
								// wallet.eraseTextcoin(btx.unit, btx.addressTo);
								
								indexScope.updateTxHistory();
								$rootScope.$emit('Local/SetTab', 'history');
							};
							$scope.cancel = function() {
								$modalInstance.dismiss(gettextCatalog.getString('No'));
							};
						};

						var modalInstance = $modal.open({
							templateUrl: 'views/modals/confirmation.html',
							windowClass: animationService.modalAnimated.slideUp,
							controller: ModalInstanceCtrl
						});

						modalInstance.result.finally(function() {
							var m = angular.element(document.getElementsByClassName('reveal-modal'));
							m.addClass(animationService.modalAnimated.slideOutDown);
						});
					})();
				}


				$scope.getAmount = function(amount) {
					return self.getAmount(amount);
				};

				$scope.getUnitName = function() {
					return self.getUnitName();
				};

				$scope.openInExplorer = function() {
					var testnet = home.isTestnet ? 'testnet' : '';
					var url = 'https://' + testnet + 'explorer.intervalue.org/#' + btx.unit;
					if (typeof nw !== 'undefined')
						nw.Shell.openExternal(url);
					else if (isCordova)
						cordova.InAppBrowser.open(url, '_system');
				};

				$scope.copyAddress = function(addr) {
					if (!addr) return;
					self.copyAddress(addr);
				};

				$scope.getToAddressLabel = function(value) {
					return indexScope.getToAddressLabel(value);
				};
				$scope.getAddressValue = function(value) {
					return indexScope.getAddressValue(value);
				};

				$scope.showCorrespondentList = function() {
					self.showCorrespondentListToReSendPrivPayloads(btx);
				};

				$scope.reSendPrivateMultiSigPayment = function() {
					// var indivisible_asset = require('intervaluecore/indivisible_asset');
					var wallet_defined_by_keys = require('intervaluecore/wallet_defined_by_keys');
					var walletDefinedByAddresses = require('intervaluecore/wallet_defined_by_addresses');
					var fc = profileService.focusedClient;

					function success() {
						$timeout(function() {
							notification.success(gettextCatalog.getString('Success'), gettextCatalog.getString('Private payloads sent', {}));
						});
					}

                    //todo delete
					// indivisible_asset.restorePrivateChains(btx.asset, btx.unit, btx.addressTo, function(arrRecipientChains, arrCosignerChains) {
					// 	if (indexScope.shared_address) {
					// 		walletDefinedByAddresses.forwardPrivateChainsToOtherMembersOfAddresses(arrCosignerChains, [indexScope.shared_address], null, success);
					// 	}
					// 	else {
					// 		wallet_defined_by_keys.forwardPrivateChainsToOtherMembersOfWallets(arrCosignerChains, [fc.credentials.walletId], null, success);
					// 	}
					// });
				};

				$scope.cancel = function() {
					breadcrumbs.add('dismiss tx details');
					try {
						$modalInstance.dismiss('cancel');
					}
					catch (e) {
						//	indexScope.sendBugReport('simulated in dismiss tx details', e);
					}
				};

			};

			var modalInstance = $modal.open({
				templateUrl: 'views/modals/tx-details.html',
				windowClass: animationService.modalAnimated.slideRight,
				controller: ModalInstanceCtrl,
			});

			var disableCloseModal = $rootScope.$on('closeModal', function() {
				breadcrumbs.add('on closeModal tx details');
				modalInstance.dismiss('cancel');
			});

			modalInstance.result.finally(function() {
				$rootScope.modalOpened = false;
				disableCloseModal();
				var m = angular.element(document.getElementsByClassName('reveal-modal'));
				m.addClass(animationService.modalAnimated.slideOutRight);
			});
		};

		this.showCorrespondentListToReSendPrivPayloads = function(btx) {
			$rootScope.modalOpened = true;
			var self = this;
			var fc = profileService.focusedClient;
			var ModalInstanceCtrl = function($scope, $modalInstance, $timeout, go, notification) {
				$scope.btx = btx;
				$scope.settings = walletSettings;
				$scope.color = fc.backgroundColor;

				$scope.readList = function() {
					$scope.error = null;
					correspondentListService.list(function(err, ab) {
						if (err) {
							$scope.error = err;
							return;
						}
						$scope.list = ab;
						$timeout(function(){
                            if(!$rootScope.$$phase) $scope.$apply();
						},1);
					});
				};

				$scope.sendPrivatePayments = function(correspondent) {
					// var indivisible_asset = require('intervaluecore/indivisible_asset');
					var wallet_general = require('intervaluecore/wallet_general');
					//todo delete
					// indivisible_asset.restorePrivateChains(btx.asset, btx.unit, btx.addressTo, function(arrRecipientChains, arrCosignerChains) {
					// 	wallet_general.sendPrivatePayments(correspondent.device_address, arrRecipientChains, true, null, function() {
					// 		modalInstance.dismiss('cancel');
					// 		go.history();
					// 		$timeout(function() {
					// 			notification.success(gettextCatalog.getString('Success'), gettextCatalog.getString('Private payloads sent', {}));
					// 		});
					// 	});
					// });

				};

				$scope.back = function() {
					self.openTxModal(btx);
				};

			};

			var modalInstance = $modal.open({
				templateUrl: 'views/modals/correspondentListToReSendPrivPayloads.html',
				windowClass: animationService.modalAnimated.slideRight,
				controller: ModalInstanceCtrl,
			});

			var disableCloseModal = $rootScope.$on('closeModal', function() {
				modalInstance.dismiss('cancel');
			});

			modalInstance.result.finally(function() {
				$rootScope.modalOpened = false;
				disableCloseModal();
				var m = angular.element(document.getElementsByClassName('reveal-modal'));
				m.addClass(animationService.modalAnimated.slideOutRight);
			});
		};

		this.hasAction = function(actions, action) {
			return actions.hasOwnProperty('create');
		};

		this._doSendAll = function(amount) {
			this.setForm(null, amount, null);
		};

		this.sendAll = function(amount, feeStr) {
			var self = this;
			var msg = gettextCatalog.getString("{{fee}} will be deducted for bitcoin networking fees", {
				fee: feeStr
			});

			confirmDialog.show(msg, function(confirmed) {
				if (confirmed)
					self._doSendAll(amount);
			});
		};

		/* Start setup */

		this.bindTouchDown();
		this.setSendPaymentFormInputs();
		if (profileService.focusedClient && profileService.focusedClient.isComplete()) {
			this.setAddress();
		}

		var store_mnemonic_back = function(){};
		if (isCordova){
			window.plugins.appPreferences.fetch(function(referrer){
				if (referrer) {
					console.log('==== referrer: '+referrer);
					window.plugins.appPreferences.remove(function(){}, function(){}, 'referrer');
					store_mnemonic_back = function() {
						// window.plugins.appPreferences.store(function(){}, function(){}, 'referrer', referrer);
					};
					if (referrer.split('-').length % 3 === 0)
						$rootScope.$emit("claimTextcoin", referrer);
				}
			}, function(){}, "referrer");
		}

        // self.gonewsin = function(id){
        //     $state.go('newsin',{ id: id});
        // };


        $timeout(function () {
        	let fc = profileService.focusedClient;
            self.from_walletName = fc.credentials.walletName;
            self.from_image = fc.image;
            self.from_walletId = fc.credentials.walletId;
            var wallet = require('intervaluecore/wallet.js');
            wallet.readAddressByWallet(fc.credentials.walletId,function (res) {
                self.address = res;
                let walletInfo = $scope.index.walletInfo;
                for(let item in walletInfo){
                    if(walletInfo[item].wallet == fc.credentials.walletId) self.from_stables = walletInfo[item].stables;
                    break;
                }
                $scope.$apply();
            });
        });

		self.findPaymentAddress = function(walletId,stables,walletName,image){
            $scope.showselectwt = false;
			self.from_walletId = walletId;
            self.from_stables = stables;
            self.from_walletName = walletName;
            self.from_image = image;
		}

		self.cancel = function () {
			$rootScope.$emit('Local/paymentDoneAndCallBack',self.deviceAddress);
        }
	});