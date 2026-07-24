(function () {
    'use strict';

    var PADDING = '  ';

    function escapeHtml(str) {
        var div = document.createElement('div');
        div.appendChild(document.createTextNode(str));
        return div.innerHTML;
    }

    function formatJson(json, options) {
        try {
            JSON.parse(json);
        } catch (err) {
            return json;
        }

        var formatted = '';
        var pad = 0;
        var reg;

        options = options || {};
        options.newlineBeforeColon = (options.newlineBeforeColon === true);
        options.spaceAfterColon = (options.spaceAfterColon !== false);

        if (typeof json !== 'string') {
            json = JSON.stringify(json);
        } else {
            json = JSON.parse(json);
            json = JSON.stringify(json);
        }

        reg = /([{}])/g;
        json = json.replace(reg, '\r\n$1\r\n');

        reg = /([\[\]])/g;
        json = json.replace(reg, '\r\n$1\r\n');

        reg = /(,)/g;
        json = json.replace(reg, '$1\r\n');

        reg = /(\r\n\r\n)/g;
        json = json.replace(reg, '\r\n');

        reg = /\r\n,/g;
        json = json.replace(reg, ',');

        if (!options.newlineBeforeColon) {
            reg = /:\r\n\{/g;
            json = json.replace(reg, ':{');
            reg = /:\r\n\[/g;
            json = json.replace(reg, ':[');
        }

        if (options.spaceAfterColon) {
            reg = /:/g;
            json = json.replace(reg, ': ');
        }

        json.split('\r\n').forEach(function (node) {
            var i, indent = 0, padding = '';

            if (node.match(/\{$/) || node.match(/\[$/)) {
                indent = 1;
            } else if (node.match(/\}/) || node.match(/\]/)) {
                if (pad !== 0) {
                    pad -= 1;
                }
            } else {
                indent = 0;
            }

            for (i = 0; i < pad; i++) {
                padding += PADDING;
            }

            formatted += padding + node + '\r\n';
            pad += indent;
        });

        var escaped = escapeHtml(formatted);
        var data = '<pre><code class="json">' + escaped + '</code></pre>';

        if (typeof hljs !== 'undefined') {
            data = '<pre><code class="json">' + hljs.highlightAuto(formatted).value + '</code></pre>';
        }

        return data;
    }

    window.formatJson = formatJson;
})();