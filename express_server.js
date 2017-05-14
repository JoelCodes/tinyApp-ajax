const express = require("express");
const bodyParser = require("body-parser");
const cookieSession = require("cookie-session");
const bcrypt = require("bcrypt");

const app = express();
const PORT = process.env.PORT || 8080;

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieSession({
  name: 'session',
  keys: [process.env.SESSION_SECRET || "development"],
  maxAge: 24 * 60 * 60 * 1000
}));

// Database for urls
const urlDatabase = {
  "b2xVn2": {
    userID: "userRandomID",
    longURL: "http://www.lighthouselabs.ca"
  },
  "9sm5xK": {
    userID: "user2RandomID",
    longURL: "http://www.google.com"
  },
  "45g7wU": {
    userID: "user2RandomID",
    longURL: "http://www.cbc.ca"
  }
};

// Database for users
const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: bcrypt.hashSync("purple-monkey-dinosaur", 10)
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: bcrypt.hashSync("dishwasher-funk", 10)
  }
};

// Sets user as a global variable
app.use(function(req, res, next) {
  res.locals.user = users[req.session.user_id];
  next();
});

// Checks database to see if short url is valid
function checkShortURLValid(shortURL){
  var flag = false;
  for (let x in urlDatabase){
    if (x === shortURL) {
      flag = true;
    }
  }
  return flag;
}

// Generates random string for shortURL and randomID
function generateRandomString() {
  let shortURL = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for(var i = 0; i < 6; i++) {
    shortURL += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return shortURL;
}

// Checks if user has that specific shortURL
function userSpecificURL(user_id) {
  let result = {};
  for (let shortURL in urlDatabase) {
    let url = urlDatabase[shortURL];
    if(user_id === url.userID) {
      result[shortURL] = url;
    }
  }
  return result;
}

app.get("/urls", (req, res) => {
  let userid = req.session["user_id"];
  let urls = userSpecificURL(userid);
  let templateVars = {
    urls: urls,
    user: users[userid]
  };
  // If no user is logged in, redirect to login page
  if (!userid) {
    res.redirect("/login");
  // If user is logged in, go to index page
  } else {
    res.render("urls_index", templateVars);
  }
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {longURL: req.body.longURL, userID: req.session["user_id"]};
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls/new", (req, res) => {
  let user_id = req.session["user_id"];
  // If user is logged in, go to create new url page
  if (user_id) {
    res.render("urls_new");
    // If no user is logged in, redirect to login page
  } else {
    res.status(401);
    res.redirect("/login");
  }
});

app.get("/urls/:id", (req, res) => {
  let user_id = req.session["user_id"];
  // Checks if user is logged in
  if (user_id) {
    // Checks if the short id is valid or not
    let result = checkShortURLValid(req.params.id);
    if (result) {
      // Makes sure that the url belongs to the user
      if (user_id === urlDatabase[req.params.id].userID) {
        let shortURL = req.params.id;
        let templateVars = {shortURL: req.params.id, longURL: urlDatabase[req.params.id].longURL};
        res.render("urls_shows", templateVars);
      // If the url does not belong to the user
      } else if (user_id !== urlDatabase[req.params.id].userID) {
        res.status(403).send("You are not allowed to access this page. Return to <a href='/urls'>TinyApp.</a>");
        return;
      }
    // If the url does not exist
    } else {
      res.status(404).send("Short URL does not exist.");
      return;
    }
  // If the user is not logged in to the system
  } else {
    res.status(401).send("Please <a href='/login'>login</a>.");
    return;
  }
});

app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id].longURL = req.body.newLongURL;
  res.redirect("/urls");
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  let userid = req.session["user_id"];
  // If user is logged in, redirect to main urls page
  if (userid) {
    res.redirect("/urls");
  // If user is not logged in, go to register page
  } else {
    res.render("register");
  }
});

app.post("/register", (req, res) => {
  // If user does not enter both an email and a password
  if (!req.body.email || !req.body.password) {
    res.status(400);
    res.send("Please enter both an email and a password. Return to <a href='/register'>registration</a> page.");
    return;
  }
  // Checks to see if email is already registered
  for (let user in users) {
    if (users[user].email === req.body.email) {
      res.status(400).send("That email is already registered, please <a href='/login'>login</a> or try registering <a href='/register'>again</a>" );
      return;
    }
  }
  // Creates randomID for new user then redirects to urls page
  let randomID = generateRandomString();
  users[randomID] = {
    id: randomID,
    email: req.body.email,
    password: bcrypt.hashSync(req.body.password, 10)
  };
  req.session["user_id"] = randomID;
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  let userid = req.session["user_id"];
  // If user is logged in, go to urls
  if (userid) {
    res.redirect("/urls");
    // If user is not logged in, go to login
  } else {
    res.render("login");
  }
});

app.post("/login", (req, res) => {
  // If user does not enter both an email and a password
  if (!req.body.email || !req.body.password) {
    res.status(400).send("Please enter both an email and a password. Return to <a href='/login'>login</a> page.");
    return;
  }
  // Checks if user exists in users database
  for (let user in users) {
    if (users[user].email === req.body.email) {
      if (bcrypt.compareSync(req.body.password, users[user].password)) {
        req.session["user_id"] = users[user].id;
        res.redirect("/urls");
        return;
        // If user uses incorrect password
      } else {
        res.status(403).send("Incorrect password. Please try <a href='/login'>again</a>.");
        return;
      }
    }
  }
  // If user uses an email that does not exist
  res.status(403).send("Email does not exist. Please <a href='/register'>register</a>!");
  return;
});

app.post("/logout", (req, res) => {
  req.session = undefined;
  res.redirect("/urls");
});

app.get("/u/:shortURL", (req, res) => {
  let result = checkShortURLValid(req.params.shortURL);
  // If url is valid, redirect to longURL
  if (result) {
    let longURL = urlDatabase[req.params.shortURL].longURL;
    res.redirect(longURL);
  // If url is not valid, send error message
  } else {
    res.status(404).send("Invalid URL.");
    return;
  }
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});