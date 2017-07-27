module.exports = function(RED) {

  function NeviwebAccountNode(config) {
    RED.nodes.createNode(this, config);
    var node = this;
    var url = config.url;
    var email = this.credentials.email;
    var password = this.credentials.password;
    var request = require("request");
    
    this.doRequest = function(options, callback) {
      options.email = email;
      options.password = password;
      
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
