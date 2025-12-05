/**
 * Shared Adapter Utilities
 * 
 * Provides centralized adapter access functions to eliminate duplication.
 * 
 * Dependencies: assets/data/constants.js
 * 
 * Exports: window.ziweiAdapterUtils
 */

'use strict';

(function(window) {
    const GLOBAL_KEY = 'ziweiAdapterUtils';
    const constants = window.ziweiConstants || {};
    const MODULE_NAMES = constants.MODULE_NAMES || {};
    const DEBUG = constants.DEBUG?.ADAPTER || false;

    /**
     * Get adapter module by name
     * @param {string} name Module name
     * @returns {Object|null} Module API or null
     */
    function getAdapterModule(name) {
        const adapter = window.ziweiAdapter;
        if (!adapter) {
            return null;
        }
        if (typeof adapter.getModule === 'function') {
            return adapter.getModule(name);
        }
        const modules = adapter.modules || {};
        return modules[name] || null;
    }

    /**
     * Check if adapter has a specific module
     * @param {string} name Module name
     * @returns {boolean}
     */
    function hasAdapterModule(name) {
        const adapter = window.ziweiAdapter;
        if (!adapter) {
            return false;
        }
        if (typeof adapter.hasModule === 'function') {
            return adapter.hasModule(name);
        }
        return !!getAdapterModule(name);
    }

    /**
     * Get adapter instance
     * @returns {Object|null}
     */
    function getAdapter() {
        return window.ziweiAdapter || null;
    }

    /**
     * Get adapter storage
     * @returns {Object|null}
     */
    function getAdapterStorage() {
        const adapter = getAdapter();
        return adapter?.storage || null;
    }

    /**
     * Get adapter settings
     * @returns {Object|null}
     */
    function getAdapterSettings() {
        const adapter = getAdapter();
        return adapter?.settings || null;
    }

    /**
     * Get value from adapter storage
     * @param {string} key Storage key
     * @returns {*} Stored value or null
     */
    function getStorageValue(key) {
        const storage = getAdapterStorage();
        if (!storage || typeof storage.get !== 'function') {
            return null;
        }
        return storage.get(key);
    }

    /**
     * Set value in adapter storage
     * @param {string} key Storage key
     * @param {*} value Value to store
     * @returns {boolean} Success status
     */
    function setStorageValue(key, value) {
        const storage = getAdapterStorage();
        if (!storage || typeof storage.set !== 'function') {
            return false;
        }
        storage.set(key, value);
        return true;
    }

    /**
     * Get setting value from adapter
     * @param {string} name Setting name
     * @returns {*} Setting value or null
     */
    function getSettingValue(name) {
        const settings = getAdapterSettings();
        if (!settings || typeof settings.get !== 'function') {
            return null;
        }
        return settings.get(name);
    }

    /**
     * Register module with adapter (with fallback for early loading)
     * @param {string} name Module name
     * @param {Object} api Module API object
     */
    function registerModule(name, api) {
        if (!name || !api) {
            return;
        }
        const adapter = window.ziweiAdapter;
        if (adapter && typeof adapter.registerModule === 'function') {
            adapter.registerModule(name, api);
        } else {
            // Store in pending queue for data-adapter.js to process later
            window.__ziweiAdapterModules = window.__ziweiAdapterModules || {};
            window.__ziweiAdapterModules[name] = api;
        }
    }

    /**
     * Wrapper settings object that delegates to adapter.settings
     */
    const settings = {
        get: function(key) {
            const adapter = getAdapter();
            if (adapter && adapter.settings && typeof adapter.settings.get === 'function') {
                return adapter.settings.get(key);
            }
            return null;
        },
        set: function(key, value) {
            const adapter = getAdapter();
            if (adapter && adapter.settings && typeof adapter.settings.set === 'function') {
                adapter.settings.set(key, value);
            }
        },
        getAll: function() {
            const adapter = getAdapter();
            if (adapter && adapter.settings && typeof adapter.settings.getAll === 'function') {
                return adapter.settings.getAll();
            }
            return {};
        }
    };

    /**
     * Wrapper storage object that delegates to adapter.storage
     */
    const storage = {
        get: function(key) {
            const adapter = getAdapter();
            if (adapter && adapter.storage && typeof adapter.storage.get === 'function') {
                return adapter.storage.get(key);
            }
            return null;
        },
        set: function(key, value) {
            const adapter = getAdapter();
            if (adapter && adapter.storage && typeof adapter.storage.set === 'function') {
                adapter.storage.set(key, value);
            }
        },
        remove: function(key) {
            const adapter = getAdapter();
            if (adapter && adapter.storage && typeof adapter.storage.remove === 'function') {
                adapter.storage.remove(key);
            }
        }
    };

    // Export public API
    window[GLOBAL_KEY] = {
        getModule: getAdapterModule,
        hasModule: hasAdapterModule,
        getAdapter,
        getStorage: getAdapterStorage,
        getSettings: getAdapterSettings,
        getStorageValue,
        setStorageValue,
        getSettingValue,
        registerModule,
        settings,
        storage
    };

    // Also expose as global helper for backward compatibility
    window.getAdapterModule = getAdapterModule;
    window.registerAdapterModule = registerModule;

    if (DEBUG) {
        console.log('[ziweiAdapterUtils] Module loaded');
    }
})(window);