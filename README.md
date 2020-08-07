# repair-mysql
Repairs old MySql database folder and migrates all databases to new MySql database folder. Very useful recovery tool if old MySql server is not working anymore OR you want to just copy OR move the databases.

You can even use it for backups or replicating databases among different servers.

### Sample config

```
{
  // source
  oldFolder: "/path/to/OLD/mysql/data/folder",
  // target
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
```