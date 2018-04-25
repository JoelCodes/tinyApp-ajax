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

// Database for urls
const urlDatabase = {
  b2xVn2: {
    userID: 'userRandomID',
    longURL: 'http://www.lighthouselabs.ca',
  },
  '9sm5xK': {
    userID: 'user2RandomID',
    longURL: 'http://www.google.com',
  },
  '45g7wU': {
    userID: 'user2RandomID',
    longURL: 'http://www.cbc.ca',
  },
};

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
  const userid = req.session.user_id;
  // If user is logged in, redirect to main urls page
  if (userid) {
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
  const userid = req.session.user_id;
  // If user is logged in, go to urls
  if (userid) {
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

app.get('/u/:shortURL', (req, res) => {
  const result = urlDatabase[req.params.shortURL];
  // If url is valid, redirect to longURL
  if (result) {
    const longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
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
  const userid = req.session.user_id;
  const urls = userSpecificURL(userid);
  const templateVars = {
    urls,
    user: users[userid],
  };
  // If no user is logged in, redirect to login page
  if (!userid) {
    res.redirect('/login');
  // If user is logged in, go to index page
  } else {
    res.render('urls_index', templateVars);
  }
});

app.post('/urls', (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = { longURL: req.body.longURL, userID: req.session.user_id };
  res.redirect(`/urls/${shortURL}`);
});

app.get('/urls/new', (req, res) => {
  const userId = req.session.user_id;
  // If user is logged in, go to create new url page
  if (userId) {
    res.render('urls_new');
  // If no user is logged in, redirect to login page
  } else {
    res.status(401);
    res.redirect('/login');
  }
});

app.get('/urls/:id', (req, res) => {
  const userId = req.session.user_id;
  // Checks if user is logged in
  if (userId) {
    // Checks if the short id is valid or not
    const result = urlDatabase[req.params.id];
    if (result) {
      // Makes sure that the url belongs to the user
      if (userId === urlDatabase[req.params.id].userID) {
        const shortURL = req.params.id;
        const templateVars = { shortURL, longURL: result.longURL };
        res.render('urls_shows', templateVars);
      // If the url does not belong to the user
      } else if (userId !== urlDatabase[req.params.id].userID) {
        res.status(403).send("You are not allowed to access this page. Return to <a href='/urls'>TinyApp.</a>");
      }
    // If the url does not exist
    } else {
      res.status(404).send("Short URL does not exist. Return to <a href='/urls'>TinyApp.</a>");
    }
  // If the user is not logged in to the system
  } else {
    res.status(401).send("Please <a href='/login'>login</a>.");
  }
});

app.post('/urls/:id', (req, res) => {
  urlDatabase[req.params.id].longURL = req.body.newLongURL;
  res.redirect('/urls');
});

app.post('/urls/:id/delete', (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect('/urls');
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});
