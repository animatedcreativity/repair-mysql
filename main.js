exports = module.exports = function(userConfig) {
  var nodeFileConfig = require("node-file-config");
  var fileConfig = new nodeFileConfig("repair-mysql");
  var config = fileConfig.get(userConfig);
  var fs = require("fs");
  var cmd = require('node-run-cmd');
  var mysql = require("mysql");
  var mod = {
    wrapper: require("node-promise-wrapper"),
    query: function(query, database) {
      return new Promise(function(resolve, reject) {
        var options = {
          host     : config.host,
          user     : config.user,
          password : config.password
        };
        if (typeof database !== "undefined") options.database = database;
        var connection = mysql.createConnection(options);
        connection.connect();
        connection.query(query, function(error, records, fields) {
          if (typeof error !== null) {
            resolve(records);
          } else {
            reject(error);
          }
          connection.destroy();
        });
      });
    },
    start: async function() {
      var list = fs.readdirSync(config.oldFolder);
      for (var i=0; i<=list.length-1; i++) {
        var database = list[i];
        var folder = config.oldFolder + "/" + database;
        if (
          fs.statSync(folder).isDirectory() === true
          && folder.split("/").pop() !== "information_schema"
          && folder.split("/").pop() !== "mysql"
          && folder.split("/").pop() !== "performance_schema"
          && folder.split("/").pop() !== "sys"
        ) {
          var files = fs.readdirSync(folder);
          for (f=0; f<=files.length-1; f++) {
            var file = folder + "/" + files[f];
            var parts = file.split(".");
            parts.pop();
            var ibdFile = parts.join(".") + ".ibd";
            if (
              file.split(".").pop() === "frm"
              && fs.existsSync(ibdFile) === true
            ) {
              var table = file.split("/").pop().split(".").shift();
              var command = `./dbsake frmdump ` + file;
              var data = "";
              var {error, result} = await mod.wrapper("result", cmd.run(command, {cwd: config.workingFolder, onData: function(d) {
                data += d;
              }}));
              if (data.split("CREATE TABLE").length > 1) {
                console.log(database, data);
                await mod.wrapper("result", mod.query("CREATE DATABASE " + database));
                await mod.wrapper("result", mod.query(data, database));
                await mod.wrapper("result", mod.query("ALTER TABLE `" + table + "` DISCARD TABLESPACE", database));
                var {error, result} = await mod.wrapper("result", cmd.run("cp " + ibdFile + " " + config.newFolder + "/" + database + "/" + ibdFile.split("/").pop(), {onData: function(d) {
                  console.log(d);
                }}));
                var {error, result} = await mod.wrapper("result", cmd.run("chown " + config.mysqlUser + ":" + config.mysqlUser + " " + config.newFolder + "/" + database + "/" + ibdFile.split("/").pop(), {onData: function(d) {
                  console.log(d);
                }}));
                await mod.wrapper("result", mod.query("ALTER TABLE `" + table + "` IMPORT TABLESPACE", database));
              } else {
                console.log("Error: Could not create table, skipping file: " + file);
              }
            }
          }
        }
      }
    }
  };
  mod.start();
  return mod;
};
new exports();