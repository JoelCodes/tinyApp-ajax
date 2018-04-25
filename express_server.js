const express = require('express');
const bodyParser = require('body-parser');
const cookieSession = require('cookie-session');
const bcrypt = require('bcrypt');

const app = express();
const PORT = process.env.PORT || 8080;

app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json({}));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || 'development'],
  maxAge: 24 * 60 * 60 * 1000,
}));


// Database for users
const users = {
  userRandomID: {
    id: 'userRandomID',
    email: 'user@example.com',
    password: bcrypt.hashSync('purple-monkey-dinosaur', 10),
  },
  user2RandomID: {
    id: 'user2RandomID',
    email: 'user2@example.com',
    password: bcrypt.hashSync('dishwasher-funk', 10),
  },
};

// Sets user as a global variable
app.use((req, res, next) => {
  res.locals.user = users[req.session.user_id];
  next();
});


// Generates random string for shortURL and randomID
function generateRandomString() {
  let shortURL = '';
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (let i = 0; i < 6; i += 1) {
    shortURL += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return shortURL;
}


app.get('/register', (req, res) => {
  // If user is logged in, redirect to main urls page
  if (res.locals.user) {
    res.redirect('/urls');
  // If user is not logged in, go to register page
  } else {
    res.render('register');
  }
});

app.post('/register', (req, res) => {
  // If user does not enter both an email and a password
  if (!req.body.email || !req.body.password) {
    res.status(400);
    res.send("Please enter both an email and a password. Return to <a href='/register'>registration</a> page.");
    return;
  }
  // Checks to see if email is already registered
  const emailTaken = Object.entries(users).some(([, user]) => user.email === req.body.email);
  if (emailTaken) {
    res.status(400).send("That email is already registered, please <a href='/login'>login</a> or try registering <a href='/register'>again</a>");
    return;
  }
  // Creates randomID for new user then redirects to urls page
  const randomID = generateRandomString();
  users[randomID] = {
    id: randomID,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10),
  };
  req.session.user_id = randomID;
  res.redirect('/urls');
});

app.get('/login', (req, res) => {
  // If user is logged in, go to urls
  if (res.locals.user) {
    res.redirect('/urls');
    // If user is not logged in, go to login
  } else {
    res.render('login');
  }
});

app.post('/login', (req, res) => {
  // If user does not enter both an email and a password
  if (!req.body.email || !req.body.password) {
    res.status(400).send("Please enter both an email and a password. Return to <a href='/login'>login</a> page.");
    return;
  }
  // Checks if user exists in users database
  const userWithEmail = Object.entries(users)
    .find(([, { password, email }]) =>
      email === req.body.email &&
      bcrypt.compareSync(req.body.password, password));
  if (userWithEmail) {
    req.session.user_id = userWithEmail[1].id;
    res.redirect('/urls');
  } else {
    res.status(403).send("Email & Password not found. Please try <a href='/login'>again</a>.");
  }
});

app.post('/logout', (req, res) => {
  req.session = undefined;
  res.redirect('/login');
});

// Database for urls
const urlDatabase = {};

app.get('/u/:shortURL', (req, res) => {
  const result = urlDatabase[req.params.shortURL];
  // If url is valid, redirect to longURL
  if (result) {
    res.redirect(result.longURL);
  // If url is not valid, send error message
  } else {
    res.status(404).send("Invalid URL. Return to <a href='/urls'>TinyApp.</a>");
  }
});


// Checks if user has that specific shortURL
function userSpecificURL(userId) {
  return Object.entries(urlDatabase)
    .filter(([, url]) => url.userID === userId)
    .reduce((agg, [shortURL, url]) => ({ ...agg, [shortURL]: url }), {});
}

app.get('/urls', (req, res) => {
  if (!res.locals.user) {
    res.redirect('/login');
  } else {
    res.render('urls_ajax');
  }
});

const apiRouter = new express.Router();
apiRouter.use((req, res, next) => {
  if (!res.locals.user) {
    res.sendStatus(401);
  } else {
    next();
  }
});

apiRouter.get('/urls', (req, res) => {
  res.json(userSpecificURL(res.locals.user.id));
});

apiRouter.post('/urls', (req, res) => {
  const shortURL = generateRandomString();
  const newObject = {
    shortURL,
    longURL: req.body.longURL,
    userID: req.session.user_id };

  urlDatabase[shortURL] = newObject;

  res.status(201).json(newObject);
});

apiRouter.use('/urls/:id', (req, res, next) => {
  const url = urlDatabase[req.params.id];
  if (!url) {
    res.sendStatus(404);
  } else if (url.userID !== res.locals.user.id) {
    res.sendStatus(403);
  } else {
    res.locals.url = url;
    next();
  }
});

apiRouter.route('/urls/:id')
  .get((req, res) => {
    res.json(res.locals.url);
  })
  .put((req, res) => {
    if (!req.body.longURL) {
      res.sendStatus(400);
    }
    res.locals.url.longURL = req.body.longURL;
    res.json(res.locals.url);
  })
  .delete((req, res) => {
    delete urlDatabase[req.params.id];
    res.sendStatus(200);
  });
app.use('/api', apiRouter);

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
