const express = require("express");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");

const app = express();
const PORT = process.env.PORT || 8080;

// const urlDatabase = {
//   "b2xVn2": "http://www.lighthouselabs.ca",
//   "9sm5xK": "http://www.google.com"
// };

const urlDatabase = {
  "b2xVn2": {
    user_id: "userRandomID",
    long: "http://www.lighthouselabs.ca"
  },
  "9sm5xK": {
    user_id: "user2RandomID",
    long: "http://www.google.com"
  },
  "45g7wU": {
    user_id: "user2RandomID",
    long: "http://www.cbc.ca"
  }
}

const users = {
  "userRandomID": {
    id: "userRandomID",
    email: "user@example.com",
    password: "purple-monkey-dinosaur"
  },
  "user2RandomID": {
    id: "user2RandomID",
    email: "user2@example.com",
    password: "dishwasher-funk"
  }
};

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

app.use(function(req, res, next) {
  res.locals.user = users[req.cookies.user_id];
  next();
})

function generateRandomString() {
  let shortURL = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for(var i = 0; i < 6; i++) {
    shortURL += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return shortURL;
}

app.get("/urls", (req, res) => {
  let user_id = req.cookies["user_id"];
  let templateVars = {
    urls: urlDatabase,
    user: users[user_id]
  };
  res.render("urls_index", templateVars);
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = {longURL: req.body.longURL, user_id: req.cookies["user_id"]};
  // urlDatabase[shortURL] = req.body.longURL;
  res.redirect(`/urls/${shortURL}`);
});

app.get("/urls/new", (req, res) => {
  let user_id = req.cookies["user_id"];
  if (users[user_id]) {
    res.render("urls_new");
  } else {
    res.redirect("/login");
  }
});

app.get("/urls/:id", (req, res) => {
  let shortURL = req.params.id;
  let author_id = urlDatabase[req.params.id].user_id;
  let author = users[author_id];
  let templateVars = { shortURL: req.params.id, longURL: urlDatabase[req.params.id].long, author: author};
  res.render("urls_shows", templateVars);
});

app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id] = req.body.newLongURL;
  res.redirect("/urls");
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.status(400);
    res.send("Please enter both an email and a password");
    return;
  }
  for (let user in users) {
    if (users[user].email === req.body.email) {
      res.status(400).send("That email is already registered")
      // , please"<a href="/login">login</a>" or try registering "<a href="/register">again</a>" );
      return;
    }
  }
  let randomID = generateRandomString();
  users[randomID] = {
    id: randomID,
    email: req.body.email,
    password: req.body.password
  }
    res.cookie("user_id", randomID);
  res.redirect("/urls");
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {

  if (!req.body.email || !req.body.password) {
    res.status(400).send("Please enter both an email and a password");
    return;
  }
  for (let user in users) {
    if (users[user].email === req.body.email) {
      if (users[user].password === req.body.password) {
        res.cookie("user_id", users[user].id);
        res.redirect("/urls");
        return;
      } else {
        res.status(403).send("Incorrect password");
        return;
      }
    }
  }
  res.status(403).send("Email does not exist");
});

app.post("/logout", (req, res) => {
  res.clearCookie("user_id");
  res.redirect("/urls");
});

app.get("/u/:shortURL", (req, res) => {
  let short = req.params.shortURL;
  let longURL = urlDatabase[short];
  res.redirect(longURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});