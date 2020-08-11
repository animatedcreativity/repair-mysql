exports = module.exports = function(userConfig) {
  var nodeFileConfig = require("node-file-config");
  var fileConfig = new nodeFileConfig("repair-mysql");
  var config = fileConfig.get(userConfig);
  var fs = require("fs");
  var cmd = require('node-run-cmd');
  var mysql = require("mysql");
  var options = {
    host     : config.host,
    user     : config.user,
    password : config.password
  };
  var connection = mysql.createConnection(options);
  connection.connect();
  var mod = {
    wrapper: require("node-promise-wrapper"),
    query: function(query, database) {
      return new Promise(async function(resolve, reject) {
        if (typeof database !== "undefined") options.database = database;
        connection.query(query, function(error, records, fields) {
          if (typeof error === "undefined" || error === null) {
            resolve(records);
          } else {
            if (JSON.stringify(error).split("Tablespace is missing for table").length <= 1) {
              reject(error);
            } else {
              reject(false);
            }
          }
        });
      });
    },
    start: async function() {
      var list = fs.readdirSync(config.oldFolder);
      for (var i=0; i<=list.length-1; i++) {
        var errorFound = false;
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
                data = data.split("0000-00-00 00:00:00").join("1970-01-01 00:00:01");
                data = data.split("0-00-00 00:00:00").join("1970-01-01 00:00:01");
                data = data.split("CREATE TABLE `").join("CREATE TABLE `" + database + "`.`");
                console.log(database, data);
                var {error, result} = await mod.wrapper("result", mod.query("CREATE DATABASE IF NOT EXISTS " + database));
                if (typeof result === "undefined" && error !== false) {
                  console.log(error);
                  errorFound = true;
                  break;
                }
                var {error, result} = await mod.wrapper("result", mod.query("DROP TABLE IF EXISTS `" + database + "`.`" + table + "`"));
                var {error, result} = await mod.wrapper("result", cmd.run("rm -rf " + config.newFolder + "/" + database + "/" + ibdFile.split("/").pop(), {onData: function(d) {
                  console.log(d);
                }}));
                await mod.wrapper("result", mod.query(data, database));
                await mod.wrapper("result", mod.query("ALTER TABLE `" + database + "`.`" + table + "` DISCARD TABLESPACE", database));
                var {error, result} = await mod.wrapper("result", cmd.run("cp " + ibdFile + " " + config.newFolder + "/" + database + "/" + ibdFile.split("/").pop(), {onData: function(d) {
                  console.log(d);
                }}));
                var {error, result} = await mod.wrapper("result", cmd.run("chown " + config.mysqlUser + ":" + config.mysqlUser + " " + config.newFolder + "/" + database + "/" + ibdFile.split("/").pop(), {onData: function(d) {
                  console.log(d);
                }}));
                await mod.wrapper("result", mod.query("ALTER TABLE `" + database + "`.`" + table + "` IMPORT TABLESPACE", database));
              } else {
                console.log("Error: Could not create table, skipping file: " + file);
              }
            }
          }
        }
        if (errorFound === true) {
          console.log("Errors occured... exiting...");
          break;
        }
      }
      connection.destroy();
    }
  };
  mod.start();
  return mod;
};
new exports();
