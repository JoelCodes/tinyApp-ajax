const express = require("express");
const app = express();
const cookieParser = require('cookie-parser');

const PORT = process.env.PORT || 8080;
const bodyParser = require("body-parser");

const urlDatabase = {
  "b2xVn2": "http://www.lighthouselabs.ca",
  "9sm5xK": "http://www.google.com"
};

app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser());

function generateRandomString() {
  let shortURL = "";
  let possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for(var i = 0; i < 6; i++) {
    shortURL += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return shortURL;
}

app.get("/urls/new", (req, res) => {
  res.render("urls_new");
});

app.post("/urls", (req, res) => {
  const shortURL = generateRandomString();
  urlDatabase[shortURL] = req.body.longURL;
  res.redirect('/urls/' + shortURL);
});

app.get("/urls.json", (req, res) => {
  res.json(urlDatabase);
});

app.get("/urls", (req, res) => {
  let templateVars = {
    urls: urlDatabase,
    username: req.cookies["username"]
  };
  res.render("urls_index", templateVars);
});

app.get("/urls/:id", (req, res) => {
  let shortURL = req.params.id;
  let templateVars = { shortURL: req.params.id, longURL: urlDatabase[req.params.id] };
  res.render("urls_shows", templateVars);
});

app.post("/urls/:id/delete", (req, res) => {
  delete urlDatabase[req.params.id];
  res.redirect("/urls");
});

app.post("/urls/:id", (req, res) => {
  urlDatabase[req.params.id] = req.body.newLongURL;
  res.redirect("/urls");
});

app.post("/login", (req, res) => {
  res.cookie("username", req.body.username);
  res.redirect("/urls");
});

app.post("/logout", (req, res) => {
  res.clearCookie("username");
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