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
