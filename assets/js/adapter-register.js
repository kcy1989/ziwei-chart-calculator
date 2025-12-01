/**
 * Centralized adapter module registration utility
 * Used by all astrology calculation modules to register their APIs consistently.
 * Handles both immediate registration (if adapter ready) and deferred (pending queue).
 */
window.registerAdapterModule = function(name, api) {
    if (window.ziweiAdapter && typeof window.ziweiAdapter.registerModule === 'function') {
        window.ziweiAdapter.registerModule(name, api);
        return;
    }
    
    // Store in pending queue for data-adapter.js to process later
    window.__ziweiAdapterModules = window.__ziweiAdapterModules || {};
    window.__ziweiAdapterModules[name] = api;
};
