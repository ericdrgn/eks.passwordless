const express = require("express");
const fetch = require("node-fetch");
const app = express();
require('dotenv').config();
const port = process.env.PORT || 3000;

const apiurl = process.env.API_URL || "https://v3.passwordless.dev";
const API_SECRET = process.env.API_SECRET || "xbad:secret:f0655689c6cc49bfb2c291bf4e1786b0"; // Replace with your API secret
const API_KEY = process.env.API_KEY || "xbad:public:489856cfc6284162b8b1c80a82ea5fcb"; // this will be injected to index.html

console.log("Using API URL: " + apiurl);
console.log("Using API key: " + API_KEY);
console.log("Using API secret: " + API_SECRET);

app.use(function(req, res, next) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  next();
});

/** 
 * Register - Get token from the passwordless API
 * 
 * The passwordless client side code needs a Token to register a key to a UserID.
 * The token is used by the Passwordless API to verify that this action is allowed for this user.
 * Your server can create this token by calling the Passwordless API with the ApiSecret.
 * This allows you to control the process, perhaps you only want to allow new users to register or only allow already signed in users to add a Key to their own account.
 * 
 * Request body looks like:
 * { UserID: '12345', displayName:'Anders Åberg'}
 * Response body looks like:
 * "abcdefghiojklmnopq..."
 */
app.get("/create-token", async (req, res) => {

  const userId = getRandomInt(999999999);
  const alias = req.query.alias;
  const displayname = "Mr Guest";
  // grab the userid from session, cookie etc
  const payload = {
    userId,
    username: alias || displayname,
    displayname,
    aliases: alias ? [alias] : [] // We can also set aliases for the userid, so that signin can be initiated without knowing the userid
  };

  console.log("creating-token");
  // Send the username to the passwordless api to get a token
  var response = await fetch(apiurl + "/register/token", {
    method: "POST",
    body: JSON.stringify(payload),
    headers: { ApiSecret: API_SECRET, 'Content-Type': 'application/json'}
  });

  console.log("passwordless api response", response.status, response.statusText);
  
  if(response.status == 409) {
    res.status(409);
    res.send("Ooops! Alias is already in use by another user. Please choose a unique alias");
    return;
  }
  var token = await response.text();
  console.log("received token: ", token);
  res.status(response.status);
  res.send(token);
});

/**
 * Sign in - Verify the sign in
 * 
 * The passwordless API handles all the cryptography and WebAuthn details so that you don't need to.
 * In order for you to verify that the sign in was successful and retrieve details such as the username, you need to verify the token that the passwordless client side code returned to you.
 * This is as easy as POST'ing it to together with your ApiSecret.
 * 
 * Request body looks like:
 * { token: "xxxyyyzz..." }
 * Response body looks like:
 * {
   "success":true,
   "username":"anders@user.com",
   "timestamp":"2020-08-21T16:42:48.5061807Z",
   "rpid":"example.com",
   "origin":"https://example.com"}
 * 
 */
app.get("/verify-signin", async (req, res) => {
  const token = { token: req.query.token };

  console.log("Validating token", token);

  const response = await fetch(apiurl + "/signin/verify", {
    method: "POST",
    body: JSON.stringify(token),
    headers: { ApiSecret: API_SECRET, 'Content-Type': 'application/json' }
  });

  var body = await response.json();
  if (body.success) {
    console.log("Succesfully verfied signin for user", body);
  } else {
    console.warn("Sign in failed", body);
  }
  res.send(body);
});

// Response with index.html but replace API_KEY value.
const fs = require('fs');
app.get("", (req, res) => {
  const index ="public/index.html";
  fs.readFile(index, 'utf8', function (err,data) {
    if (err) {
      return console.log(err);
    }
    var result = data.replace(/<YOUR_API_KEY>/g, API_KEY);
    res.send(result);
  });
});

// serve static/html files
app.use(express.static("public"));

app.listen(port, () => {
  console.log(`Example app listening at http://localhost:${port}`);
});

function getRandomInt(max) {
  return Math.floor(Math.random() * max);
}
