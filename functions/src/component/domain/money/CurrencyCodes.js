"use strict";
exports.__esModule = true;
// using ISO codes: https://en.wikipedia.org/wiki/ISO_4217
var CurrencyCode;
(function (CurrencyCode) {
    CurrencyCode["GBP"] = "GBP";
    CurrencyCode["USD"] = "USD";
    CurrencyCode["AUD"] = "AUD";
    CurrencyCode["CAD"] = "CAD";
    CurrencyCode["EUR"] = "EUR";
    CurrencyCode["CHF"] = "CHF";
})(CurrencyCode = exports.CurrencyCode || (exports.CurrencyCode = {}));
exports.isCurrencyCode = function (value) {
    return Object.values(CurrencyCode).includes(value);
};
