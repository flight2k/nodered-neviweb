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
          this.status({fill:"green", shape:"dot", text:"Login success"});
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
        this.status({fill:"yellow", shape:"dot", text:"Login"});
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
      //node.log('login : ' + JSON.stringify(login));
      request(login, lcallback);
    }
    
    this.gateway = function(callback) {
      var options = {
        rejectUnauthorized: false,
        uri: decodeURIComponent(url + 'gateway'),
        method: "GET",
        headers: {},
        json: true
      };
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
          node.send([msg,null]);
          for(var gateway of body) {
            msg[config.info]=gateway;
            msg[config.id]=gateway.id;
            node.send([null, msg]);
          }
        }
      }
      account.gateway(callback);
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
}
