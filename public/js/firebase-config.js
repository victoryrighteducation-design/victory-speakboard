// public/js/firebase-config.js
//
// This file is safe to be public — Firebase web config values are not
// secret keys, they just identify which Firebase project to connect to.

const firebaseConfig = {
  apiKey: "AIzaSyCTtEblXhA0GZSIhK5lOdPEWbHO6n-QX5k",
  authDomain: "victory-speakboard.firebaseapp.com",
  databaseURL: "https://victory-speakboard-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "victory-speakboard",
  storageBucket: "victory-speakboard.firebasestorage.app",
  messagingSenderId: "341294769478",
  appId: "1:341294769478:web:2853b05326576d43343147",
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.database();
