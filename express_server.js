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

app.use(function(req, res, next) {
  res.locals.user = users[req.session.user_id];
  next();
});

function generateRandomString() {
  let shortURL = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for(var i = 0; i < 6; i++) {
    shortURL += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return shortURL;
}

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
  if (!userid) {
    res.redirect("/login");
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
  if (user_id) {
    res.render("urls_new");
  } else {
    res.status(401);
    res.redirect("/login");
  }
});

app.get("/urls/:id", (req, res) => {
  let user_id = req.session["user_id"];
  if (user_id) {
    if (user_id === urlDatabase[req.params.id].userID) {
      let shortURL = req.params.id;
      let templateVars = {shortURL: req.params.id, longURL: urlDatabase[req.params.id].longURL};
      res.render("urls_shows", templateVars);
    } else if (user_id !== urlDatabase[req.params.id].userID) {
      res.status(403).send("You are not allowed to access this page. Return to <a href='/urls'>TinyApp.</a>");
      return;
    }
  } else if (urlDatabase[req.params.id].userID) {
    res.status(401).send("Please <a href='/login'>login</a> to view this page.");
    return;
  }
  // } else {
  //   res.status(404).send("Page does not exist.");
  //   return;
  // }
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
  if (userid) {
    res.redirect("/urls");
  } else {
    res.render("register");
  }
});

app.post("/register", (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.status(400);
    res.send("Please enter both an email and a password. Return to <a href='/register'>registration</a> page.");
    return;
  }
  for (let user in users) {
    if (users[user].email === req.body.email) {
      res.status(400).send("That email is already registered, please <a href='/login'>login</a> or try registering <a href='/register'>again</a>" );
      return;
    }
  }
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
  if (userid) {
    res.redirect("/urls");
  } else {
    res.render("login");
  }
});

app.post("/login", (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.status(400).send("Please enter both an email and a password. Return to <a href='/login'>login</a> page.");
    return;
  }
  for (let user in users) {
    if (users[user].email === req.body.email) {
      if (bcrypt.compareSync(req.body.password, users[user].password)) {
        req.session["user_id"] = users[user].id;
        res.redirect("/urls");
        return;
      } else {
        res.status(403).send("Incorrect password. Please try <a href='/login'>again</a>.");
        return;
      }
    }
  }
  res.status(403).send("Email does not exist. Please <a href='/register'>register</a>!");
});

app.post("/logout", (req, res) => {
  req.session = undefined;
  res.redirect("/urls");
});

app.get("/u/:shortURL", (req, res) => {
  let longURL = urlDatabase[req.params.shortURL].longURL;
  // if (req.params === undefined) {
  //   res.status(404).send("Page does not exist.");
  //   return;
  // }
  res.redirect(longURL);
});

app.listen(PORT, () => {
  console.log(`Example app listening on port ${PORT}!`);
});