'use strict';

/**
 * 创建Vue实例
 */
var Vm = new Vue({
    el: '#root',
    data: {
        consoleData: [], // 控制台日志
        messageData: [], // 消息记录
        instance: null,
        address: 'ws://127.0.0.1:9501', // 链接地址
        alert: {
            class: 'success',
            state: false,
            content: '',
            timer: undefined
        },
        content: '',
        heartBeatSecond: 1,
        heartBeatContent: 'PING',
        autoSend: false,
        autoTimer: undefined,
        sendClean: false,
        recvClean: false,
        recvDecode: false,
        connected: false,
        recvPause: false
    },
    created: function created () {
        var savedAddress = localStorage.getItem('address');
        if (typeof savedAddress === 'string') {
            this.address = savedAddress;
        }
        window.onerror = function (ev) {
            console.error(ev);
        };
    },
    mounted: function mounted() {
        this.canUseH5WebSocket();
    },
    filters: {
        rStatus: function (value) {
            if (value === undefined || value === null) {
                return '尚未创建';
            }
            switch (value) {
                case 0: return '尚未开启';
                case 1: return '连接成功';
                case 2: return '正在关闭';
                case 3: return '连接关闭';
                default: return '未知状态';
            }
        }
    },
    methods: {
        showTips: function showTips(className, content) {
            var _this = this;
            clearTimeout(this.alert.timer);
            this.alert.state = false;
            this.alert.class = className;
            this.alert.content = content;
            this.alert.state = true;
            this.alert.timer = setTimeout(function () {
                _this.alert.state = false;
            }, 3000);
        },
        autoWsConnect: function () {
            var _this = this;
            try {
                if (this.connected === false) {
                    localStorage.setItem('address', this.address);
                    var wsInstance = new WebSocket(this.address);

                    wsInstance.onopen = function (ev) {
                        console.log(ev);
                        _this.connected = true;
                        _this.instance = wsInstance;
                        var service = wsInstance.url.replace('ws://', '').replace('wss://', '');
                        if (service.charAt(service.length - 1) === '/') {
                            service = service.slice(0, -1);
                        }
                        _this.writeAlert('success', 'OPENED => ' + service);
                    };

                    wsInstance.onclose = function (ev) {
                        console.log(ev);
                        _this.autoSend = false;
                        clearInterval(_this.autoTimer);
                        _this.connected = false;
                        _this.writeAlert('danger', 'CLOSED => ' + _this.closeCode(ev.code));
                    };

                    wsInstance.onerror = function (ev) {
                        console.error(ev);
                        _this.writeConsole('danger', '发生错误 请打开浏览器控制台查看');
                    };

                    wsInstance.onmessage = function (ev) {
                        console.log(ev);
                        if (!_this.recvPause) {
                            var data = ev.data;
                            if (_this.recvDecode) {
                                try {
                                    var parsed = JSON.parse(data);
                                    data = JSON.stringify(parsed, null, 2);
                                } catch (e) {
                                    // 非JSON数据，保持原样
                                }
                            }
                            if (_this.recvClean) {
                                _this.messageData = [];
                            }
                            _this.writeNews(0, data);
                        }
                    };

                    this.instance = wsInstance;
                } else {
                    this.instance.close(1000, 'Active closure of the user');
                }
            } catch (err) {
                console.error(err);
                this.writeAlert('danger', '创建 WebSocket 对象失败 请检查服务器地址');
            }
        },
        autoHeartBeat: function () {
            var _this = this;
            if (_this.autoSend === true) {
                _this.autoSend = false;
                clearInterval(_this.autoTimer);
            } else {
                _this.autoSend = true;
                _this.autoTimer = setInterval(function () {
                    _this.writeConsole('info', '循环发送: ' + _this.heartBeatContent);
                    _this.sendData(_this.heartBeatContent);
                }, _this.heartBeatSecond * 1000);
            }
        },
        writeConsole: function (className, content) {
            this.consoleData.push({
                content: content,
                type: className,
                time: moment().format('HH:mm:ss')
            });
            this.$nextTick(function () {
                Vm.scrollOver(document.getElementById('console-box'));
            });
        },
        writeNews: function (direction, content, callback) {
            if (typeof callback === 'function') {
                content = callback(content);
            }

            this.messageData.push({
                direction: direction,
                content: content,
                time: moment().format('HH:mm:ss')
            });

            this.$nextTick(function () {
                Vm.scrollOver(document.getElementById('message-box'));
            });
        },
        writeAlert: function (className, content) {
            this.writeConsole(className, content);
            this.showTips(className, content);
        },
        canUseH5WebSocket: function () {
            if ('WebSocket' in window) {
                this.writeAlert('success', '初始化完成');
            } else {
                this.writeAlert('danger', '当前浏览器不支持 H5 WebSocket 请更换浏览器');
            }
        },
        closeCode: function (code) {
            var codes = {
                1000: '1000 CLOSE_NORMAL',
                1001: '1001 CLOSE_GOING_AWAY',
                1002: '1002 CLOSE_PROTOCOL_ERROR',
                1003: '1003 CLOSE_UNSUPPORTED',
                1004: '1004 CLOSE_RETAIN',
                1005: '1005 CLOSE_NO_STATUS',
                1006: '1006 CLOSE_ABNORMAL',
                1007: '1007 UNSUPPORTED_DATA',
                1008: '1008 POLICY_VIOLATION',
                1009: '1009 CLOSE_TOO_LARGE',
                1010: '1010 MISSING_EXTENSION',
                1011: '1011 INTERNAL_ERROR',
                1012: '1012 SERVICE_RESTART',
                1013: '1013 TRY_AGAIN_LATER',
                1014: '1014 CLOSE_RETAIN',
                1015: '1015 TLS_HANDSHAKE'
            };
            return codes[code] || '0000 UNKNOWN_ERROR 未知错误';
        },
        sendData: function (raw) {
            var _this = this;
            var data = raw;
            if (typeof data === 'object' || data === undefined) {
                data = _this.content;
            }
            try {
                _this.instance.send(data);
                _this.writeNews(1, data);
                if (_this.sendClean) {
                    _this.content = '';
                }
            } catch (err) {
                _this.writeAlert('danger', '消息发送失败 原因请查看控制台');
                console.error(err);
            }
        },
        scrollOver: function (e) {
            if (e) {
                e.scrollTop = e.scrollHeight;
            }
        },
        cleanMessage: function () {
            this.messageData = [];
        }
    }
});