define("modules/workflowlib", [], function () {

    var md = {
        mixins: {},
        fn: {}
    };

    var _currID = 0;
    md.fn.getUniqueId = function () {
        return _currID++;
    };
    md.fn.cloneMethods = function (dst, src) {
        for (var item in src) {
            if ((typeof (src[item])).toLowerCase() === "function") {
                dst[item] = src[item];
            }
        }

        return dst;
    };
    md.fn.cloneProperties = function (dst, src) {
        for (var item in src) {
            if ((typeof (src[item])).toLowerCase() !== "function") {
                dst[item] = src[item];
            }
        }

        return dst;
    };

    var Object = function () {
        var that = this;

        for (var i = 0; i < that.mixins.length; i++) {
            var obj = new that.mixins[i]();
            md.fn.cloneMethods(that, obj);
        }
    };
    Object.prototype.mixins = [];
    Object.prototype.addMixin = function (mixin) {
        this.mixins.push(mixin);
        return this;
    };

    md.mixins.EventListenerMixin = function () {
        var that = this;
        var _eventHandlers = {};

        that.on = function (name, func) {
            if (!_eventHandlers[name])
                _eventHandlers[name] = [];
            if (_eventHandlers[name].indexOf(func) < 0)
                _eventHandlers[name].push(func);
        };

        that.one = function (name, func) {
            if (func !== null && func !== undefined)
                func.__execAllowed = 1;
            this.on(name, func);
        };

        that.off = function (name, func) {
            if (_eventHandlers[name]) {
                if (func) {
                    var idx = _eventHandlers[name].indexOf(func);
                    if (idx > -1)
                        _eventHandlers[name].splice(idx, 1);
                }
                else {
                    _eventHandlers[name] = [];
                }
            }
        };

        that.trigger = function (name, args) {
            if (_eventHandlers[name]) {
                var org = _eventHandlers[name].slice();
                for (var i = 0; i < org.length; i++) {
                    if (org[i].__execAllowed !== undefined) {
                        org[i].__execAllowed--;
                        if (org[i].__execAllowed == 0)
                            this.off(name, org[i]);
                    }
                    org[i].apply(this, args);
                }
            }
        };
    };

    var FlowManager = function (name) {
        Object.call(this);

        var that = this;
        var _name = name;
        that.getName = function () {
            return _name;
        };

        var _flow = [];
        var _currentNode = null;

        function executeNode() {
            setTimeout(function () {
                _currentNode.execute();
            }, 1);
        };

        function prepareFlowExecution(fl) {
            fl.outerState = that.state;
            fl.state = md.fn.cloneProperties({}, that.state);
        }

        function executeFlow(fl) {
            setTimeout(function () {
                prepareFlowExecution(fl);
                var cancel_handler = null;
                var complete_handler = null;
                var t_complete = null;
                var t_cancel = null;
                var _reset = function () {
                    fl.off("cancel", cancel_handler);
                    fl.off("complete", complete_handler);

                    that.off("cancel", t_cancel);
                    that.off("complete", t_complete);
                };
                fl.on("cancel", cancel_handler = function () {
                    _reset();
                    that.state.innerState = fl.state;
                    that.cancel(arguments);
                });
                fl.on("complete", complete_handler = function () {
                    _reset();
                    that.state.innerState = fl.state;
                    that.next();
                });
                that.on("cancel", t_cancel = function () {
                    fl.cancel();
                });
                that.on("complete", t_complete = function () {
                    fl.complete();
                });

                fl.start();
            }, 1);
        };

        that.state = {};

        that.addNode = function (nodeFunc) {
            var node = new Node(nodeFunc, that);
            _flow.push(node);

            return that;
        };

        that.addFlow = function (flow) {

            that.addNode(function (mgr) {
                executeFlow(flow);
            });

            return that;
        };

        that.addChoice = function (flows, selector) {

            that.addNode(function (mgr) {
                var fl = flows[selector(that.state)];
                if (fl) {
                    executeFlow(fl);
                }
            });

            return that;
        };

        that.addLoop = function (flow, whileCondition) {
            that.addNode(function (mgr) {
                prepareFlowExecution(flow);

                var cancel_handler = null;
                var complete_handler = null;
                var t_complete = null;
                var t_cancel = null;

                var _reset = function () {
                    flow.off("cancel", cancel_handler);
                    flow.off("complete", complete_handler);

                    that.off("cancel", t_cancel);
                    that.off("complete", t_complete);
                };

                cancel_handler = function () {
                    _reset();

                    that.state.innerState = flow.state;
                    that.cancel(arguments);
                };
                complete_handler = function () {
                    if (whileCondition(flow.state)) {
                        flow.start();
                    }
                    else {
                        _reset();

                        that.state.innerState = flow.state;
                        that.next();
                    }
                };

                if (whileCondition(that.state)) {
                    flow.on("cancel", cancel_handler);
                    flow.on("complete", complete_handler);

                    that.on("cancel", t_cancel = function () {
                        flow.cancel();
                    });
                    that.on("complete", t_complete = function () {
                        flow.complete();
                    });

                    flow.start();
                }
                else {
                    that.next();
                }
            });

            return that;
        };

        that.next = function () {
            var i = 0;
            for (; i < _flow.length; i++) {
                if (_flow[i].ID === _currentNode.ID)
                    break;
            }
            if (i >= _flow.length - 1) {
                return false;
            }
            else {
                _currentNode = _flow[i + 1];
                executeNode();
                return true;
            }
        };

        that.prev = function () {
            var i = 0;
            for (; i < _flow.length; i++) {
                if (_flow[i].ID === _currentNode.ID)
                    break;
            }
            if (i == _flow.length || i == 0) {
                return false;
            }
            else {
                _currentNode = _flow[i - 1];
                executeNode();
                return true;
            }
        };

        that.start = function () {
            _currentNode = _flow[0];
            that.trigger("start", arguments);
            executeNode();
        };

        that.complete = function () {
            _currentNode = null;
            that.trigger("complete", arguments);
        };

        that.cancel = function () {
            _currentNode = null;
            that.trigger("cancel", arguments);
        };
    }
    FlowManager.prototype = new Object;
    FlowManager.prototype.addMixin(md.mixins.EventListenerMixin);

    var Node = function (body, manager) {
        var that = this;

        that.ID = md.fn.getUniqueId();

        var _manager = manager;

        that.execute = function () {
            body.call(that, _manager);
        };
    };

    var _flows = {};

    md.getFlow = function (name) {
        if (_flows[name] === undefined)
            _flows[name] = new FlowManager(name);
        return _flows[name];
    };

    return md;
});