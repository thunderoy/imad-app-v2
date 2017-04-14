var express = require('express');
var morgan = require('morgan');
var path = require('path');
var Pool = require('pg').Pool;
var crypto = require('crypto');
var bodyParser = require('body-parser');
var session = require('express-session');

var config = {
    user: 'thunderoy',
    database: 'thunderoy',
    host: 'db.imad.hasura-app.io',
    port: '5432',
    password: process.env.DB_PASSWORD
};

var app = express();
app.use(morgan('combined'));
app.use(bodyParser.json());
app.use(session({
    secret: 'someRandomSecretValue',
    cookie: {maxAge: 1000 * 60 * 60 * 24 * 30}
}));

function createTemplate (data) {
    var title = data.title;
    var heading = data.title;
    var content = data.description;
    var image = data.img_link;
    var url = data.url;
    
    var htmlTemplate = `
    <html>
      <head>
          <title>
              ${title}
          </title>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="/ui/style.css" rel="stylesheet" />
          <link href="https://cdnjs.cloudflare.com/ajax/libs/twitter-bootstrap/3.3.7/css/bootstrap.min.css" rel="stylesheet" />
          <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css" rel="stylesheet" />
      </head> 
      <body>
          <div class="container-fluid">
              <div>
                  <a href="/">Home</a>
              </div>
              <hr/>
              <h3 class="text-center">
                  ${heading}
              </h3>
              <div class="text-center">
                  <a href="${url}" target="_blank"><img src="${image}" class="img_project"></a>
              </div>
              <div class="text-center">
                ${content}
              </div>
              <hr/>
              <h4>Comments</h4>
              <div id="comment_form">
              </div>
              <div id="comments">
                <center>Loading comments...</center>
              </div>
          </div>
      </body>
      <script type="text/javascript" src="/ui/project.js"></script>
    </html>
    `;
    return htmlTemplate;
}

app.get('/', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', 'index.html'));
});

var pool = new Pool(config);

app.get('/projects/:project_id', function (req, res){
    pool.query("SELECT * FROM projects WHERE id = $1", [req.params.project_id], function (err, result){
        if (err) {
            res.status(500).send(err.toString());
        }else{
            if (result.rows.length === 0) {
                res.status(404).send("Project not found");
            }  else {
                  var projectData = result.rows[0];
                  res.send(createTemplate(projectData));
            }
        }
    });
});

app.get('/get-comments/:project_id', function (req, res) {
   // make a select request
   // return a response with the results
   pool.query('SELECT comment.comment, "user".username FROM projects, comment, "user" WHERE projects.id = $1 AND projects.id = comment.project_id AND comment.user_id = "user".id ORDER BY comment.timestamp DESC', [req.params.project_id], function (err, result) {
      if (err) {
          res.status(500).send(err.toString());
      } else {
          res.send(JSON.stringify(result.rows));
      }
   });
});

app.post('/submit-comment/:project_id', function (req, res) {
   // Check if the user is logged in
    if (req.session && req.session.auth && req.session.auth.userId) {
        // First check if the project exists and get the project_id
        pool.query('SELECT * from projects where id = $1', [req.params.project_id], function (err, result) {
            if (err) {
                res.status(500).send(err.toString());
            } else {
                if (result.rows.length === 0) {
                    res.status(400).send('Project not found');
                } else {
                    var projectId = result.rows[0].id;
                    // Now insert the right comment for this project
                    
                    pool.query(
                        "INSERT INTO comment (comment, project_id, user_id) VALUES ($1, $2, $3)",
                        [req.body.comment, projectId, req.session.auth.userId],
                        function (err, result) {
                            if (err) {
                                res.status(500).send(err.toString());
                            } else {
                                res.status(200).send('Comment inserted!');
                            }
                        });
                }
            }
       });     
    } else {
        res.status(403).send('Only logged in users can comment');
    }
});

function hash (input, salt) {
    var hashed = crypto.pbkdf2Sync(input, salt, 10000, 512, 'sha512');
    return ["pbkdf2", "10000", salt, hashed.toString('hex')].join("$");
}

app.get('/hash/:input', function(req, res) {
    var hashedString = hash (req.params.input, 'this_is_some_string');
    res.send(hashedString);
});

app.post('/register', function(req, res){
    var username = req.body.username;
    var password = req.body.password;
    var salt = crypto.randomBytes(128).toString('hex');
    var dbString = hash(password, salt);
    pool.query('INSERT INTO "user" (username, password) VALUES ($1, $2)', [username, dbString], function (err, result){
        if (err) {
            res.status(500).send(err.toString());
        } else {
            res.send('User successfully created: ' + username);
        }
    });
});

app.post('/login', function(req, res){
    var username = req.body.username;
    var password = req.body.password;
    
    pool.query('SELECT * FROM "user" WHERE username = $1', [username], function (err, result){
        if (err) {
            res.status(500).send(err.toString());
        } else {
            if (result.rows.length === 0) {
                res.status(403).send('username/password is invalid');
            }  else {
                var dbString = result.rows[0].password;
                var salt = dbString.split('$')[2];
                var hashedPassword = hash(password, salt);
                if (hashedPassword === dbString) {
                    
                    // Set the session
                    req.session.auth = {userId: result.rows[0].id};
                // set cookie with a session id
                // internally, on the server side, it maps the session id to an object
                // { auth: {userId }}
                    
                    res.send('Succesfully logged in');
                }  else {
                    res.status(403).send('username/password is invalid');
                }
        }
      }
    });
});

app.get('/check-login', function (req, res) {
   if (req.session && req.session.auth && req.session.auth.userId) {
       // Load the user object
       pool.query('SELECT * FROM "user" WHERE id = $1', [req.session.auth.userId], function (err, result) {
           if (err) {
              res.status(500).send(err.toString());
           } else {
              res.send(result.rows[0].username);    
           }
       });
   } else {
       res.status(400).send('You are not logged in');
   }
});

app.get('/logout', function (req, res) {
   delete req.session.auth;
   res.send('<html><body>Logged out!<br/><br/><a href="/">Back to home</a></body></html>');
});

app.get('/ui/:fileName', function (req, res) {
  res.sendFile(path.join(__dirname, 'ui', req.params.fileName));
});

var port = 8080; // Use 8080 for local development because you might already have apache running on 80
app.listen(8080, function () {
  console.log(`IMAD course app listening on port ${port}!`);
});
