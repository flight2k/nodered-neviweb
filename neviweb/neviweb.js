module.exports = function(RED) {

  function NeviwebAccountNode(config) {
    RED.nodes.createNode(this, config);
    this.log(config);
    var node = this;
    var url = config.url;
    var email = this.credentials.email;
    var password = this.credentials.password;
    var request = require("request");
    var globalContext = this.context().global;
    //context.set('neviweb-sessionId',"");
    
    this.doRequest = function(options, callback) {
      var lcallback = function(errors, response, body) {
        if (errors) {
          node.log(JSON.stringify(errors));
        } else if ( body.session !== "" ) {
          globalContext.set('neviweb-sessionId',body.session);
          node.log("Login success : " + JSON.stringify(body));
          node.status({fill:"green", shape:"dot", text:"Login success"});
          completRequest(options, callback);
        } else {
          node.log("Login error : " + JSON.stringify(body));
        }
      };
      var completRequest = function(options, callback) {
        options.headers = {
          'Session-Id': globalContext.get('neviweb-sessionId')
        }
        node.log("DoRequest " + JSON.stringify(options));
        request(options, callback);      
      };
      if ( globalContext.get('neviweb-sessionId') === "" || globalContext.get('neviweb-sessionId') === undefined ) {
        node.status({fill:"yellow", shape:"dot", text:"Login"});
        node.doLogin(lcallback);
      } else {
        completRequest(options, callback);
      }
    }
    
    this.doLogin = function(lcallback) {
      var login = {
        rejectUnauthorized: false,
        headers: {stayConnected: 0},
        uri: decodeURIComponent(url + 'login'),
        body: {
          email: email,
          password: password
        },
        method: 'POST',
        followAllRedirects: true,
        json: true
      };
      request(login, lcallback);
    }
    
    this.getGateway = function(msg, callback) {
      var options = {
        rejectUnauthorized: false,
        uri: decodeURIComponent(url + 'gateway'),
        method: "GET",
        headers: {},
        json: true
      };
      node.doRequest(options, callback);
    }

    this.setGateway = function(msg, callback) {
      var options = {
        rejectUnauthorized: false,
        uri: decodeURIComponent(url + 'gateway/' + msg.gateway + '/mode'),        
        method: "POST",
        json: true,
        body: {mode: msg.topic.toString()} //pourrait être modifier pour msg.payload.set.mode
        //Mode : Absent = 2 / Présent = 0
      };
      node.doRequest(options, callback);
    }

    this.getDevice = function(msg, callback) {
      var options = {
        rejectUnauthorized: false,
        uri: decodeURIComponent(url + 'device?gatewayId=' + msg.gateway),
        method: "GET",
        headers: {},
//        body: {
//          gatewayId: msg.gateway || config.gateway
//        },
        json: true
      };
//      node.log("Options device : " + JSON.stringify(options));
      node.doRequest(options, callback);
    }
  }
  
  function NeviwebGatewayNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    var account = RED.nodes.getNode(config.account);
    
    this.on('input', function(msg) {
      this.log("Asking gateway " + msg.payload);
      var callback = function(errors, response, body) {
        if ( body.sessionExpired ) {
          msg.payload = body;
        } else {
          node.status({});
          msg.payload=response.body;
          node.send([null,msg]);
          if (config.mode === "GET") {
            for(var gateway of body) {
              msg[config.info]=gateway;
              msg[config.id]=gateway.id;
              node.send([msg,null]);
            }
          } else if (config.mode === "SET") {
            if (body.success === true) {
              node.status({fill:"green", shape:"dot", text:"Success"})
            } else {
              node.status({fill:"red", shape:"dot", text:"Error"})
            }
          }
        }
      }
      if (config.mode === "GET") {
        account.getGateway(msg, callback);
      } else if (config.mode === "SET") {
        account.setGateway(msg, callback);
      }
    });
  }

  function NeviwebDeviceNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    var account = RED.nodes.getNode(config.account);
    
    this.on('input', function(msg) {
      this.log("Asking device " + JSON.stringify(msg.payload));
      var callback = function(errors, response, body) {
//        node.log("Device response : " + JSON.stringify(response));
        if ( response.body.sessionExpired ) {
          msg.payload = response.body;
        } else {
          node.status({});
          msg.payload=response.body;
          node.send([null,msg]);
          for(var device of response.body) {
            msg[config.info]=device;
            msg[config.id]=device.id;
            node.send([msg,null]);
          }
        }
      }
      msg.gateway = msg.gateway || config.gateway;
      account.getDevice(msg, callback);
    });
    
  }
            
  RED.nodes.registerType("neviweb-account", NeviwebAccountNode, {
    credentials: {
      email: {
        type: "text"
      },
      password: {
        type: "password"
      }
    }
  });
  
  RED.nodes.registerType("neviweb-gateway", NeviwebGatewayNode);
  RED.nodes.registerType("neviweb-device", NeviwebDeviceNode);
}
