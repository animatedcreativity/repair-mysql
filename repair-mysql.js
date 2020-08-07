exports = module.exports = function() {
  return {
    oldFolder: "/path/to/OLD/mysql/data/folder",
    newFolder: "/path/to/NEW/mysql/data/folder",
    host: "127.0.0.1",
    user: "root",
    password: "123456",
    port: 3306,
    mysqlUser: "mysql",
    /*
      curl -s http://get.dbsake.net > dbsake
      chmod u+x dbsake
    */
    workingFolder: "/path/where/dbsake/is/installed"
  }
};