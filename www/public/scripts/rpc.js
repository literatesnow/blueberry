'use strict';

function RPC(methodName, params, namedParams, transformerCb) {
  this.methodName = methodName;
  this.params = [];
  this.names = [];
  this.transformerCb = transformerCb;

  this.setParams(params);
  this.setNamedParams(namedParams);
}

RPC.prototype.setParams = function(params) {
  _.forEach(params, function(param) {
    this.params.push(param);
  }.bind(this));
};

RPC.prototype.setNamedParams = function(params) {
  _.forEach(params, function(param, name) {
    this.names.push(name);
    this.params.push(param);
  }.bind(this));
};

RPC.prototype.getRequest = function() {
  var req = { methodName: this.methodName };
  if (this.params.length) {
    req.params = this.params;
  }
  return req;
};

RPC.prototype.getParams = function() {
  return this.params;
};

RPC.prototype.getResponse = function(data) {
  if (!data) {
    return null;
  }

  if (!data.array) {
    return this.transformerCb(this.transformValue(data));
  }

  var params = [];
  var self = this;

  _.forEach(data.array, function(wrap) {
    params.push(self.transformValue(wrap.array));
  });

  return this.transformerCb(params);
};

RPC.prototype.transformValue = function(values) {
  var res = {};

  _.forEach(values, function(value, i) {
    var name = this.names[i];
    if (!name) {
      throw new Error('Missing name for: ' + i);
    }
    res[name] = value;
  }.bind(this));

  return res;
};
