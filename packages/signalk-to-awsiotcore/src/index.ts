export = function (app: any) {
  var plugin = {} as any;

  plugin.id = "signalk-to-awsiotcore";
  plugin.name = "SignalK AWS IoT Core Plugin";
  plugin.description = "Plugin that send data to AWS IoT Core";

  plugin.start = function (options: any, restartPlugin: any) {
    // Here we put our plugin logic
    app.debug("Plugin started");
  };

  plugin.stop = function () {
    // Here we put logic we need when the plugin stops
    app.debug("Plugin stopped");
  };

  plugin.schema = {
    // The plugin schema
  };

  return plugin;
}
