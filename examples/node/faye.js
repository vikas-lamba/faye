if (!this.Faye) Faye = {};

Faye.extend = function(dest, source, overwrite) {
  if (!source) return dest;
  for (var key in source) {
    if (source.hasOwnProperty(key) && dest[key] !== source[key]) {
      if (!dest.hasOwnProperty(key) || overwrite !== false)
        dest[key] = source[key];
    }
  }
  return dest;
};

Faye.extend(Faye, {
  BAYEUX_VERSION:   '1.0',
  VERSION:          '0.1.1',
  JSONP_CALLBACK:   'jsonpcallback',
  ID_LENGTH:        128,
  CONNECTION_TYPES: ["long-polling", "callback-polling"],
  
  ENV:              this,
  
  Grammar: {

    LOWALPHA:     /^[a-z]$/,

    UPALPHA:     /^[A-Z]$/,

    ALPHA:     /^([a-z]|[A-Z])$/,

    DIGIT:     /^[0-9]$/,

    ALPHANUM:     /^(([a-z]|[A-Z])|[0-9])$/,

    MARK:     /^(\-|\_|\!|\~|\(|\)|\$|\@)$/,

    STRING:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*$/,

    TOKEN:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+$/,

    INTEGER:     /^([0-9])+$/,

    CHANNEL_SEGMENT:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+$/,

    CHANNEL_SEGMENTS:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*$/,

    CHANNEL_NAME:     /^\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*$/,

    WILD_CARD:     /^\*{1,2}$/,

    CHANNEL_PATTERN:     /^(\/(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)))+)*\/\*{1,2}$/,

    VERSION_ELEMENT:     /^(([a-z]|[A-Z])|[0-9])(((([a-z]|[A-Z])|[0-9])|\-|\_))*$/,

    VERSION:     /^([0-9])+(\.(([a-z]|[A-Z])|[0-9])(((([a-z]|[A-Z])|[0-9])|\-|\_))*)*$/,

    CLIENT_ID:     /^((([a-z]|[A-Z])|[0-9]))+$/,

    ID:     /^((([a-z]|[A-Z])|[0-9]))+$/,

    ERROR_MESSAGE:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*$/,

    ERROR_ARGS:     /^(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*(,(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)*$/,

    ERROR_CODE:     /^[0-9][0-9][0-9]$/,

    ERROR:     /^([0-9][0-9][0-9]:(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*(,(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)*:(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*|[0-9][0-9][0-9]::(((([a-z]|[A-Z])|[0-9])|(\-|\_|\!|\~|\(|\)|\$|\@)| |\/|\*|\.))*)$/

  },
  
  commonElement: function(lista, listb) {
    for (var i = 0, n = lista.length; i < n; i++) {
      if (this.indexOf(listb, lista[i]) !== -1)
        return lista[i];
    }
    return null;
  },
  
  indexOf: function(list, needle) {
    for (var i = 0, n = list.length; i < n; i++) {
      if (list[i] === needle) return i;
    }
    return -1;
  },
  
  each: function(object, callback, scope) {
    if (object instanceof Array) {
      for (var i = 0, n = object.length; i < n; i++) {
        if (object[i] !== undefined)
          callback.call(scope || null, object[i], i);
      }
    } else {
      for (var key in object) {
        if (object.hasOwnProperty(key))
          callback.call(scope || null, key, object[key]);
      }
    }
  },
  
  size: function(object) {
    var size = 0;
    this.each(object, function() { size += 1 });
    return size;
  },
  
  random: function() {
    var field = Math.pow(2, this.ID_LENGTH);
    return (Math.random() * field).toString(16).replace(/0*$/, '');
  },
  
  enumEqual: function(actual, expected) {
    if (expected instanceof Array) {
      if (!(actual instanceof Array)) return false;
      var i = actual.length;
      if (i !== expected.length) return false;
      while (i--) {
        if (actual[i] !== expected[i]) return false;
      }
      return true;
    } else {
      if (!(actual instanceof Object)) return false;
      if (this.size(expected) !== this.size(actual)) return false;
      var result = true;
      this.each(actual, function(key, value) {
        result = result && (expected[key] === value);
      });
      return result;
    }
  }
});


Faye.Class = function(parent, methods) {
  if (typeof parent !== 'function') {
    methods = parent;
    parent  = Object;
  }
  
  var klass = function() {
    if (!this.initialize) return this;
    return this.initialize.apply(this, arguments) || this;
  };
  
  var bridge = function() {};
  bridge.prototype = parent.prototype;
  
  klass.prototype = new bridge();
  Faye.extend(klass.prototype, methods);
  
  return klass;
};


Faye.Channel = {
  HANDSHAKE:    '/meta/handshake',
  CONNECT:      '/meta/connect',
  SUBSCRIBE:    '/meta/subscribe',
  UNSUBSCRIBE:  '/meta/unsubscribe',
  DISCONNECT:   '/meta/disconnect',
  
  META:         'meta',
  SERVICE:      'service',
  
  isValid: function(name) {
    return Faye.Grammar.CHANNEL_NAME.test(name) ||
           Faye.Grammar.CHANNEL_PATTERN.test(name);
  },
  
  parse: function(name) {
    if (!this.isValid(name)) return null;
    return name.split('/').slice(1);
  },
  
  isMeta: function(name) {
    var segments = this.parse(name);
    return segments ? (segments[0] === this.META) : null;
  },
  
  isService: function(name) {
    var segments = this.parse(name);
    return segments ? (segments[0] === this.SERVICE) : null;
  },
  
  isSubscribable: function(name) {
    if (!this.isValid(name)) return null;
    return !this.isMeta(name) && !this.isService(name);
  },
  
  Tree: Faye.Class({
    initialize: function(value) {
      this._value = value;
      this._children = {};
    },
    
    eachChild: function(block, context) {
      Faye.each(this._children, function(key, subtree) {
        block.call(context, key, subtree);
      });
    },
    
    each: function(prefix, block, context) {
      this.eachChild(function(path, subtree) {
        path = prefix.concat(path);
        subtree.each(path, block, context);
      });
      if (this._value !== undefined) block.call(context, prefix, this._value);
    },
    
    map: function(block, context) {
      var result = [];
      this.each([], function(path, value) {
        result.push(block.call(context, path, value));
      });
      return result;
    },
    
    get: function(name) {
      var tree = this.traverse(name);
      return tree ? tree._value : null;
    },
    
    set: function(name, value) {
      var subtree = this.traverse(name, true);
      if (subtree) subtree._value = value;
    },
    
    traverse: function(path, createIfAbsent) {
      if (typeof path === 'string') path = Faye.Channel.parse(path);
      
      if (path === null) return null;
      if (path.length === 0) return this;
      
      var subtree = this._children[path[0]];
      if (!subtree && !createIfAbsent) return null;
      if (!subtree) subtree = this._children[path[0]] = new Faye.Channel.Tree();
      
      return subtree.traverse(path.slice(1), createIfAbsent);
    },
    
    glob: function(path) {
      if (typeof path === 'string') path = Faye.Channel.parse(path);
      
      if (path === null) return [];
      if (path.length === 0) return (this._value === undefined) ? [] : [this._value];
      
      var list = [];
      
      if (Faye.enumEqual(path, ['*'])) {
        Faye.each(this._children, function(key, subtree) {
          if (subtree._value !== undefined) list.push(subtree._value);
        });
        return list;
      }
      
      if (Faye.enumEqual(path, ['**'])) {
        list = this.map(function(key, value) { return value });
        list.pop();
        return list;
      }
      
      Faye.each(this._children, function(key, subtree) {
        if (key !== path[0] && key !== '*') return;
        var sublist = subtree.glob(path.slice(1));
        Faye.each(sublist, function(channel) { list.push(channel) });
      });
      
      if (this._children['**']) list.push(this._children['**']._value);
      return list;
    }
    
    /**
      Tests
      
      glob = new Faye.Channel.Tree();
      list = '/foo/bar /foo/boo /foo /foobar /foo/bar/boo /foobar/boo /foo/* /foo/**'.split(' ');

      Faye.each(list, function(c, i) {
          glob.set(c, i + 1);
      });

      console.log(glob.glob('/foo/*').sort());        // 1,2,7,8
      console.log(glob.glob('/foo/bar').sort());      // 1,7,8
      console.log(glob.glob('/foo/**').sort());       // 1,2,5,7,8
      console.log(glob.glob('/foo/bar/boo').sort());  // 5,8
    **/
  })
};


Faye.Set = Faye.Class({
  initialize: function() {
    this._index = {};
  },
  
  add: function(item) {
    var key = (item.id !== undefined) ? item.id : item;
    if (this._index.hasOwnProperty(key)) return false;
    this._index[key] = item;
    return true;
  }
});


Faye.Server = Faye.Class({
  initialize: function(options) {
    this._options  = options || {};
    this._channels = new Faye.Channel.Tree();
    this._clients  = {};
  },
  
  clientIds: function() {
    var ids = [];
    Faye.each(this._clients, function(key, value) { ids.push(key) });
    return ids;
  },
  
  process: function(messages, local, callback) {
    messages = (messages instanceof Array) ? messages : [messages];
    var processed = 0, responses = [];
    
    Faye.each(messages, function(message) {
      this._handle(message, local, function(reply) {
        responses = responses.concat(reply);
        processed += 1;
        if (processed === messages.length) callback(responses);
      });
    }, this);
  },
  
  _generateId: function() {
    var id = Faye.random();
    while (this._clients.hasOwnProperty(id)) id = Faye.random();
    return this._connection(id).id;
  },
  
  _connection: function(id) {
    if (this._clients.hasOwnProperty(id)) return this._clients[id];
    var client = new Faye.Connection(id, this._options);
    client.on('stale', function() { this._destroyClient(client) }, this);
    return this._clients[id] = client;
  },
  
  _destroyClient: function(client) {
    client.disconnect();
    delete this._clients[client.id];
  },
  
  _handle: function(message, local, callback) {
    var clientId = message.clientId,
        channel  = message.channel,
        response;
    
    if (Faye.Channel.isMeta(channel)) {
      response = this[Faye.Channel.parse(channel)[1]](message, local);
      
      clientId = clientId || response.clientId;
      response.advice = response.advice || {};
      Faye.extend(response.advice, {
        reconnect:  this._clients.hasOwnProperty(clientId) ? 'retry' : 'handshake',
        interval:   Faye.Connection.INTERVAL * 1000
      }, false);
      
      response.id = message.id;
      
      if (response.channel !== Faye.Channel.CONNECT ||
          response.successful !== true)
        return callback(response);
      
      return this._connection(response.clientId).connect(function(events) {
        callback([response].concat(events));
      });
    }
  },
  
  handshake: function(message, local) {
    var response = { channel:   Faye.Channel.HANDSHAKE,
                     version:   Faye.BAYEUX_VERSION,
                     supportedConnectionTypes: Faye.CONNECTION_TYPES,
                     id:        message.id };
    
    if (!message.version)
      response.error = Faye.Error.parameterMissing('version');
    
    var clientConns = message.supportedConnectionTypes,
        commonConns;
    
    if (clientConns) {
      commonConns = clientConns.filter(function(conn) {
        return Faye.CONNECTION_TYPES.indexOf(conn) !== -1;
      });
      if (commonConns.length === 0)
        response.error = Faye.Error.conntypeMismatch(clientConns);
    } else {
      response.error = Faye.Error.parameterMissing('supportedConnectionTypes');
    }
    
    response.successful = !response.error;
    if (!response.successful) return response;
    
    response.clientId = this._generateId();
    return response;
  },
  
  connect: function(message, local) {
    var response = { channel:   Faye.Channel.CONNECT,
                     id:        message.id };
    
    var clientId = message.clientId,
        client   = clientId ? this._clients[clientId] : null,
        connectionType = message.connectionType;
    
    if (client === null) response.error = Faye.Error.clientUnknown(clientId);
    if (!clientId)       response.error = Faye.Error.parameterMissing('clientId');
    if (!connectionType) response.error = Faye.Error.parameterMissing('connectionType');
    
    response.successful = !response.error;
    if (!response.successful) return response;
    
    response.clientId = client.id;
    return response;
  },
  
  disconnect:   function() { return {} },
  subscribe:    function() { return {} },
  unsubscribe:  function() { return {} }
});


Faye.Connection = Faye.Class({
  initialize: function(id, options) {
    this.id         = id;
    this._options   = options;
    this._observers = {};
    this._channels  = new Faye.Set();
    this._inbox     = new Faye.Set();
  },
  
  on: function(eventType, block, scope) {
    var list = this._observers[eventType] = this._observers[eventType] || [];
    list.push([block, scope]);
  },
  
  connect: function(callback) {
  
  }
});

Faye.Connection.INTERVAL = 1.0;


var path  = require('path'),
    posix = require('posix'),
    sys   = require('sys'),
    querystring = require('querystring');

Faye.NodeAdapter = Faye.Class({
  initialize: function(options) {
    this._options  = options || {};
    this._endpoint = this._options.mount || Faye.NodeAdapter.DEFAULT_ENDPOINT;
    this._script   = this._endpoint + '.js';
    this._server   = new Faye.Server(this._options);
  },
  
  call: function(request, response) {
    switch (request.url) {
      
      case this._endpoint:
        var isGet  = (request.method === 'GET'),
            type   = isGet ? Faye.NodeAdapter.TYPE_SCRIPT : Faye.NodeAdapter.TYPE_JSON,
            server = this._server;
        
        if (isGet) {
          // TODO
        } else {
          request.addListener('body', function(chunk) {
            var params  = querystring.parse(chunk),
                message = JSON.parse(params.message),
                jsonp   = params.jsonp || Faye.JSONP_CALLBACK;
            
            server.process(message, false, function(replies) {
              response.sendHeader(200, type);
              response.sendBody(JSON.stringify(replies));
              response.finish();
            });
          });
        }
        return true;
        break;
      
      case this._script:
        posix.cat(Faye.NodeAdapter.SCRIPT_PATH).addCallback(function(content) {
          response.sendHeader(200, Faye.NodeAdapter.TYPE_SCRIPT);
          response.sendBody(content);
          response.finish();
        });
        return true;
        break;
      
      default: return false;
    }
  }
});

Faye.extend(Faye.NodeAdapter, {
  DEFAULT_ENDPOINT: '/bayeux',
  SCRIPT_PATH:      path.dirname(__filename) + '/faye-client-min.js',
  
  TYPE_JSON:    {'Content-Type': 'text/json'},
  TYPE_SCRIPT:  {'Content-Type': 'text/javascript'},
  TYPE_TEXT:    {'Content-Type': 'text/plain'}
});

exports.NodeAdapter = Faye.NodeAdapter;