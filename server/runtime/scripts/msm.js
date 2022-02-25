
/*
* My Script Module: script container, scripts defined in frontend (string code) are to load as function
*/

'use strict';
const path = require('path');

var Module = module.constructor;

// const eventsIncludes = 'var events = require("../events").create();';
const eventsIncludes = 'var events; var id; var console = { log: function (msg) { if (events) events.emit(\'script-console\', { msg: msg, type: \'log\', id: id });}};';
// const eventsIncludes = 'var events = require("../events").create();';// var console = { log: function (msg) { if (events) events.emit(\'script-console\', { msg: msg, type: \'log\' });}}';
const initEvents = { name: 'init', code: 'events = _events; id = _id', parameters: [{ name: '_events' }, { name: '_id' }] };
// const consoleLog = { name: 'console', code: 'log: function (msg) { if (events) events.emit(\'script-console\', { msg: msg, type: \'log\' });}', parameters: [] };
// tempScripts['console.error'] = 'function (msg) { events.emit(\'device-status:changed\', { msg: msg, type: \'error\' }); }';

function MyScriptsModule(_events) {        
    var events = _events;
    var module = new Module();
    var scriptsMap = {};
    var systemFunctions = {};
    var scriptsModule;

    this.init = function (sysfncs) {
        systemFunctions = sysfncs;
    }

    this.loadScripts = function (_scripts) {
        let result = _scriptsToModule(_scripts);
        scriptsModule = result.module;
        scriptsMap = result.scriptsMap;
        return result;
    }

    this.runTestScript = function (_script) {
        // clone scripts and add or replace script to test
        var tempScripts = JSON.parse(JSON.stringify(scriptsMap));
        tempScripts[_script.name] = _script;
        tempScripts[initEvents.name] = initEvents;

        var result = _scriptsToModule(tempScripts, eventsIncludes);
        if (result.module) {
            var paramsValue = _script.parameters.map(p => p.value);
            result.module[initEvents.name](events, _script.outputId);
            result.module[_script.name](...paramsValue);
        }
    }

    var _scriptsToModule = function (_scripts, _includes) {
        let result = { module: null, messages: [], scriptsMap: {} };
        try {
            let functions = '';
            let toexport = '';
            Object.values(_scripts).forEach((script) => {
                try {
                    if (script.code) {
                        var params = '';
                        for (let i = 0; i < script.parameters.length; i++) {
                            if (params.length) params += ',';
                            params += `${script.parameters[i].name}`;
                        }
                        functions += `function ${script.name} (${params}) { ${script.code} } `;
                        toexport += `${script.name}: ${script.name}, `;
                        result.scriptsMap[script.name] = script;
                    } else {
                        logger.warn(`load.script ${script.name} without code!`);
                        result.messages.push(`load.script ${script.name} without code!`);
                    }
                } catch(e) {
                    logger.error(`load.script ${script.name} error: ${(e.stack) ? e.stack : e}`);
                    result.messages.push(`load.script ${script.name} error!`);
                }
            });
            var code = '';
            if (_includes) {
                code = `${_includes}`;
            }
            var code = `${code} ${functions} module.exports = { ${toexport} };`;
            var filename = path.resolve(__dirname, 'msm-scripts.js');
            result.module = _requireFromString(code, filename);

        } catch(ex) {
            logger.error(`load.script error: ${(ex.stack) ? ex.stack : ex}`);
        }
        return result;
    }

    var _requireFromString = function (src, filename) {
        delete require.cache[filename];
        var Module = module.constructor;
        var m = new Module();
        m._compile(src, filename);
        return m.exports;
    }
}

module.exports = {
    create: function (events) {
        return new MyScriptsModule(events);
    }
};