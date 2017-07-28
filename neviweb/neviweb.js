module.exports = function(RED) {

  function NeviwebAccountNode(config) {
    RED.nodes.createNode(this, config);
    this.log(config);
    var node = this;
    var url = config.url;
    var email = this.credentials.email;
    var password = this.credentials.password;
    var request = require("request");
    var sessionId = "";
    
    this.doRequest = function(options, callback) {
      if ( sessionId === "" ) {
        sessionId = node.doLogin();      
      }
      options["Session-Id"] = sessionId;
      this.log("DoRequest " + JSON.stringify(options));
      request(options, callback);
    }
    
    this.doLogin = function() {
      var options = {
        rejectUnauthorized: false,
        uri: decodeURIComponent(url + 'login'),
        body: {
          email: email,
          password: password
        },
        method: 'POST',
        followAllRedirects: true,
        json: true
      };
      request(options, function(errors, response, body) {
        if (errors) {
          node.log(JSON.stringify(errors));
        } else if ( body.session !== "" ) {
          node.sessionId = body.session;
          node.log("Login success : " + JSON.stringify(body));
          return body.session;
        } else {
          node.log("Login error : " + JSON.stringify(body));
        }
      });
    }
    
    this.gateway = function(callback) {
      var options = {
        rejectUnauthorized: false,
        uri: decodeURIComponent(url + 'gateway'),
        method: "GET"
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
        if (errors) {
          
        } else if (response.statusCode === 201) {
          node.status({});
          msg.payload=body;
          node.send(msg);
        } else {
          
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
