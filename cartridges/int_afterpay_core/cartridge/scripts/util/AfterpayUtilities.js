'use strict';
/* global empty */

var Site = require('dw/system/Site');
var PaymentMgr = require('dw/order/PaymentMgr');
var URLUtils = require('dw/web/URLUtils');
var Locale = require('dw/util/Locale');
var ctrlCartridgeName = dw.system.Site.getCurrent().getCustomPreferenceValue('apControllerCartridgeName');
var app = require(ctrlCartridgeName + '/cartridge/scripts/app');

/**
 *  Site Preferences Utilities
 */
var sitePreferencesUtilities = {

    getRedirectConfirmUrl: function () {
        return URLUtils.https('AfterpayRedirect-HandleResponse').toString();
    },

    getRedirectCancelUrl: function () {
        return URLUtils.https('AfterpayRedirect-HandleResponse').toString();
    },

    getPaymentMode: function () {
        return Site.current.preferences.custom.apPaymentMode;
    },

    isDisplayPdpInfo: function () {
        return Site.getCurrent().getCustomPreferenceValue('apDisplayPdpInfo');
    },

    isDisplayPlpInfo: function () {
        return Site.getCurrent().getCustomPreferenceValue('apDisplayPlpInfo');
    },

    getControllerCartridgeName: function () {
        return Site.getCurrent().getCustomPreferenceValue('apControllerCartridgeName');
    },

    getCaptureTimeout: function () {
        return Site.getCurrent().getCustomPreferenceValue('apCaptureTimeout');
    },

    isAfterpayEnabled: function () {
        return Site.getCurrent().getCustomPreferenceValue('enableAfterpay') || false;
    },

    getBrandSettings: function () {
        return JSON.parse(Site.getCurrent().getCustomPreferenceValue('apBrandSettings'));
    },

    isExpressCheckoutEnabled: function () {
        var expressSuppportedLocales = ['AU', 'US', 'GB', 'NZ', 'CA'];
        var currentLocale = brandUtilities.getCountryCode();
        var isLocaleSupported = expressSuppportedLocales.includes(currentLocale);
        return Site.getCurrent().getCustomPreferenceValue('apEnableExpressCheckout') && isLocaleSupported;
    },

    getExpressCheckoutShippingStrategy: function () {
        return Site.getCurrent().getCustomPreferenceValue('apExpressCheckoutShippingStrategy');
    },
    isExpressCheckoutBuyNowEnabled: function () {
        return Site.getCurrent().getCustomPreferenceValue('apEnableExpressCheckoutBuyNow');
    },
    getExpressCheckoutIntegratedShippingFinalize: function () {
        return Site.getCurrent().getCustomPreferenceValue('apExpressCheckoutIntegratedShippingFinalizeFlow');
    },

    getStorePickupShippingMethodIDs: function () {
        return Site.getCurrent().getCustomPreferenceValue('apStorePickupShippingMethodIDs');
    },
    getStorePickupDescription: function () {
        return Site.getCurrent().getCustomPreferenceValue('apStorePickupDescription');
    },

    isExpressCheckoutPdpEnabled: function () {
    	return Site.getCurrent().getCustomPreferenceValue('apEnableExpressCheckoutPdp');
    }
};

/**
 *  Brand Utilities
 */
var brandUtilities = {
    initBrand: function (locale) {
        var currentLocale = Locale.getLocale(locale);
        var countryCode = currentLocale ? currentLocale.country.toUpperCase() : null;
        var storedCountryCode = this.getCountryCode();
        var brandSettings;
        var brandCountrySetting;
        var isGenerallyApplicable;

        if (countryCode && countryCode !== storedCountryCode) {
            brandSettings = sitePreferencesUtilities.getBrandSettings();

            this.setCountryCode(countryCode);

            if (brandSettings) {
                brandCountrySetting = brandSettings[countryCode];
                isGenerallyApplicable = sitePreferencesUtilities.isAfterpayEnabled();

                if (brandCountrySetting && isGenerallyApplicable) {
                    this.setAfterpayApplicable(true);
                    this.setBrand(brandCountrySetting.brand);
                } else {
                    this.setAfterpayApplicable(false);
                    this.setBrand(null);
                }
            } else {
                this.setAfterpayApplicable(false);
                this.setBrand(null);
            }
        } else if (!countryCode) {
            this.setCountryCode(countryCode);
            this.setAfterpayApplicable(false);
            this.setBrand(null);
        }
    },
    isAfterpayApplicable: function () {
        return session.privacy.afterpayApplicable;
    },
    getBrand: function () {
        return session.privacy.afterpayBrand;
    },
    getCountryCode: function () {
        return session.privacy.afterpayCountry;
    },
    setAfterpayApplicable: function (isApplicable) {
        session.privacy.afterpayApplicable = isApplicable;
    },
    setBrand: function (brand) {
        session.privacy.afterpayBrand = brand;
    },
    setCountryCode: function (countryCode) {
        session.privacy.afterpayCountry = countryCode;
    },
    getBrandSettings: function (countryCode) {
        var brandSettings = sitePreferencesUtilities.getBrandSettings();

        return brandSettings[countryCode || this.getCountryCode()];
    },
    /**
     * @description Returns class specifically for current API version.
     * Basically it checks what is configured API version and returns module named like specified in parentModulePath, but from v1/v2 subfolders
     * e.g. if parentModulePath is "~/cartridge/scripts/order/orderRequestBuilder" and API version configured in apBrandSettings site preference is "2",
     * then function will require "~/cartridge/scripts/order/v2/orderRequestBuilder" module
     * @param {string} parentModulePath - path to an abstract class / parent module on which needed class is based
     * @returns {Function} - constructor of class implementing logic for current API version
     */
    getApiVersionDependentClass: function (parentModulePath) {
        var folders = parentModulePath.split('/');
        var classModuleName = folders.pop();
        var parentFolderPath = folders.join('/');
        var countryCode = this.getCountryCode();
        var brandSettings = this.getBrandSettings(countryCode);

        if (!brandSettings || !brandSettings.versionApi) {
            throw new Error((this.getBrand() || 'Afterpay/Clearpay') +
                ' API version is not defined. Please specify it in apBrandSettings site preference (versionApi property)');
        }

        return require(parentFolderPath + '/v' + brandSettings.versionApi + '/' + classModuleName);
    }
};

/**
 *  Checkout Utilities
 */
var checkoutUtilities = {
    getPaymentMethodName: function () {
        var brandMapping = require('*/cartridge/scripts/brandMapping');
        var BrandUtilities = brandUtilities;

        var brand = BrandUtilities.getBrand();
        var mapping = brandMapping[brand];

        if (mapping) {
            return mapping.paymentMethod;
        }
        return null;
    },

    getPaymentMethod: function () {
        return PaymentMgr.getPaymentMethod(this.getPaymentMethodName());
    },

    getPaymentTransaction: function (lineItemCtnr) {
        var paymentInstrument = this.getPaymentInstrument(lineItemCtnr);
        return paymentInstrument ? paymentInstrument.getPaymentTransaction() : null;
    },

    getPaymentInstrument: function (lineItemCtnr) {
        return lineItemCtnr.getPaymentInstruments(this.getPaymentMethodName())[0];
    },

    getPaymentModeFromOrder: function (order) {
        if (empty(order)) {
            return null;
        }

        var paymentTransaction = this.getPaymentTransaction(order);
        return paymentTransaction.custom.apPaymentMode;
    },

    getPaymentMode: function (order) {
        var paymentMode = this.getPaymentModeFromOrder(order);
        if (empty(paymentMode)) {
            paymentMode = sitePreferencesUtilities.getPaymentMode().value;
        }
        return paymentMode;
    },

    getPaymentResponseCode: function (callResult) {
        var response = (callResult.errorMessage) ? callResult.errorMessage : callResult;

        // eslint-disable-next-line eqeqeq
        if (sitePreferencesUtilities.getPaymentMode() == 'AUTHORISE' && typeof response === 'object') {
            return response.status;
        }

        return response;
    }
};

module.exports = {
    sitePreferencesUtilities: sitePreferencesUtilities,
    checkoutUtilities: checkoutUtilities,
    brandUtilities: brandUtilities
};

var disableSummaryForAfterpay = function (cart, viewContext) {
    var afterpayEnable = sitePreferencesUtilities.isAfterpayEnabled();
    var expressCheckoutEnable = sitePreferencesUtilities.isExpressCheckoutEnabled();
    let isExpressCheckout = require('*/cartridge/scripts/util/afterpaySession').isExpressCheckout();

    var apPaymentInstrument;
    var iter = cart.object.getPaymentInstruments().iterator();

    while (iter.hasNext()) {
        apPaymentInstrument = iter.next();

		// don't disable summary for express checkout when the current order is an express checkout order.
		// Non-express-checkout still skips summary screen
        if ((expressCheckoutEnable && isExpressCheckout) || afterpayEnable == false || apPaymentInstrument.paymentMethod !== 'AFTERPAY' || apPaymentInstrument.paymentMethod !== 'CLEARPAY') {
            app.getView(viewContext).render('checkout/summary/summary');
	    }
    }
};

module.exports.disableSummaryForAfterpay = disableSummaryForAfterpay;

var crc32 = function (str) {
    function utf8_encode(s) {
        return unescape(encodeURIComponent(s));
    }

	// Calculate the crc32 polynomial of a string
    //
    // version: 810.114
    // discuss at: http://phpjs.org/functions/crc32
    // +   original by: Webtoolkit.info (http://www.webtoolkit.info/)
    // +   improved by: T0bsn
    // -    depends on: utf8_encode


    str = utf8_encode(str);
    var table = '00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F 63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC 51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E 7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D 806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA 11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F 30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D';

    var crc = 0;
    var x = 0;
    var y = 0;

    crc ^= (-1);
    for (var i = 0, iTop = str.length; i < iTop; i++) {
        y = (crc ^ str.charCodeAt(i)) & 0xFF;
        x = '0x' + table.substr(y * 9, 8);
        crc = (crc >>> 8) ^ x;
    }

    return crc ^ (-1);
};

module.exports.crc32 = crc32;
